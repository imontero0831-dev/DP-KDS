#!/bin/bash
# Pushes a notification to Israel's phone via ntfy.sh -- a plain HTTPS POST
# over the Pi's normal internet connection, independent of Tailscale (which
# is frequently exactly what's broken when a watchdog needs to call this).
# One-time setup: install the ntfy app (iOS/Android) and subscribe to the
# topic below. The topic is a random slug, not a secret -- ntfy topics are
# public-by-name, so anyone who guessed this exact string could also post
# to it, but nothing sensitive ever goes in the message body.
#
# Usage: alert.sh "title" "message body"
TOPIC="dpkds-kiosk-0d13f59d64cb"

TITLE="${1:-DP-KDS alert}"
MSG="${2:-}"

curl -s -m 10 \
  -H "Title: $TITLE" \
  -H "Priority: high" \
  -H "Tags: warning" \
  -d "$MSG" \
  "https://ntfy.sh/$TOPIC" >/dev/null 2>&1
