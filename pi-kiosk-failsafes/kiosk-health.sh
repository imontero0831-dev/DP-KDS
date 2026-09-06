#!/bin/bash
# kiosk-health.sh -- the "health brain". One 1-minute cron tick that runs
# every cheap probe, folds the results into a single severity, and drives a
# three-tier response. It is the layer the other watchdogs never had: they
# each react to one failure in isolation and only to a process EXITING.
# The 2026-09-05 Drinks outage was invisible to all of them because
# Chromium never exited -- fix-chromium.sh respawned it ~30x/min on a
# permanent permission fault (/home/pi/.config owned root:root), so from
# the outside "chromium" was always running, just never alive for more
# than ~2s. Nothing counted the restarts; nothing alerted; the screen was
# blank for hours.
#
# Tiers (least to most aggressive):
#   NOTICE   -> log + low-priority ntfy. "Something's off, screen probably
#               still up, look when you can." Never touches the machine.
#   DEGRADED -> one TARGETED self-heal of the failing component + high
#               ntfy. Re-checked on the next ticks; if it doesn't clear,
#               it escalates.
#   CRITICAL -> hard reboot, but ONLY within the shared reboot budget
#               (reboot-budget.sh: max 3 / 6h across all watchdogs). Budget
#               spent -> stop rebooting, fire a max-priority "needs on-site"
#               ntfy instead of looping the box to death (the mistake
#               tailscale-watchdog made in Sept).
#
# Alert noise control: alerts fire on STATE TRANSITIONS only, then re-fire
# at most every 30 min while still bad. The old chromium-watchdog logged
# 1000+ identical lines during the Sept reboot loop -- that must never
# reach the phone as 1000 pushes.
#
# Requires: fix-chromium.sh launching chromium with --remote-debugging-port=9222.

STATE_DIR=/home/pi/.kiosk-health
LOG=/home/pi/kiosk-health.log
ALERT=/home/pi/alert.sh
EXPECTED_ORIGIN="https://dp-kds.vercel.app"

BOOT_GRACE=90            # ignore everything for the first 90s after boot
CHROMIUM_HEALTHY_ETIMES=45   # an instance younger than this isn't "up" yet
CRASHLOOP_WINDOW=600         # 10 min
CRASHLOOP_NOTICE=4           # restarts in window while otherwise healthy
CRASHLOOP_DEGRADED=10        # restarts in window, no healthy instance
FASTCRASH_ETIMES=10          # "dies before it can finish starting"
FASTCRASH_MIN=3              # this many fast crashes = permanent fault
NO_HEALTHY_CRITICAL=600      # 10 min with no healthy chromium at all
HEAL_SETTLE=300             # give a heal 5 min to take before escalating
WIFI_DOWN_DEGRADED=300      # wlan0 down this long -> heal
WIFI_DOWN_CRITICAL=600      # ...still down this long -> reboot
DISK_DEGRADED=90
DISK_CRITICAL=96
LOADAVG_MULT=4              # load1 > cores * this = hot
LOAD_HOT_CRITICAL=600
TEMP_NOTICE=80             # deg C
REALERT_SECONDS=1800       # re-push an unchanged bad state every 30 min

mkdir -p "$STATE_DIR"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }
# rotate our own log so a chatty incident can't fill the disk
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 524288 ]; then
  tail -c 262144 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

sget() { cat "$STATE_DIR/$1" 2>/dev/null; }
sset() { echo "$2" > "$STATE_DIR/$1"; }
sclear() { rm -f "$STATE_DIR/$1"; }
now=$(date +%s)

# ---- gates --------------------------------------------------------------
# 1. Don't judge a box that's still provisioning. Stage 2 writes this marker
#    only after apt + Tailscale succeed and just before its final reboot, so
#    its absence means "kiosk software may not even be installed yet" -- a
#    reboot here would just interrupt apt. On an already-running Pi that
#    predates v8 the marker appears the moment install-failsafes.sh finishes,
#    so this brain stays dormant until the box is fully on the v8 bundle.
[ -f /home/pi/.failsafe-v8-installed ] || exit 0

