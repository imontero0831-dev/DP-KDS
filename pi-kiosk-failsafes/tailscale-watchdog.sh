#!/bin/bash
# Restarts/recovers tailscaled if this device can't reach a known-stable
# tailnet peer. The KDS app itself never depends on Tailscale (it talks to
# Firebase/Vercel over the Pi's normal internet connection), so a dead or
# stuck tailscaled never breaks the kitchen screen -- it just silently kills
# remote SSH/monitoring access, sometimes for hours, with nothing on-screen
# ever indicating a problem.
#
# Escalates across consecutive failed checks (run every 3 min via cron):
#   check 1  -> restart tailscaled (covers a plain crash/hang)
#   check 2  -> bounce wlan0, then restart tailscaled (covers tailscaled
#               failing to notice a WiFi interface/IP change after a blip)
#   check 10 (~30 min sustained) -> full reboot, last resort only. Kept
#               high on purpose so a transient blip during service never
#               reboots a live kiosk.
LOG=/home/pi/tailscale-watchdog.log
PEER=100.123.176.96   # israels-mac-mini, kept online as the reachability check
STATE=/home/pi/.tailscale-watchdog-fails

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

check_ok() { tailscale ping -c 1 --timeout=5s "$PEER" >/dev/null 2>&1; }

if check_ok; then
  rm -f "$STATE"
  exit 0
fi

# One failed check could be a normal blip -- confirm before acting.
sleep 30
if check_ok; then
  rm -f "$STATE"
  exit 0
fi

FAILS=$(cat "$STATE" 2>/dev/null || echo 0)
FAILS=$((FAILS + 1))
echo "$FAILS" > "$STATE"

if [ "$FAILS" -ge 10 ]; then
  log "still unreachable after $FAILS checks (~$((FAILS * 3)) min), rebooting"
  sudo /sbin/reboot
  exit 0
elif [ "$FAILS" -ge 2 ]; then
  log "still unreachable (check #$FAILS), bouncing wlan0 + restarting tailscaled"
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
  rm -f "$STATE"
fi
