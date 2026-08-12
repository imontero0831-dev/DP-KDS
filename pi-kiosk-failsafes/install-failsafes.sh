#!/bin/bash
# Idempotent installer: WiFi power-save off + hardened tailscaled watchdog +
# HDMI output recovery + hardware watchdog timer. Run as the `pi` user on
# any KDS kiosk Pi. Safe to re-run.
set -e

MARKER=/home/pi/.failsafe-v3-installed

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

# 3. HDMI output recovery watchdog (X11 kiosks only -- no-ops harmlessly
#    if this Pi has no xrandr, e.g. KDS1's labwc/Wayland stack).
if [ -f /home/pi/.failsafe-staging/hdmi-watchdog.sh ]; then
  cp /home/pi/.failsafe-staging/hdmi-watchdog.sh /home/pi/hdmi-watchdog.sh
  chmod +x /home/pi/hdmi-watchdog.sh
fi

# 3b. Power quality trend logger (silent unless throttled/undervoltage
#     flags actually go non-zero).
if [ -f /home/pi/.failsafe-staging/power-watchdog.sh ]; then
  cp /home/pi/.failsafe-staging/power-watchdog.sh /home/pi/power-watchdog.sh
  chmod +x /home/pi/power-watchdog.sh
fi

# 3c. Chromium liveness watchdog (catches a hung-but-not-crashed kiosk via
#     the --remote-debugging-port=9222 flag on fix-chromium.sh -- that flag
#     is applied separately per-Pi since fix-chromium.sh's URL differs per
#     screen, not managed by this installer).
if [ -f /home/pi/.failsafe-staging/chromium-watchdog.sh ]; then
  cp /home/pi/.failsafe-staging/chromium-watchdog.sh /home/pi/chromium-watchdog.sh
  chmod +x /home/pi/chromium-watchdog.sh
fi

# 4. Cron: pi user's own crontab (matches how the original watchdog was
#    installed) -- not root's, so no sudo here. Replaces any older lines
#    for the same scripts so re-running this installer doesn't duplicate.
(
  crontab -l 2>/dev/null | grep -vE 'tailscale-watchdog\.sh|hdmi-watchdog\.sh|power-watchdog\.sh|chromium-watchdog\.sh' || true
  echo "*/3 * * * * /home/pi/tailscale-watchdog.sh"
  if [ -f /home/pi/hdmi-watchdog.sh ]; then
    echo "*/2 * * * * /home/pi/hdmi-watchdog.sh"
  fi
  if [ -f /home/pi/power-watchdog.sh ]; then
    echo "*/5 * * * * /home/pi/power-watchdog.sh"
  fi
  if [ -f /home/pi/chromium-watchdog.sh ]; then
    echo "* * * * * /home/pi/chromium-watchdog.sh"
  fi
) | crontab -

# 5. Hardware watchdog timer: reboots automatically if the kernel itself
#    ever fully hangs (a real freeze, not just a network/app-level issue --
#    the one failure mode none of the userspace watchdogs above can catch,
#    since they all depend on cron/the OS still being alive to run them).
#    The Pi's /dev/watchdog device is present by default but unused until
#    systemd is told to pet it. Requested 30s here, but confirmed via
#    `wdctl` that this board's BCM2835 watchdog chip doesn't support
#    SETTIMEOUT at all -- it's hardwired to a fixed 60s window and silently
#    overrides whatever's requested (systemd logs "hardware timeout of
#    1min" regardless). Setting 60s explicitly so this file states what
#    actually happens instead of a number the hardware ignores.
if [ -e /dev/watchdog ]; then
  sudo sed -i 's/^#\?RuntimeWatchdogSec=.*/RuntimeWatchdogSec=60s/' /etc/systemd/system.conf
  sudo systemctl daemon-reexec
fi

# 6. Marker for the sibling-deploy relay to know this Pi is done.
date '+%Y-%m-%d %H:%M:%S' > "$MARKER"

echo "install-failsafes.sh: done on $(hostname)"