# 2. Boot grace -- cold start (X, openbox, chromium, first page load) needs
#    more than a minute; don't start counting against it immediately.
UPTIME=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 9999)
if [ "$UPTIME" -lt "$BOOT_GRACE" ]; then
  exit 0
fi

# heartbeat -- proves this brain itself is still ticking
sset heartbeat "$now"

# ---- shared reboot budget ------------------------------------------------
if [ -r /home/pi/reboot-budget.sh ]; then
  . /home/pi/reboot-budget.sh
else
  # fallback if the shared helper isn't deployed yet: same 3-per-6h rule,
  # self-contained.
  RB_LEDGER=/home/pi/.reboot-ledger
  reboot_count_recent() {
    local c=0 t ct; ct=$((now - 21600)); [ -f "$RB_LEDGER" ] || { echo 0; return; }
    while read -r t _; do case "$t" in ''|*[!0-9]*) continue;; esac
      [ "$t" -ge "$ct" ] && c=$((c + 1)); done < "$RB_LEDGER"; echo "$c"
  }
  reboot_allowed() { [ "$(reboot_count_recent)" -lt 3 ]; }
  record_reboot() { echo "$now $(date '+%F %T') by=kiosk-health reason=${1:-?}" >> "$RB_LEDGER"; }
fi

# Overall severity accumulator: 0 OK, 1 NOTICE, 2 DEGRADED, 3 CRITICAL.
SEV=0
REASONS=""
bump() {   # bump <level> <reason>
  [ "$1" -gt "$SEV" ] && SEV="$1"
  REASONS="${REASONS:+$REASONS; }$2"
}

# =========================================================================
# 1. CHROMIUM CRASH-LOOP / LIVENESS
# =========================================================================
OLDEST_PID=$(pgrep -x chromium -o 2>/dev/null)
LAST_PID=$(sget chromium-pid)
STARTS_FILE="$STATE_DIR/chromium-starts"

# Detect a (re)start: the oldest chromium PID changed, or went missing and
# came back. Each transition to a new non-empty PID is one start.
if [ -n "$OLDEST_PID" ] && [ "$OLDEST_PID" != "$LAST_PID" ]; then
  echo "$now" >> "$STARTS_FILE"
  sset chromium-pid "$OLDEST_PID"
elif [ -z "$OLDEST_PID" ]; then
  sclear chromium-pid
fi

# Prune the starts ledger to the crash-loop window.
if [ -f "$STARTS_FILE" ]; then
  cutoff=$((now - CRASHLOOP_WINDOW))
  awk -v c="$cutoff" '$1 >= c' "$STARTS_FILE" > "$STARTS_FILE.tmp" 2>/dev/null \
    && mv "$STARTS_FILE.tmp" "$STARTS_FILE"
fi
RESTARTS=0
[ -f "$STARTS_FILE" ] && RESTARTS=$(wc -l < "$STARTS_FILE" | tr -d ' ')
[ -z "$RESTARTS" ] && RESTARTS=0

# Age of the current instance.
ETIMES=0
if [ -n "$OLDEST_PID" ]; then
  ETIMES=$(ps -o etimes= -p "$OLDEST_PID" 2>/dev/null | tr -d ' ')
  [ -z "$ETIMES" ] && ETIMES=0
fi

