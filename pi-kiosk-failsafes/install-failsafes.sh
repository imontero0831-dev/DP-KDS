#!/bin/bash
# Idempotent installer: WiFi power-save off + hardened tailscaled watchdog.
# Run as the `pi` user on any KDS kiosk Pi. Safe to re-run.
set -e

MARKER=/home/pi/.failsafe-v2-installed

# 1. Disable WiFi power-save (survives reboots; takes effect on next
#    connection activation, so it won't disrupt an already-active session).
sudo mkdir -p /etc/NetworkManager/conf.d
sudo tee /etc/NetworkManager/conf.d/wifi-powersave-off.conf > /dev/null << 'EOF'
[connection]
wifi.powersave = 2
EOF

# 2. Hardened watchdog script.
cp /home/pi/.failsafe-staging/tailscale-watchdog.sh /home/pi/tailscale-watchdog.sh
chmod +x /home/pi/tailscale-watchdog.sh

# 3. Cron: every 3 min, replacing any older watchdog cron line. This is
#    the pi user's own crontab (matches how the original watchdog was
#    installed) -- not root's, so no sudo here.
(crontab -l 2>/dev/null | grep -v 'tailscale-watchdog.sh' || true; echo "*/3 * * * * /home/pi/tailscale-watchdog.sh") | crontab -

# 4. Marker for the sibling-deploy relay to know this Pi is done.
date '+%Y-%m-%d %H:%M:%S' > "$MARKER"

echo "install-failsafes.sh: done on $(hostname)"
