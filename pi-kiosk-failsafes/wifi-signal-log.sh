#!/bin/bash
# Logs WiFi signal quality/level once a minute so a marginal or degrading
# connection shows up as a trend instead of only being visible after the
# fact via tailscale-watchdog.log's failure entries (see the 2026-08-15/16
# recurring "peer unreachable" investigation -- this fills the gap: there
# was no way to tell whether those blips were signal-strength related).
LOG=/home/pi/wifi-signal.log
IFACE=wlan0

WIRELESS_LINE=$(grep "^ *$IFACE:" /proc/net/wireless 2>/dev/null)
if [ -z "$WIRELESS_LINE" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') no data for $IFACE" >> "$LOG"
  exit 0
fi

# /proc/net/wireless columns: iface status link. level. noise. nwid crypt frag retry misc missed
QUALITY=$(echo "$WIRELESS_LINE" | awk '{print $3}' | tr -d '.')
LEVEL=$(echo "$WIRELESS_LINE" | awk '{print $4}' | tr -d '.')
RETRY=$(echo "$WIRELESS_LINE" | awk '{print $9}')

ACTIVE_AP=$(nmcli -t -f active,freq,rate device wifi list --rescan no 2>/dev/null | grep '^yes:')
FREQ=$(echo "$ACTIVE_AP" | cut -d: -f2)
RATE=$(echo "$ACTIVE_AP" | cut -d: -f3)

echo "$(date '+%Y-%m-%d %H:%M:%S') quality=${QUALITY:-?}/70 level=${LEVEL:-?}dBm retries=${RETRY:-0} freq=${FREQ:-?} rate=${RATE:-?}" >> "$LOG"

# Keep the log bounded -- 1/min is ~1440 lines/day, trim well before that's a problem.
LINES=$(wc -l < "$LOG" 2>/dev/null || echo 0)
if [ "$LINES" -gt 15000 ]; then
  tail -n 10000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
