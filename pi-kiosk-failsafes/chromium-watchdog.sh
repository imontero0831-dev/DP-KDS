#!/bin/bash
# Detects a Chromium kiosk that's still running as a process but no longer
# actually alive or correct -- the gap fix-chromium.sh's crash-restart loop
# can't see, since that loop only reacts to the process exiting, not to a
# hung renderer/compositor or a silent navigation to an error page.
#
# Requires Chromium launched with --remote-debugging-port=9222
# (localhost-only -- never pair with --remote-debugging-address=0.0.0.0,
# that would expose full remote JS execution on the kiosk to the network).
#
# Checks, every run:
#   1. the debug port actually responds within a timeout (proves the
#      browser's main thread isn't deadlocked)
#   2. some open tab's URL still starts with the expected app origin
#      (catches a silent navigation to a network-error page or a stale
#      URL that never crashed the process)
# On either failure, kills chromium -- fix-chromium.sh's own while-loop
# (already running) picks it back up fresh within ~2s.
#
# Real incident 2026-09-02/04 (kds-display-2): during the tailscale-watchdog
# reboot-loop bug (see tailscale-watchdog.sh), this watchdog logged over a
# thousand "main thread likely deadlocked" restarts that were never real
# hangs -- Xorg's own log for the same window is completely clean (no GPU/
# driver errors, clean start/stop each boot), and the daily restart count
# tracked the daily reboot count almost exactly (up to 1.4x it -- checked
# 2026-09-05). Root cause: every forced reboot restarted chromium from
# cold, and with no grace period this watchdog's 1-min cron tick + 5s curl
# timeout kept catching it mid cold-start (GPU compositor init, page load)
# and killing it again before it ever had a chance to finish -- sometimes
# twice per boot, compounding the churn from the reboot loop itself.
LOG=/home/pi/chromium-watchdog.log
EXPECTED_ORIGIN="https://dp-kds.vercel.app"
GRACE_SECONDS=45
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

# fix-chromium.sh's own loop already handles a fully-dead process; nothing
# for this watchdog to do until Chromium is actually up.
OLDEST_PID=$(pgrep -x chromium -o 2>/dev/null)
[ -z "$OLDEST_PID" ] && exit 0

# Give a freshly-launched chromium time to actually finish starting before
# judging it -- see incident note above.
ELAPSED=$(ps -o etimes= -p "$OLDEST_PID" 2>/dev/null | tr -d ' ')
if [ -n "$ELAPSED" ] && [ "$ELAPSED" -lt "$GRACE_SECONDS" ]; then
  exit 0
fi

if ! curl -s --max-time 5 http://localhost:9222/json/version >/dev/null 2>&1; then
  log "debug port unresponsive (main thread likely deadlocked), restarting chromium"
  pkill -x chromium
  exit 0
fi

TABS=$(curl -s --max-time 5 http://localhost:9222/json)
TAB_URLS=$(grep -oE '"url": *"[^"]*"' <<< "$TABS" | sed -E 's/"url": *"//; s/"$//')

if ! grep -q "^${EXPECTED_ORIGIN}" <<< "$TAB_URLS"; then
  log "no tab loaded at $EXPECTED_ORIGIN, restarting chromium (open tabs: $(tr '\n' ' ' <<< "$TAB_URLS"))"
  pkill -x chromium
fi
