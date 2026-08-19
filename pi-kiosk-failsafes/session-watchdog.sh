#!/bin/bash
# Detects a display manager stuck on the login greeter with no real kiosk
# session ever having started for `pi` -- the failure mode behind KDS1's
# 2026-08-18/19 outage. Root cause: /etc/lightdm/lightdm.conf had
# autologin-session set but autologin-user left blank, so the custom
# pi-greeter sat forever on a PAM password prompt nobody could answer.
# The Pi was fully fine at the OS level (SSH, Tailscale, network all up)
# but nothing was ever going to put the kiosk on screen, forever, until a
# human intervened by hand.
#
# No existing watchdog can catch this: chromium-watchdog.sh only acts once
# a chromium process already exists, and this failure mode means one never
# gets spawned in the first place. This is the layer below that.
LOG=/home/pi/session-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

# No-op on any Pi not using lightdm (nothing to watch).
systemctl is-active --quiet lightdm 2>/dev/null || exit 0

# Give a normal boot time to finish autologin before judging it stuck.
UPTIME=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)
[ "$UPTIME" -lt 120 ] && exit 0

# A real kiosk session means a window manager process owned by `pi`, not
# by `lightdm` (the greeter itself also runs labwc/openbox, but as user
# lightdm -- see 2026-08-19 investigation). Covers labwc (KDS1) and
# openbox (KDS2/KDS3) without needing to know which this Pi runs.
pgrep -u pi -x 'labwc|openbox|wayfire' >/dev/null 2>&1 && exit 0

log "lightdm active, system up ${UPTIME}s, but no WM session running for pi -- restarting lightdm"
sudo systemctl restart lightdm
