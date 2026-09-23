# AT&T captive-portal hijack — what it is and what guards against it

## The failure
Chromium runs a captive-portal check against `connectivitycheck.gstatic.com/generate_204`.
On a WiFi reassociation the AT&T gateway server-redirects that probe to
`192.168.1.254/cgi-bin/autodetect.ha` and then `/cgi-bin/home.ha` — the router's
own admin UI. Chromium opens this in a **new tab**, which lands in the foreground.
Kiosk mode has no address bar, so nobody on site can navigate back.

Confirmed instances: 2026-08-18 (all three screens) and 2026-09-21 10:02 CDT
(Expo, stuck for **33 hours** until closed by hand on 2026-09-22).

## Why the original fix was not enough
`--disable-background-networking` was added to `fix-chromium.sh` on 2026-08-18 and
is present on all three Pis. It did not prevent the 2026-09-21 recurrence. The
Chromium history transition for the probe is `TYPED / CHAIN_START` — a real
top-level navigation in its own tab, not a background fetch — so the flag's scope
does not cover this path.

## Why no watchdog noticed for 33 hours
Every URL check asks whether *some* tab matches the expected origin. The real KDS
tab was still open, just hidden behind the router page, so all of them passed:

- `chromium-watchdog.sh` — `grep -q "^$EXPECTED_ORIGIN" <<< "$TAB_URLS"`
- `kiosk-health.sh` — `ORIGIN_TAB=$(... | head -1)`, and it then reads the title
  *of the matching tab*, so it scored `HEALTHY=1` the entire time

Neither looks at which tab is actually visible.

## Current guards (deployed 2026-09-22 21:00)
1. **`chromium-policy-kds.json`** → `/etc/chromium/policies/managed/10-kds-kiosk.json`.
   Blocks both ends of the redirect chain. Read at Chromium startup, so it applies
   on the next natural restart; it is prevention, not recovery.
2. **`kiosk-tab-guard.sh`** (cron, every minute). Closes any non-KDS tab via the
   DevTools endpoint. This is the recovery path and it is mechanism-independent —
   it does not care what opened the stray tab. It only ever closes a tab: it never
   kills Chromium, restarts the wrapper, or reboots. Verified by hand on Expo
   2026-09-22 — same Chromium PID before and after, no blank screen. If no KDS tab
   exists at all it stands down and leaves that to `chromium-watchdog.sh`.

## Still open
`chromium-watchdog.sh` and `kiosk-health.sh` still use the "some tab matches"
logic described above. The tab guard covers the symptom operationally, but those
two should eventually assert the *active* tab instead.
