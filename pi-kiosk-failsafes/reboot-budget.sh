#!/bin/bash
# Shared reboot budget for every KDS watchdog. This file is SOURCED, not run.
#
# The failure it exists to prevent: 2026-09-02/04, tailscale-watchdog.sh
# power-cycled kds-display-2 1146 times over 29.5h because a WiFi fault it
# could not fix never cleared. That one watchdog now caps its own reboots
# per incident -- but nothing stopped two *different* watchdogs each
# rebooting 3x back to back, or a watchdog added later from repeating the
# same mistake from scratch. This is one budget they all draw from.
#
# Rule: at most $RB_MAX reboots per rolling $RB_WINDOW seconds, counted
# across ALL watchdogs combined, and the ledger deliberately lives under
# /home/pi so it SURVIVES the reboots it is counting (tailscale-watchdog's
# own per-incident counter resets on reboot -- that is a different, weaker
# guarantee). Once the budget is spent, reboot_allowed returns non-zero and
# the caller MUST fall back to alerting a human instead of rebooting again.
#
# Usage:
#   . /home/pi/reboot-budget.sh
#   if reboot_allowed; then
#     record_reboot "chromium crash-loop unrecovered 10min"
#     sync; sudo /sbin/reboot
#   else
#     "$ALERT" "KDS $(hostname) needs hands" "Reboot budget spent, still broken."
#   fi

RB_LEDGER=/home/pi/.reboot-ledger
RB_MAX=3
RB_WINDOW=21600          # 6 hours

# Number of reboots recorded in the last $RB_WINDOW seconds.
reboot_count_recent() {
  local now cutoff n=0 ts
  now=$(date +%s)
  cutoff=$((now - RB_WINDOW))
  [ -f "$RB_LEDGER" ] || { echo 0; return; }
  while read -r ts _; do
    case "$ts" in ''|*[!0-9]*) continue;; esac
    [ "$ts" -ge "$cutoff" ] && n=$((n + 1))
  done < "$RB_LEDGER"
  echo "$n"
}

# True (exit 0) while the fleet-wide budget still has room.
reboot_allowed() {
  [ "$(reboot_count_recent)" -lt "$RB_MAX" ]
}

# Append a reboot to the shared ledger. Call this immediately before
# `sudo reboot`, followed by `sync` so the line is on disk before the box
# goes down.
record_reboot() {
  local now
  now=$(date +%s)
  echo "$now $(date '+%Y-%m-%d %H:%M:%S') by=$(basename "${0:-unknown}") reason=${1:-unspecified}" >> "$RB_LEDGER"
  if [ "$(wc -l < "$RB_LEDGER" 2>/dev/null || echo 0)" -gt 50 ]; then
    tail -n 50 "$RB_LEDGER" > "$RB_LEDGER.tmp" && mv "$RB_LEDGER.tmp" "$RB_LEDGER"
  fi
}
