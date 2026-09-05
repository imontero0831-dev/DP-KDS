#!/bin/bash
# Idempotent installer: WiFi power-save off + hardened tailscaled watchdog +
# HDMI output recovery + hardware watchdog timer. Run as the `pi` user on
# any KDS kiosk Pi. Safe to re-run.
set -e

MARKER=/home/pi/.failsafe-v7-installed

# 1. Disable WiFi power-save (survives reboots; takes effect on next
#    connection activation, so it won't disrupt an already-active session).
sudo mkdir -p /etc/NetworkManager/conf.d
sudo tee /etc/NetworkManager/conf.d/wifi-powersave-off.conf > /dev/null << 'EOF'
[connection]
wifi.powersave = 2
EOF

# 1b. Force the 2.4GHz band. The router band-steers the same SSID onto both
#     2.4 and 5GHz; wifi-signal-log.sh showed these kiosks parked on 5GHz at
#     notably weaker signal (-46 to -49dBm, 60+ retries) than the 2.4GHz AP
#     with the same SSID was offering at the same moment. Same global-default
#     conf.d mechanism as wifi-powersave-off.conf above -- survives reboots
#     on both native NetworkManager (KDS1) and netplan-managed (KDS2/3)
#     connections, unlike a direct `nmcli connection modify`, which netplan
#     would silently wipe by regenerating the profile from /etc/netplan at
#     the next boot. Takes effect on next connection activation, same as
#     the power-save setting above -- not forced here so this installer
#     never has to bounce the very SSH session it's running over.
sudo tee /etc/NetworkManager/conf.d/wifi-band-24ghz.conf > /dev/null << 'EOF'
[connection-wifi-band-24ghz]
match-device=type:wifi
802-11-wireless.band=bg
EOF

# 1c. Force the stored WiFi secret to live directly in the connection file
#     (psk-flags=0) instead of being agent-owned. Root cause seen on KDS1
#     2026-08-18: a connection created via the desktop GUI can leave the
#     PSK agent-owned, needing nm-applet/a keyring to supply it on
#     reconnect -- when that agent isn't there, NetworkManager pops a
#     blocking interactive auth dialog instead of retrying silently, and a
#     kiosk with no keyboard/mouse has no way to dismiss it. Applies to
#     every wifi connection profile present, active or not; harmless no-op
#     if already 0 (e.g. KDS2/3's netplan-managed connections).
for c in $(nmcli -t -f NAME,TYPE connection show 2>/dev/null | grep ':802-11-wireless$' | cut -d: -f1); do
  sudo nmcli connection modify "$c" wifi-sec.psk-flags 0 2>/dev/null || true
done

# 1d. Force LightDM autologin. Root cause seen on KDS1 2026-08-18/19:
#     autologin-session was set but autologin-user was left blank, so the
#     custom pi-greeter sat forever on a PAM password prompt nobody could
#     answer instead of ever starting the kiosk session -- the Pi looked
#     fully offline from the outside (no chromium, nothing on screen) even
#     though SSH/Tailscale/networking were completely fine. No-op on
#     KDS2/3, which don't run lightdm.
if [ -f /etc/lightdm/lightdm.conf ]; then
  sudo cp /etc/lightdm/lightdm.conf "/etc/lightdm/lightdm.conf.bak-$(date +%Y%m%d%H%M%S)"
  sudo sed -i 's/^#\?autologin-user=.*/autologin-user=pi/' /etc/lightdm/lightdm.conf
fi

# 2. Hardened watchdog script.
cp /home/pi/.failsafe-staging/tailscale-watchdog.sh /home/pi/tailscale-watchdog.sh
chmod +x /home/pi/tailscale-watchdog.sh

# 2b. Push-notification helper (ntfy.sh) -- called by tailscale-watchdog.sh
#     (and any other watchdog going forward) at points that need a human,
#     not just a log line nobody's watching in real time.
if [ -f /home/pi/.failsafe-staging/alert.sh ]; then
  cp /home/pi/.failsafe-staging/alert.sh /home/pi/alert.sh
  chmod +x /home/pi/alert.sh
fi

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

# 3d. WiFi signal-strength trend logger (continuous, not just on failure --
#     lets us see whether flapping correlates with weak/marginal signal).
if [ -f /home/pi/.failsafe-staging/wifi-signal-log.sh ]; then
  cp /home/pi/.failsafe-staging/wifi-signal-log.sh /home/pi/wifi-signal-log.sh
  chmod +x /home/pi/wifi-signal-log.sh
fi

# 3e. WiFi auth-dialog watchdog (defense in depth alongside 1c above --
#     covers the profile ever getting recreated agent-owned again, e.g. by
#     an OS update or someone reconfiguring WiFi via the desktop GUI).
if [ -f /home/pi/.failsafe-staging/wifi-auth-watchdog.sh ]; then
  cp /home/pi/.failsafe-staging/wifi-auth-watchdog.sh /home/pi/wifi-auth-watchdog.sh
  chmod +x /home/pi/wifi-auth-watchdog.sh
fi

# 3f. Stuck-greeter/no-session watchdog (defense in depth alongside 1d
#     above -- covers autologin ever getting silently reset, e.g. by an
#     lightdm package update restoring its default config).
if [ -f /home/pi/.failsafe-staging/session-watchdog.sh ]; then
  cp /home/pi/.failsafe-staging/session-watchdog.sh /home/pi/session-watchdog.sh
  chmod +x /home/pi/session-watchdog.sh
fi

# 4. Cron: pi user's own crontab (matches how the original watchdog was
#    installed) -- not root's, so no sudo here. Replaces any older lines
#    for the same scripts so re-running this installer doesn't duplicate.
(
  crontab -l 2>/dev/null | grep -vE 'tailscale-watchdog\.sh|hdmi-watchdog\.sh|power-watchdog\.sh|chromium-watchdog\.sh|wifi-signal-log\.sh|wifi-auth-watchdog\.sh|session-watchdog\.sh' || true
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
  if [ -f /home/pi/wifi-signal-log.sh ]; then
    echo "* * * * * /home/pi/wifi-signal-log.sh"
  fi
  if [ -f /home/pi/wifi-auth-watchdog.sh ]; then
    echo "*/2 * * * * /home/pi/wifi-auth-watchdog.sh"
  fi
  if [ -f /home/pi/session-watchdog.sh ]; then
    echo "*/2 * * * * /home/pi/session-watchdog.sh"
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
