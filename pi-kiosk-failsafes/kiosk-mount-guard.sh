#!/bin/bash
# kiosk-mount-guard.sh -- catches a kiosk whose page loaded but whose React
# app never mounted, and reloads it.
#
# The incident, 2026-09-22 (Expo): Chromium was restarted and came up a
# blank white screen. document.readyState was "complete", #root existed with
# ZERO children, and the one <script> pointed at main.eabdd9f1.js, which
# Vercel returns 404 for. Chromium had used its CACHED index.html without
# revalidating -- normal browser behaviour when the network isn't ready yet,
# which is exactly the moment a kiosk relaunches -- so it got HTML naming a
# bundle hash that had since been purged. By the time the bundle request
# actually went out the network was up, so it got a real 404. Empty shell,
# nothing retries, white screen indefinitely.
#
# This is NOT fixable with cache headers: Vercel already serves / as
# "public, max-age=0, must-revalidate" and the hashed bundles as immutable,
# which is correct. The failure happens precisely when the cache is consulted
# INSTEAD of the server, so the fix has to live on the Pi.
#
# Why no existing watchdog saw it: they all judge the kiosk from DevTools
# HTTP metadata. kiosk-health.sh's health test reads document.title, and the
# title comes from index.html ("KDS") whether or not React ever mounted, so a
# completely blank screen scored HEALTHY. chromium-watchdog.sh only asks
# whether some tab's URL matches. Neither looks at the DOM. Same family as
# the stray-tab blind spot ([[kiosk-tab-guard.sh]]): the watchdogs verify the
# container, never the content.
#
# Action is deliberately the cheapest thing that works -- reload the tab with
# a cache-busting param, which is exactly what fixed Expo by hand. A unique
# URL cannot be served from the HTTP cache, so this forces fresh HTML and the
# current bundle hash. It never kills Chromium and never reboots; if reloads
# don't take, it stands down and lets chromium-watchdog.sh escalate.
#
# ARMING: log-only until /home/pi/.kiosk-mount-guard-armed exists. Until then
# it records what it WOULD have done and touches nothing. Arm with:
#   touch /home/pi/.kiosk-mount-guard-armed
#
# Requires: fix-chromium.sh launching chromium with --remote-debugging-port=9222,
# and /home/pi/devtools-eval.py alongside it.
LOG=/home/pi/kiosk-mount-guard.log
ALERT=/home/pi/alert.sh
EVAL=/home/pi/devtools-eval.py
ARMED_FLAG=/home/pi/.kiosk-mount-guard-armed
STATE=/home/pi/.kiosk-mount-guard-empty
RELOADS=/home/pi/.kiosk-mount-guard-reloads
EXPECTED_ORIGIN="https://dp-kds.vercel.app"

GRACE_SECONDS=60        # a cold-started chromium needs time to mount
EMPTY_TICKS=2           # consecutive empty ticks before acting (~2 min)
RELOAD_COOLDOWN=300     # never reload the same screen more than once / 5 min
RELOAD_WINDOW=1800      # give up if this many reloads in 30 min
RELOAD_MAX=3
ALERT_COOLDOWN=1800

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

OLDEST_PID=$(pgrep -x chromium -o 2>/dev/null)
[ -z "$OLDEST_PID" ] && exit 0
[ -x "$EVAL" ] || { log "ERROR: $EVAL missing or not executable"; exit 0; }

ELAPSED=$(ps -o etimes= -p "$OLDEST_PID" 2>/dev/null | tr -d ' ')
[ -n "$ELAPSED" ] && [ "$ELAPSED" -lt "$GRACE_SECONDS" ] && exit 0

