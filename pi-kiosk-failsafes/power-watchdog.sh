#!/bin/bash
# Logs undervoltage/throttling events as they happen, so a degrading power
# supply shows up as a trend in a log file instead of being invisible right
# up until it eventually causes a real hang (see 2026-08-12 investigation --
# we had zero visibility into this before; the hardware watchdog now covers
# the hang itself, but this catches it earlier, before that point).
# Silent when healthy, matching the other watchdogs' low-noise style.
LOG=/home/pi/power-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

command -v vcgencmd >/dev/null 2>&1 || exit 0

FLAGS=$(vcgencmd get_throttled 2>/dev/null | grep -oE '0x[0-9a-fA-F]+')
[ -z "$FLAGS" ] && exit 0
[ "$FLAGS" = "0x0" ] && exit 0

log "throttled=$FLAGS (undervoltage/throttle/frequency-cap event -- see 'vcgencmd get_throttled' bit reference for decoding)"
