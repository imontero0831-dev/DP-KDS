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
LOG=/home/pi/chromium-watchdog.log
EXPECTED_ORIGIN="https://dp-kds.vercel.app"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

# fix-chromium.sh's own loop already handles a fully-dead process; nothing
# for this watchdog to do until Chromium is actually up.
pgrep -x chromium >/dev/null 2>&1 || exit 0

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
