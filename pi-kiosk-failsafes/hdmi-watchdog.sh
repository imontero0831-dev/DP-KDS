#!/bin/bash
# Recovers a monitor that's connected but showing nothing. Root cause seen
# on KDS2 on 2026-08-12: the HDMI cable was unplugged/replugged while X was
# already running. The kernel/DRM correctly re-read the monitor's EDID
# (dmesg + Xorg.0.log showed a clean handshake with the Dell panel), but
# Xorg's RandR layer never assigned the output an active mode afterward --
# `xrandr --query` showed it "connected" with a full list of supported
# modes, but none marked active, and the X screen stuck at a 1024x768
# fallback. The Pi, Tailscale, and Chromium were all completely healthy;
# only the video output itself was dark. `xrandr --output <name> --auto`
# fixes it instantly, so this just does that automatically on a schedule
# instead of requiring an SSH session every time it happens.
#
# X11-only (KDS2/KDS3's Openbox/X11 stack). No-ops harmlessly on KDS1's
# labwc/Wayland stack, which has no `xrandr` to find.
LOG=/home/pi/hdmi-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

command -v xrandr >/dev/null 2>&1 || exit 0

export DISPLAY=:0
export XAUTHORITY=$(find /tmp -maxdepth 1 -name 'serverauth.*' 2>/dev/null | head -1)
[ -z "$XAUTHORITY" ] && exit 0

xrandr --query >/dev/null 2>&1 || exit 0

CONNECTED=$(xrandr --query | grep ' connected' | awk '{print $1}')
ACTIVE=$(xrandr --listactivemonitors | awk 'NR>1{print $NF}')

for out in $CONNECTED; do
  if ! grep -qx "$out" <<< "$ACTIVE"; then
    log "output $out connected but inactive, forcing --auto"
    xrandr --output "$out" --auto
  fi
done
