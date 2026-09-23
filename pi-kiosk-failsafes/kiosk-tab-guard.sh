#!/bin/bash
# kiosk-tab-guard.sh -- closes any browser tab that isn't the KDS app.
#
# The gap this fills, found 2026-09-22: on 2026-09-21 at 10:02 CDT a
# restaurant-wide WiFi drop made Chromium's captive-portal check open a
# NEW TAB at connectivitycheck.gstatic.com/generate_204, which the AT&T
# gateway server-redirected to 192.168.1.254/cgi-bin/autodetect.ha and
# then /cgi-bin/home.ha. That tab sat in the foreground of the Expo
# screen for 33 HOURS. Kiosk mode has no address bar, so nobody on site
# could navigate back.
#
# Every existing watchdog reported the kiosk perfectly healthy the whole
# time, because they all ask "does SOME tab match the expected origin?"
# and the real KDS tab was still open, just hidden behind the router page:
#   chromium-watchdog.sh:  grep -q "^$EXPECTED_ORIGIN" <<< "$TAB_URLS"
#   kiosk-health.sh:       ORIGIN_TAB=$(... | head -1)
# Neither looks at which tab is actually VISIBLE. This script does.
#
# Note --disable-background-networking is already set on all three Pis and
# did NOT prevent this: the history transition is TYPED/CHAIN_START, i.e. a
# real top-level navigation in its own tab, not a background fetch. So this
# is deliberately mechanism-independent -- it does not care what opened the
# stray tab or which Chromium flag was supposed to stop it.
#
# Deliberately the least aggressive action available: it only ever CLOSES a
# stray tab via the DevTools endpoint. It never kills Chromium, never
# restarts the wrapper, never reboots. Closing the stray tab was verified
# by hand on Expo 2026-09-22 to be completely non-disruptive -- same
# Chromium PID before and after, KDS back in the foreground instantly, no
# blank screen. If the KDS tab is missing entirely there is nothing safe to
# fall back to, so this script stands down and leaves that case to
# chromium-watchdog.sh, which already handles it by restarting Chromium.
#
# Requires: fix-chromium.sh launching chromium with --remote-debugging-port=9222.
LOG=/home/pi/kiosk-tab-guard.log
ALERT=/home/pi/alert.sh
EXPECTED_ORIGIN="https://dp-kds.vercel.app"
GRACE_SECONDS=45          # same cold-start grace the other watchdogs use
ALERT_COOLDOWN=1800       # at most one push per 30 min, per kiosk-health's rule

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

# Nothing to guard until Chromium is actually up; fix-chromium.sh owns that.
OLDEST_PID=$(pgrep -x chromium -o 2>/dev/null)
[ -z "$OLDEST_PID" ] && exit 0

# Don't judge a browser that's still starting up -- the same mistake that
# made chromium-watchdog log 1000+ bogus restarts in Sept.
ELAPSED=$(ps -o etimes= -p "$OLDEST_PID" 2>/dev/null | tr -d ' ')
[ -n "$ELAPSED" ] && [ "$ELAPSED" -lt "$GRACE_SECONDS" ] && exit 0

TARGETS=$(curl -s --max-time 5 http://localhost:9222/json 2>/dev/null)
# A deadlocked/unresponsive debug port is chromium-watchdog.sh's job, not ours.
[ -z "$TARGETS" ] && exit 0

# Page targets only -- browser_ui targets (omnibox popups etc.) are internal
# chrome:// surfaces that are always present and must never be touched.
read -r -d '' PYSPLIT <<'PY'
import json,sys
try:
    targets = json.load(sys.stdin)
except Exception:
    sys.exit(0)
keep, stray = [], []
for t in targets:
    if t.get('type') != 'page':
        continue
    (keep if t.get('url','').startswith(sys.argv[1]) else stray).append(t)
# Only ever act when a healthy KDS tab is present to fall back to.
if not keep:
    sys.exit(0)
for t in stray:
    print(t['id'], t.get('url','')[:120])
PY

STRAYS=$(printf '%s' "$TARGETS" | python3 -c "$PYSPLIT" "$EXPECTED_ORIGIN" 2>/dev/null)
[ -z "$STRAYS" ] && exit 0

CLOSED=0
while read -r TID TURL; do
  [ -z "$TID" ] && continue
  if curl -s --max-time 5 "http://localhost:9222/json/close/$TID" >/dev/null 2>&1; then
    log "closed stray tab: $TURL"
    CLOSED=$((CLOSED + 1))
  else
    log "FAILED to close stray tab: $TURL"
  fi
done <<< "$STRAYS"

[ "$CLOSED" -eq 0 ] && exit 0

# Worth a push: a stray tab means the screen was showing the wrong thing to
# staff until this ran. Rate-limited so a redirect loop can't spam the phone.
if [ -x "$ALERT" ]; then
  STAMP=/home/pi/.kiosk-tab-guard-last-alert
  LAST=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST" ] && LAST=0
  NOW=$(date +%s)
  if [ $((NOW - LAST)) -ge "$ALERT_COOLDOWN" ]; then
    # alert.sh signature is: alert.sh <title> <message> [priority] [tags]
    "$ALERT" "KDS $(hostname) stray tab closed" \
      "Closed $CLOSED non-KDS tab(s); screen returned to the app." \
      default framed_picture >/dev/null 2>&1
    echo "$NOW" > "$STAMP"
  fi
fi
