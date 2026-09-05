#!/bin/bash
# Chromium's BrowserMetrics + Crash Reports dirs grow unbounded when it
# crash-loops (each restart adds a dump). On 2026-09-01 that filled a 14G
# card on kds-display-3, which then made everything else -- including
# Chromium itself -- fail, and looked like an all-day dead screen.
LOG=/home/pi/disk-watchdog.log
THRESHOLD=85
USE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USE" -ge "$THRESHOLD" ]; then
  rm -rf /home/pi/.config/chromium/BrowserMetrics/* /home/pi/.config/chromium/"Crash Reports"/*
  echo "$(date '+%Y-%m-%d %H:%M:%S') disk at ${USE}%, cleared BrowserMetrics + Crash Reports" >> "$LOG"
fi
