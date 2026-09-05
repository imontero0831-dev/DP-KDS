#!/bin/bash
# Runs on KDS1 every 5 min via cron. Polls KDS2/KDS3 for reachability by
# any available path (Tailscale IP, mDNS .local, last-known LAN IP) and,
# once reachable, pushes + runs install-failsafes.sh so they self-harden
# (WiFi power-save off + hardened tailscaled watchdog) without anyone
# needing to SSH in by hand. Safe to run repeatedly -- skips a sibling
# once its own /home/pi/.failsafe-v2-installed marker exists.
LOG=/home/pi/sibling-deploy.log
KEY=/home/pi/.ssh/dpkds_pi
STAGING_LOCAL=/home/pi/.failsafe-staging
STAGING_REMOTE=/home/pi/.failsafe-staging
SSH="ssh -i $KEY -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new -o BatchMode=yes"
SCP="scp -i $KEY -o ConnectTimeout=5 -o StrictHostKeyChecking=accept-new -o BatchMode=yes"

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

try_deploy() {
  local name="$1"; shift
  local candidates=("$@")
  local host=""

  for c in "${candidates[@]}"; do
    if ping -c1 -W2 "$c" >/dev/null 2>&1 && $SSH "pi@$c" "true" >/dev/null 2>&1; then
      host="$c"
      break
    fi
  done

  if [ -z "$host" ]; then
    return 0   # not reachable yet, quietly wait for the next run
  fi

  if $SSH "pi@$host" "test -f /home/pi/.failsafe-v7-installed" >/dev/null 2>&1; then
    return 0   # already installed
  fi

  log "$name reachable at $host, deploying failsafe bundle"
  if ! $SSH "pi@$host" "mkdir -p $STAGING_REMOTE"; then
    log "$name: mkdir failed"; return 1
  fi
  if ! $SCP "$STAGING_LOCAL/tailscale-watchdog.sh" "$STAGING_LOCAL/alert.sh" "$STAGING_LOCAL/hdmi-watchdog.sh" "$STAGING_LOCAL/power-watchdog.sh" "$STAGING_LOCAL/chromium-watchdog.sh" "$STAGING_LOCAL/wifi-signal-log.sh" "$STAGING_LOCAL/wifi-auth-watchdog.sh" "$STAGING_LOCAL/session-watchdog.sh" "$STAGING_LOCAL/install-failsafes.sh" "pi@$host:$STAGING_REMOTE/"; then
    log "$name: scp failed"; return 1
  fi
  if $SSH "pi@$host" "bash $STAGING_REMOTE/install-failsafes.sh"; then
    log "$name: install succeeded"
  else
    log "$name: install FAILED, will retry next run"
  fi
}

try_deploy "kds-display-2" 100.120.49.88 kds-display-2.local
try_deploy "kds-display-3" 100.72.248.52 kds-display-3.local 192.168.1.194
