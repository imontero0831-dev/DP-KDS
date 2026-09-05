#!/bin/bash
# Restarts/recovers tailscaled if this device can't reach a known-stable
# tailnet peer. The KDS app itself never depends on Tailscale (it talks to
# Firebase/Vercel over the Pi's normal internet connection), so a dead or
# stuck tailscaled never breaks the kitchen screen -- it just silently kills
# remote SSH/monitoring access, sometimes for hours, with nothing on-screen
# ever indicating a problem.
#
# Escalates across consecutive failed checks (run every 3 min via cron):
#   check 1      -> restart tailscaled (covers a plain crash/hang)
#   check 2-9    -> bounce wlan0, then restart tailscaled (covers tailscaled
#                   failing to notice a WiFi interface/IP change after a
#                   blip), plus capture a network diagnostic snapshot
#   check 10     -> full reboot, up to MAX_REBOOTS times per unresolved
#                   incident. Kept high on purpose so a transient blip
#                   during service never reboots a live kiosk.
#
# Real incident 2026-09-02/04 (kds-display-2): this used to reboot forever
# because the fail-counter was only ever cleared on recovery, never after
# actually rebooting -- so once a WiFi problem didn't self-heal, every
# reboot came back up, failed the same check within 3 min, saw the counter
# already >=10, and rebooted again. Ran 1146 times over 29.5 hours straight.
# Fixed by: resetting the counter on every reboot (so each reboot gets its
# own fresh ~30 min window) and capping actual reboots at MAX_REBOOTS -- if
# rebooting hasn't fixed it by then, the cause isn't something a Pi-side
# reboot can solve (AP/router/ISP-side, or a config issue that survives
# reboot), so continuing to power-cycle is pointless and just wears the SD
# card. Past that point it keeps doing the lighter tailscaled/wlan0 recovery
# attempts and alerts hourly instead of rebooting.
LOG=/home/pi/tailscale-watchdog.log
DIAG_LOG=/home/pi/tailscale-watchdog-diag.log
DIAG_MAX_BYTES=524288   # 512KB cap -- the 2026-09-01 outage was partly
                        # caused by unbounded log/dump growth filling the
                        # disk; this file must never be able to repeat that.
PEER=100.123.176.96   # israels-mac-mini, kept online as the reachability check
STATE=/home/pi/.tailscale-watchdog-fails
REBOOT_STATE=/home/pi/.tailscale-watchdog-reboots
GIVEUP_ALERT_STAMP=/home/pi/.tailscale-watchdog-last-giveup-alert
MAX_REBOOTS=3
ALERT=/home/pi/alert.sh

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

alert() {
  [ -x "$ALERT" ] && "$ALERT" "$1" "$2" >/dev/null 2>&1 &
}

# Captures the actual network-level state at the moment of escalation --
# nmcli's real disconnect-reason code and NetworkManager's own journal, not
# just the indirect "still can't reach peer" inference the log above gives.
# Also checks whether wpa_supplicant is running alongside NetworkManager,
# since a card can end up with both trying to manage wlan0 at once (seen on
# at least one provisioned card that carried both a NetworkManager
# network-config and a standalone wpa_supplicant.conf) -- a classic cause
# of exactly this kind of flapping.
capture_diag() {
  {
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') diagnostic snapshot (check #$FAILS) ==="
    echo "--- nmcli device status ---"
    nmcli device status 2>&1
    echo "--- wlan0 detail ---"
    nmcli -t -f GENERAL.STATE,GENERAL.REASON,IP4.ADDRESS device show wlan0 2>&1
    echo "--- interface ownership ---"
    systemctl is-active wpa_supplicant 2>&1 | sed 's/^/wpa_supplicant: /'
    systemctl is-active NetworkManager 2>&1 | sed 's/^/NetworkManager: /'
    echo "--- NetworkManager journal (last 10 min) ---"
    journalctl -u NetworkManager --no-pager --since '10 min ago' 2>&1
    echo
  } >> "$DIAG_LOG"
  if [ "$(wc -c < "$DIAG_LOG" 2>/dev/null || echo 0)" -gt "$DIAG_MAX_BYTES" ]; then
    tail -c "$DIAG_MAX_BYTES" "$DIAG_LOG" > "$DIAG_LOG.tmp" && mv "$DIAG_LOG.tmp" "$DIAG_LOG"
  fi
}

check_ok() { tailscale ping -c 1 --timeout=5s "$PEER" >/dev/null 2>&1; }

if check_ok; then
  rm -f "$STATE" "$REBOOT_STATE"
  exit 0
fi

# One failed check could be a normal blip -- confirm before acting.
sleep 30
if check_ok; then
  rm -f "$STATE" "$REBOOT_STATE"
  exit 0
fi

FAILS=$(cat "$STATE" 2>/dev/null || echo 0)
FAILS=$((FAILS + 1))
echo "$FAILS" > "$STATE"

if [ "$FAILS" -ge 10 ]; then
  REBOOTS=$(cat "$REBOOT_STATE" 2>/dev/null || echo 0)
  capture_diag
  if [ "$REBOOTS" -ge "$MAX_REBOOTS" ]; then
    NOW=$(date +%s)
    LAST=$(cat "$GIVEUP_ALERT_STAMP" 2>/dev/null || echo 0)
    if [ $((NOW - LAST)) -ge 3600 ]; then
      log "still unreachable after $REBOOTS reboots + $FAILS checks -- giving up on auto-reboot, needs on-site attention"
      alert "KDS $(hostname) still down" "Rebooted $REBOOTS times, still can't reach Tailscale. Giving up on auto-reboot -- needs on-site check. See tailscale-watchdog-diag.log."
      echo "$NOW" > "$GIVEUP_ALERT_STAMP"
    fi
    sudo /usr/sbin/ip link set wlan0 down
    sleep 3
    sudo /usr/sbin/ip link set wlan0 up
    sleep 5
    sudo /usr/bin/systemctl restart tailscaled
    echo 0 > "$STATE"
  else
    REBOOTS=$((REBOOTS + 1))
    echo "$REBOOTS" > "$REBOOT_STATE"
    log "still unreachable after $FAILS checks (~$((FAILS * 3)) min), rebooting (attempt $REBOOTS/$MAX_REBOOTS)"
    alert "KDS $(hostname) rebooting" "Tailscale unreachable for ~$((FAILS * 3)) min. Reboot attempt $REBOOTS/$MAX_REBOOTS."
    echo 0 > "$STATE"
    sudo /sbin/reboot
    exit 0
  fi
elif [ "$FAILS" -ge 2 ]; then
  log "still unreachable (check #$FAILS), bouncing wlan0 + restarting tailscaled"
  capture_diag
  sudo /usr/sbin/ip link set wlan0 down
  sleep 3
  sudo /usr/sbin/ip link set wlan0 up
  sleep 5
  sudo /usr/bin/systemctl restart tailscaled
else
  log "peer unreachable (check #$FAILS), restarting tailscaled"
  sudo /usr/bin/systemctl restart tailscaled
fi

sleep 10
if check_ok; then
  log "recovered on check #$FAILS"
  if [ "$(cat "$REBOOT_STATE" 2>/dev/null || echo 0)" -gt 0 ]; then
    alert "KDS $(hostname) recovered" "Tailscale reachable again after $FAILS checks and $(cat "$REBOOT_STATE") reboot(s)."
  fi
  rm -f "$STATE" "$REBOOT_STATE"
fi