# Is chromium actually HEALTHY right now? (up past grace + debug port
# answers + a tab at our origin + that tab's title isn't a Chrome error
# page). Positive DOM canary is a later addition -- this is title-based and
# needs no websocket client on the Pi.
# CHROMIUM_ALIVE: process up + debug port answers + a tab at our origin
# exists. This is the "probably fine" bar. HEALTHY is stricter (adds the
# error-title check + the etimes>=45 maturity gate). The distinction
# matters for one specific safety property below: we NEVER reboot on
# "not HEALTHY" alone -- only on "not ALIVE" -- so a flaky title parse or
# an app that renames its own tab can't cause this brain to power-cycle a
# working kitchen screen mid-service.
CHROMIUM_ALIVE=0
HEALTHY=0
if [ -n "$OLDEST_PID" ] && curl -s --max-time 5 http://localhost:9222/json/version >/dev/null 2>&1; then
  TABS=$(curl -s --max-time 5 http://localhost:9222/json 2>/dev/null)
  ORIGIN_TAB=$(printf '%s' "$TABS" | tr ',' '\n' | grep -o "\"url\": *\"${EXPECTED_ORIGIN}[^\"]*\"" | head -1)
  TITLE_LINE=$(printf '%s' "$TABS" | tr '}' '\n' | grep -F "$EXPECTED_ORIGIN" | grep -o '"title": *"[^"]*"' | head -1)
  if [ -n "$ORIGIN_TAB" ]; then
    CHROMIUM_ALIVE=1
    if [ "$ETIMES" -ge "$CHROMIUM_HEALTHY_ETIMES" ]; then
      case "$TITLE_LINE" in
        *"is not available"*|*"can"?"t be reached"*|*"No internet"*|*"not available"*|*"took too long"*|*"HTTP ERROR"*|*"502"*|*"503"*|*"504"*)
          HEALTHY=0 ;;
        *)
          HEALTHY=1 ;;
      esac
    fi
  fi
fi

if [ "$CHROMIUM_ALIVE" -eq 1 ]; then
  sset chromium-last-alive "$now"
fi
if [ "$HEALTHY" -eq 1 ]; then
  sset chromium-last-healthy "$now"
  : > "$STARTS_FILE"                 # recovered -> forget the churn
  sclear chromium-heal-at
  RESTARTS=0
fi
LAST_HEALTHY=$(sget chromium-last-healthy)
[ -z "$LAST_HEALTHY" ] && LAST_HEALTHY=0
HEALTHY_AGE=$((now - LAST_HEALTHY))
[ "$LAST_HEALTHY" -eq 0 ] && HEALTHY_AGE=999999

LAST_ALIVE=$(sget chromium-last-alive)
[ -z "$LAST_ALIVE" ] && LAST_ALIVE=0
ALIVE_AGE=$((now - LAST_ALIVE))
# First run with no history: seed it to now so a genuinely-fine box that
# this brain has simply never observed yet doesn't count as "dead for
# ages". A truly broken chromium will fail the ALIVE check on this same
# tick and the age starts climbing for real from here.
if [ "$LAST_ALIVE" -eq 0 ]; then
  [ "$CHROMIUM_ALIVE" -eq 1 ] || sset chromium-last-alive "$now"
  ALIVE_AGE=0
fi

# --- fast-crash fingerprint: repeatedly dies before it can finish starting.
# This is the Drinks-bug shape. It never self-heals, so don't wait for the
# count to reach CRASHLOOP_DEGRADED -- act now.
FASTCRASH=0
if [ "$RESTARTS" -ge "$FASTCRASH_MIN" ] && [ "$ALIVE_AGE" -gt 120 ]; then
  if [ -z "$OLDEST_PID" ] || [ "$ETIMES" -lt "$FASTCRASH_ETIMES" ]; then
    FASTCRASH=1
  fi
fi

CHROMIUM_TIER=0
CHROMIUM_MSG=""
if [ "$ALIVE_AGE" -ge "$NO_HEALTHY_CRITICAL" ]; then
  # not even ALIVE (process/debug-port/origin-tab) for 10 min -> this is
  # the Drinks-outage state. Reboot (within budget).
  CHROMIUM_TIER=3
  CHROMIUM_MSG="chromium not alive for ${ALIVE_AGE}s (>${NO_HEALTHY_CRITICAL}), ${RESTARTS} restarts/10min"
