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
#   2. a tab at the expected app origin still EXISTS. Note what this does
#      NOT prove: not that the app is what the screen shows, and not that it
#      rendered. Read it as "the app is open somewhere", nothing more.
#   3. that tab actually mounted (#root has children) -- needs the DOM, so
#      it needs devtools-eval.py, and it only restarts once the gentler
#      guards have had 10 minutes to fix it first. See the bottom of the file.
# On 1 or 2 failing, kills chromium -- fix-chromium.sh's own while-loop
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
DEVTOOLS_EVAL=/home/pi/devtools-eval.py
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
  exit 0
fi

# Reaching here means a tab at our origin EXISTS. That is not the same as the
# screen showing a working app, and the gap is not hypothetical: on 2026-09-21
# the AT&T gateway page sat in front of the KDS tab on Expo for 33 hours, and
# on 2026-09-22 a restart onto a cached index.html naming a purged bundle hash
# left #root empty -- a blank white screen. The check above passed in both
# cases, which is exactly why it must not be the only one.
#
# Those two states now have their own dedicated, gentler handlers:
#   kiosk-tab-guard.sh    closes stray tabs        (~1 min, closes a tab)
#   kiosk-mount-guard.sh  reloads an empty #root   (~2 min, reloads a tab)
# This watchdog's only action is killing Chromium, which blanks the screen for
# a couple of seconds, so it must stay the LAST resort: it acts only once the
# app has been unmounted long enough that both of those have demonstrably
# failed. Hence UNMOUNTED_RESTART_AFTER well above the mount guard's own
# 2-tick trigger and 5-minute reload cooldown -- the ordering is what keeps
# the two from fighting over the same symptom.
UNMOUNTED_STATE=/home/pi/.chromium-watchdog-unmounted
UNMOUNTED_RESTART_AFTER=10   # consecutive minutes with an empty #root

if [ ! -x "$DEVTOOLS_EVAL" ]; then
  rm -f "$UNMOUNTED_STATE"
  exit 0
fi

TID=$(printf '%s' "$TABS" | python3 -c "
import json,sys
try: targets=json.load(sys.stdin)
except Exception: sys.exit(0)
for t in targets:
    if t.get('type')=='page' and t.get('url','').startswith('$EXPECTED_ORIGIN'):
        print(t['id']); break
" 2>/dev/null)
[ -z "$TID" ] && { rm -f "$UNMOUNTED_STATE"; exit 0; }

KIDS=$("$DEVTOOLS_EVAL" "$TID" "(function(){var r=document.getElementById('root');return r?r.childElementCount:-1;})()" 2>/dev/null)
# Can't read the DOM -> can't judge. Treat "don't know" as "don't act", and
# don't let an unreadable tick accumulate toward a restart.
[ -z "$KIDS" ] && exit 0

if [ "$KIDS" -gt 0 ] 2>/dev/null; then
  if [ -f "$UNMOUNTED_STATE" ]; then
    log "app remounted (#root has $KIDS child(ren)) -- clearing unmounted streak"
    rm -f "$UNMOUNTED_STATE"
  fi
  exit 0
fi

STREAK=$(cat "$UNMOUNTED_STATE" 2>/dev/null); [ -z "$STREAK" ] && STREAK=0
STREAK=$((STREAK + 1))
echo "$STREAK" > "$UNMOUNTED_STATE"

if [ "$STREAK" -ge "$UNMOUNTED_RESTART_AFTER" ]; then
  log "#root empty for ${STREAK} consecutive checks -- mount guard did not recover it, restarting chromium"
  rm -f "$UNMOUNTED_STATE"
  pkill -x chromium
else
  log "#root empty (streak ${STREAK}/${UNMOUNTED_RESTART_AFTER}) -- leaving it to kiosk-mount-guard.sh"
fi