# The KDS tab specifically. If there isn't one, that's chromium-watchdog.sh's
# problem, not ours.
TID=$(curl -s --max-time 5 http://localhost:9222/json 2>/dev/null | python3 -c "
import json,sys
try: targets=json.load(sys.stdin)
except Exception: sys.exit(0)
for t in targets:
    if t.get('type')=='page' and t.get('url','').startswith('$EXPECTED_ORIGIN'):
        print(t['id']); break
" 2>/dev/null)
[ -z "$TID" ] && exit 0

# Ask the page whether the app actually rendered.
MOUNTED=$("$EVAL" "$TID" "(function(){var r=document.getElementById('root');return JSON.stringify({kids:r?r.childElementCount:-1,rs:document.readyState,href:location.href});})()" 2>/dev/null)
if [ -z "$MOUNTED" ]; then
  # Couldn't read the DOM -- treat "don't know" as "don't act".
  exit 0
fi

KIDS=$(printf '%s' "$MOUNTED" | python3 -c "import json,sys; print(json.load(sys.stdin).get('kids',-1))" 2>/dev/null)
HREF=$(printf '%s' "$MOUNTED" | python3 -c "import json,sys; print(json.load(sys.stdin).get('href',''))" 2>/dev/null)
[ -z "$KIDS" ] && exit 0

# Healthy: app mounted. Forget any accumulated suspicion.
if [ "$KIDS" -gt 0 ]; then
  [ -f "$STATE" ] && { log "recovered: #root has $KIDS child(ren)"; rm -f "$STATE"; }
  exit 0
fi

COUNT=$(cat "$STATE" 2>/dev/null); [ -z "$COUNT" ] && COUNT=0
COUNT=$((COUNT + 1))
echo "$COUNT" > "$STATE"
log "#root empty (tick $COUNT/$EMPTY_TICKS) at $HREF"
[ "$COUNT" -lt "$EMPTY_TICKS" ] && exit 0

NOW=$(date +%s)

# Reload-loop brake: if we've already reloaded RELOAD_MAX times recently,
# reloading again isn't working -- stop and let a human / chromium-watchdog see it.
RECENT=0
if [ -f "$RELOADS" ]; then
  RECENT=$(awk -v now="$NOW" -v w="$RELOAD_WINDOW" '$1 > now-w' "$RELOADS" | wc -l)
  LAST=$(tail -1 "$RELOADS" 2>/dev/null)
  [ -n "$LAST" ] && [ $((NOW - LAST)) -lt "$RELOAD_COOLDOWN" ] && exit 0
fi
if [ "$RECENT" -ge "$RELOAD_MAX" ]; then
  log "GIVING UP: $RECENT reloads in last $((RELOAD_WINDOW/60))min and still empty -- not reloading again"
  exit 0
fi

# Rebuild the URL with a fresh cache-buster, dropping any previous one.
CB=$(printf '%s' "$HREF" | python3 -c "
import sys,time
from urllib.parse import urlsplit,urlunsplit,parse_qsl,urlencode
u=urlsplit(sys.stdin.read().strip())
q=[(k,v) for k,v in parse_qsl(u.query) if k not in ('_cb','_r')]
q.append(('_cb',str(int(time.time()))))
print(urlunsplit((u.scheme,u.netloc,u.path,urlencode(q),'')))
" 2>/dev/null)
[ -z "$CB" ] && exit 0

if [ ! -f "$ARMED_FLAG" ]; then
  log "LOG-ONLY: would reload -> $CB  (arm with: touch $ARMED_FLAG)"
  exit 0
fi

if "$EVAL" "$TID" "location.replace('$CB'); 'ok'" >/dev/null 2>&1; then
  log "reloaded blank kiosk -> $CB"
  echo "$NOW" >> "$RELOADS"
  rm -f "$STATE"
  if [ -x "$ALERT" ]; then
    STAMP=/home/pi/.kiosk-mount-guard-last-alert
    LAST_A=$(cat "$STAMP" 2>/dev/null); [ -z "$LAST_A" ] && LAST_A=0
    if [ $((NOW - LAST_A)) -ge "$ALERT_COOLDOWN" ]; then
      "$ALERT" "KDS $(hostname) blank screen reloaded" \
        "App shell loaded but never mounted (stale cached index.html). Reloaded with cache-buster." \
        default arrows_counterclockwise >/dev/null 2>&1
      echo "$NOW" > "$STAMP"
    fi
  fi
else
  log "ERROR: reload call failed"
fi