elif [ "$FASTCRASH" -eq 1 ]; then
  CHROMIUM_TIER=2
  CHROMIUM_MSG="chromium fast-crash loop: ${RESTARTS} restarts/10min, current age ${ETIMES}s, never healthy -- config fault, won't self-recover"
elif [ "$RESTARTS" -ge "$CRASHLOOP_DEGRADED" ] && [ "$HEALTHY_AGE" -gt 120 ]; then
  CHROMIUM_TIER=2
  CHROMIUM_MSG="chromium crash loop: ${RESTARTS} restarts/10min, no healthy instance"
elif [ "$CHROMIUM_ALIVE" -eq 1 ] && [ "$HEALTHY_AGE" -ge "$NO_HEALTHY_CRITICAL" ]; then
  # alive but stuck (error page / never matured) for 10 min -- heal (which
  # reloads it), do NOT reboot: the box is otherwise fine.
  CHROMIUM_TIER=2
  CHROMIUM_MSG="chromium alive but not healthy for ${HEALTHY_AGE}s (stuck page?)"
elif [ "$RESTARTS" -ge "$CRASHLOOP_NOTICE" ]; then
  CHROMIUM_TIER=1
  CHROMIUM_MSG="chromium restarted ${RESTARTS}x/10min (currently $( [ "$HEALTHY" -eq 1 ] && echo healthy || echo 'not yet healthy'))"
elif [ "$CHROMIUM_ALIVE" -eq 1 ] && [ "$HEALTHY_AGE" -ge 300 ]; then
  CHROMIUM_TIER=1
  CHROMIUM_MSG="chromium alive but not confirmed-healthy for ${HEALTHY_AGE}s"
fi

# Act on the chromium tier. A DEGRADED chromium gets ONE targeted heal per
# HEAL_SETTLE window; it stays at bump 2 between heals. It escalates to
# CRITICAL on its own via the HEALTHY_AGE >= NO_HEALTHY_CRITICAL rule above
# (CHROMIUM_TIER=3) -- i.e. if 10 minutes pass with no healthy instance
# despite the heals, the RESPOND section reboots (within budget). No
# separate "heal didn't take" branch needed.
if [ "$CHROMIUM_TIER" -eq 3 ]; then
  bump 3 "$CHROMIUM_MSG"
