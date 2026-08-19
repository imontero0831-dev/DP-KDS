#!/bin/bash
# Prevents a kiosk Pi from ever getting stuck waiting on a human to click
# through an interactive "Wi-Fi Network: Authentication Required" dialog.
# Root cause seen on KDS1 on 2026-08-18: its WiFi connection was created
# via the desktop GUI during initial setup, which can leave the PSK
# agent-owned (needing nm-applet/a keyring to supply it) instead of stored
# directly in the system connection. When that agent isn't available at
# the moment NetworkManager needs to reconnect, it pops a blocking GUI
# dialog instead of retrying silently -- and a kiosk with no keyboard/mouse
# attached has no way to dismiss it. The Pi is fully on the network at the
# OS level otherwise; SSH, Tailscale, everything else looks like a total
# outage from the outside even though the machine is sitting right there.
#
# Two-part fix: (1) install-failsafes.sh forces psk-flags=0 on the wifi
# connection so the secret lives in the connection file itself, matching
# KDS2/KDS3's already-safe netplan-managed connections -- this should
# prevent the dialog from ever being needed again. (2) this watchdog is
# defense in depth in case that's ever insufficient (profile gets
# recreated, OS update changes defaults, etc.): if WiFi is down, force a
# silent `nmcli connection up`, which uses the stored secret directly and
# never blocks on an agent -- and kill any stray auth-dialog process so it
# can't sit there waiting for someone who isn't there.
LOG=/home/pi/wifi-auth-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

STATE=$(nmcli -t -f DEVICE,STATE,CONNECTION device status 2>/dev/null | grep '^wlan0:')
CONN_STATE=$(echo "$STATE" | cut -d: -f2)

[ -z "$STATE" ] && { log "no wlan0 device found, skipping"; exit 0; }
[ "$CONN_STATE" = "connected" ] && exit 0

log "wlan0 state=$CONN_STATE, not connected -- intervening"

# Kill any stray interactive auth dialog so it can never block forever
# waiting on a human who isn't there. Safe as a cron job (not an
# interactive SSH session), so no risk of matching/killing our own shell.
# We were never able to confirm exactly which process actually renders the
# "Wi-Fi Network: Authentication Required" popup at the restaurant (the
# outage that prompted this made it impossible to inspect live, and it
# never reproduced once we had remote access again) -- known auth-agent
# binaries are killed by exact name below, plus a name-pattern catch-all
# for anything that looks like a polkit/auth agent we haven't seen yet, so
# this doesn't depend on having guessed correctly.
for proc in nm-applet nm-connection-editor polkit-gnome-authentication-agent-1 polkit-mate-authentication-agent-1 lxpolkit xfce-polkit; do
  if pgrep -x "$proc" >/dev/null 2>&1; then
    log "killing stray $proc"
    pkill -x "$proc"
  fi
done
for pid in $(pgrep -f 'polkit|authentication-agent' 2>/dev/null); do
  cmd=$(ps -o comm= -p "$pid" 2>/dev/null)
  [ -z "$cmd" ] && continue
  log "killing stray auth-agent-like process: $cmd (pid $pid)"
  kill "$pid" 2>/dev/null
done

# Find the WiFi profile marked to auto-connect and force it up via CLI --
# this uses whatever secret is already stored (system-file or agent-owned)
# without ever blocking on a GUI prompt the way NetworkManager's own
# automatic retry can.
WIFI_CONN=$(nmcli -t -f NAME,TYPE connection show 2>/dev/null | grep ':802-11-wireless$' | head -1 | cut -d: -f1)
if [ -n "$WIFI_CONN" ]; then
  log "forcing 'nmcli connection up $WIFI_CONN'"
  # Must be `sudo nmcli`, not plain `nmcli`: cron jobs have no active
  # logind/polkit session, and NetworkManager's network-control action
  # requires either root or an active session to authorize it. Confirmed
  # 2026-08-19 -- this watchdog had been silently failing every single
  # invocation since deployment with "Not authorized to control
  # networking", on all three kiosks, and had therefore never once
  # actually recovered a dropped connection.
  sudo nmcli connection up "$WIFI_CONN" >>"$LOG" 2>&1
else
  log "no wifi connection profile found"
fi
