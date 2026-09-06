#!/bin/bash
# Pushes a notification to Israel's phone via ntfy.sh -- a plain HTTPS POST
# over the Pi's normal internet connection, independent of Tailscale (which
# is frequently exactly what's broken when a watchdog needs to call this).
# One-time setup: install the ntfy app (iOS/Android) and subscribe to the
# topic below. The topic is a random slug, not a secret -- ntfy topics are
# public-by-name, so anyone who guessed this exact string could also post
# to it, but nothing sensitive ever goes in the message body.
#
# Usage: alert.sh "title" "message body" [priority] [tags]
#   priority: min|low|default|high|urgent   (default: high -- unchanged
#             from the original 2-arg behaviour every existing caller uses)
#   tags:     comma-separated ntfy tag names (default: warning)
TOPIC="dpkds-kiosk-0d13f59d64cb"

TITLE="${1:-DP-KDS alert}"
MSG="${2:-}"
PRIORITY="${3:-high}"
TAGS="${4:-warning}"

curl -s -m 10 \
  -H "Title: $TITLE" \
  -H "Priority: $PRIORITY" \
  -H "Tags: $TAGS" \
  -d "$MSG" \
  "https://ntfy.sh/$TOPIC" >/dev/null 2>&1