elif [ "$CHROMIUM_TIER" -eq 2 ]; then
  HEAL_AT=$(sget chromium-heal-at)
  [ -z "$HEAL_AT" ] && HEAL_AT=0
  if [ $((now - HEAL_AT)) -ge "$HEAL_SETTLE" ]; then
    log "HEAL chromium: $CHROMIUM_MSG"
    pkill -x chromium 2>/dev/null
    sleep 2
    pkill -9 -x chromium 2>/dev/null
    rm -rf /home/pi/.config/chromium/Singleton* \
           /home/pi/.config/chromium/"Crash Reports"/* \
           /home/pi/.config/chromium/BrowserMetrics/* \
           /home/pi/.cache/chromium/* 2>/dev/null
    # Re-assert ownership -- the exact fault behind the Sept Drinks loop.
    # If it's back (OS update, bad chown, re-provision), fix it here so
    # fix-chromium.sh's next relaunch actually sticks.
    chown -R pi:pi /home/pi/.config /home/pi/.cache 2>/dev/null
    sset chromium-heal-at "$now"
    bump 2 "chromium heal fired ($CHROMIUM_MSG)"
  else
    bump 2 "chromium degraded, heal settling ($CHROMIUM_MSG)"
  fi
elif [ "$CHROMIUM_TIER" -eq 1 ]; then
  bump 1 "$CHROMIUM_MSG"
fi

# =========================================================================
# 2. WIFI  (health brain owns the ESCALATION; wifi-auth-watchdog still does
#    the every-2-min nmcli-up. Here we add rfkill/radio-bounce + reboot.)
# =========================================================================
WIFI_OK=0
if grep -q '^ *wlan0:' /proc/net/wireless 2>/dev/null; then
  WSTATE=$(nmcli -t -f DEVICE,STATE device status 2>/dev/null | grep '^wlan0:' | cut -d: -f2)
  [ "$WSTATE" = "connected" ] && WIFI_OK=1
fi
if [ "$WIFI_OK" -eq 1 ]; then
  sclear wifi-down-since
  sclear wifi-heal-at
else
  DOWN_SINCE=$(sget wifi-down-since)
  [ -z "$DOWN_SINCE" ] && { DOWN_SINCE="$now"; sset wifi-down-since "$now"; }
  DOWN_FOR=$((now - DOWN_SINCE))
  if [ "$DOWN_FOR" -lt 60 ]; then
    :   # single unlucky sample -- wait for it to persist one more tick
  elif [ "$DOWN_FOR" -ge "$WIFI_DOWN_CRITICAL" ]; then
    bump 3 "wlan0 down ${DOWN_FOR}s (>${WIFI_DOWN_CRITICAL})"
  elif [ "$DOWN_FOR" -ge "$WIFI_DOWN_DEGRADED" ]; then
    WHEAL=$(sget wifi-heal-at); [ -z "$WHEAL" ] && WHEAL=0
    if [ $((now - WHEAL)) -ge "$HEAL_SETTLE" ]; then
      log "HEAL wifi: wlan0 down ${DOWN_FOR}s -- rfkill unblock + radio bounce"
      sudo /usr/sbin/rfkill unblock wifi 2>/dev/null
      sudo nmcli radio wifi off 2>/dev/null; sleep 2; sudo nmcli radio wifi on 2>/dev/null
      WIFI_CONN=$(nmcli -t -f NAME,TYPE connection show 2>/dev/null | grep ':802-11-wireless$' | head -1 | cut -d: -f1)
      [ -n "$WIFI_CONN" ] && sudo nmcli connection up "$WIFI_CONN" >/dev/null 2>&1 &
      sset wifi-heal-at "$now"
    fi
    bump 2 "wlan0 down ${DOWN_FOR}s"
  else
    bump 1 "wlan0 down ${DOWN_FOR}s"
  fi
fi

# =========================================================================
# 3. DISK
# =========================================================================
USE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
[ -z "$USE" ] && USE=0
if [ "$USE" -ge "$DISK_CRITICAL" ]; then
  bump 3 "disk ${USE}%"
elif [ "$USE" -ge "$DISK_DEGRADED" ]; then
  log "HEAL disk: ${USE}% -- vacuum journal + clear chromium metrics"
  sudo journalctl --vacuum-size=50M >/dev/null 2>&1
  rm -rf /home/pi/.config/chromium/BrowserMetrics/* \
         /home/pi/.config/chromium/"Crash Reports"/* 2>/dev/null
  bump 2 "disk ${USE}%"
fi

# =========================================================================
# 4. LOAD  (sustained only)
# =========================================================================
CORES=$(nproc 2>/dev/null || echo 4)
LOAD1=$(awk '{print $1}' /proc/loadavg 2>/dev/null | cut -d. -f1)
[ -z "$LOAD1" ] && LOAD1=0
HOT=$((CORES * LOADAVG_MULT))
if [ "$LOAD1" -ge "$HOT" ]; then
  LHS=$(sget load-hot-since); [ -z "$LHS" ] && { LHS="$now"; sset load-hot-since "$now"; }
  if [ $((now - LHS)) -ge "$LOAD_HOT_CRITICAL" ]; then
    bump 3 "load ${LOAD1} (>${HOT}) sustained $((now - LHS))s"
  else
    bump 1 "load ${LOAD1} (>${HOT})"
  fi
else
  sclear load-hot-since
fi

# =========================================================================
# 5. TEMP  (notice only -- power-watchdog logs throttle flags separately)
# =========================================================================
if command -v vcgencmd >/dev/null 2>&1; then
  T=$(vcgencmd measure_temp 2>/dev/null | grep -o '[0-9]*\.[0-9]*' | cut -d. -f1)
  if [ -n "$T" ] && [ "$T" -ge "$TEMP_NOTICE" ]; then
    bump 1 "SoC temp ${T}C"
  fi
fi

# =========================================================================
# RESPOND
# =========================================================================
case "$SEV" in
  0) STATE_NAME=OK ;;
  1) STATE_NAME=NOTICE ;;
  2) STATE_NAME=DEGRADED ;;
  3) STATE_NAME=CRITICAL ;;
esac

PREV=$(sget state)
PREV_SEV=$(sget state-sev); [ -z "$PREV_SEV" ] && PREV_SEV=0
LAST_ALERT=$(sget last-alert); [ -z "$LAST_ALERT" ] && LAST_ALERT=0

send_alert() {   # send_alert <priority> <tags> <title> <msg>
  [ -x "$ALERT" ] || return 0
  "$ALERT" "$3" "$4" "$1" "$2" >/dev/null 2>&1 &
  sset last-alert "$now"
}

HOST=$(hostname)

if [ "$SEV" -eq 3 ]; then
  # CRITICAL: reboot within budget, else escalate to a human.
  if reboot_allowed; then
    log "CRITICAL: $REASONS -- rebooting (budget $(reboot_count_recent)/3 used)"
    send_alert urgent rotating_light "KDS $HOST rebooting" "CRITICAL: $REASONS. Auto-reboot ($(reboot_count_recent)/3 in 6h)."
    record_reboot "$REASONS"
    sset state CRITICAL; sset state-sev 3
    sync
    sleep 2
    sudo /sbin/reboot
    exit 0
  else
    # budget spent -- do NOT reboot again; nag hourly
    GIVEUP=$(sget giveup-alert); [ -z "$GIVEUP" ] && GIVEUP=0
    if [ $((now - GIVEUP)) -ge 3600 ]; then
      log "CRITICAL: $REASONS -- reboot budget SPENT, needs on-site"
      send_alert urgent rotating_light "KDS $HOST needs hands" "CRITICAL and reboot budget spent (3 reboots/6h). Not rebooting again. $REASONS"
      sset giveup-alert "$now"
    fi
    sset state CRITICAL; sset state-sev 3
    exit 0
  fi
fi

# NOTICE / DEGRADED / OK
if [ "$SEV" -ne "$PREV_SEV" ]; then
  # transition
  if [ "$SEV" -eq 0 ]; then
    log "recovered: back to OK (was $PREV)"
    [ "$PREV_SEV" -ge 2 ] && send_alert default white_check_mark "KDS $HOST recovered" "Back to normal (was $PREV)."
    sclear giveup-alert
  elif [ "$SEV" -eq 1 ]; then
    log "NOTICE: $REASONS"
    send_alert low eye "KDS $HOST -- heads up" "NOTICE: $REASONS. Screen probably still up; SSH in when you can."
  elif [ "$SEV" -eq 2 ]; then
    log "DEGRADED: $REASONS"
    send_alert high warning "KDS $HOST degraded" "DEGRADED: $REASONS. Auto-heal running; watching for recovery."
  fi
elif [ "$SEV" -ne 0 ] && [ $((now - LAST_ALERT)) -ge "$REALERT_SECONDS" ]; then
  # unchanged bad state -- re-nudge, but only every 30 min
  case "$SEV" in
    1) send_alert low eye "KDS $HOST still off" "Still NOTICE: $REASONS" ;;
    2) send_alert high warning "KDS $HOST still degraded" "Still DEGRADED: $REASONS" ;;
  esac
  log "$STATE_NAME (unchanged, re-alert): $REASONS"
fi

sset state "$STATE_NAME"
sset state-sev "$SEV"
exit 0
