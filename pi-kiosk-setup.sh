# ============================================================
# DONA PATYS KDS — Raspberry Pi Kiosk Setup
# ============================================================
# This is the verified setup currently running on donapatys-kds
# (KDS Display 1). Follow these steps IN ORDER after flashing
# Raspberry Pi OS to your SD card. Should take ~20 minutes total.
#
# Fleet reference (update as devices/networks change):
#   donapatys-kds  → ssh pi@donapatys-kds.local   → ?screen=kitchen
#   kds-display-2  → ssh pi@kds-display-2.local   → ?screen=TBD
#   kds-display-3  → ssh pi@kds-display-3.local   → ?screen=TBD
#   App URL: https://dp-kds.vercel.app
#   Screen values: kitchen, drinks, expo, (none = waiter/tables)
# ============================================================


# ── STEP 1: Connect to WiFi ──────────────────────────────────
# Do this through the Pi desktop GUI on first boot.
# Click the WiFi icon in the top-right corner and connect
# to your restaurant's WiFi. Only needs to be done once.


# ── STEP 2: Open Terminal and run updates ────────────────────
sudo apt update && sudo apt upgrade -y


# ── STEP 3: Install Chromium (usually pre-installed) ─────────
sudo apt install -y chromium


# ── STEP 4: Disable screen blanking / sleep ──────────────────
# Paste this entire block into Terminal:
sudo tee /etc/X11/xorg.conf.d/10-blanking.conf > /dev/null << 'EOF'
Section "ServerFlags"
  Option "BlankTime"   "0"
  Option "StandbyTime" "0"
  Option "SuspendTime" "0"
  Option "OffTime"     "0"
EndSection
EOF


# ── STEP 5: Create the launch script + autostart file ────────
# This makes the Pi boot straight into your KDS, fullscreen,
# no desktop icons, no taskbar — just the app.
#
# fix-chromium.sh is what fixes the "white screen on boot"
# problem. Kitchen Pis get power-cycled (unplugged) instead of
# shut down cleanly, which causes two things that both show up
# as a stuck blank/white screen:
#   1. Chromium tries to load the page before WiFi is connected
#   2. Chromium shows a "restore pages?" prompt hidden behind
#      the kiosk window instead of loading fresh
# It also auto-restarts Chromium if it ever crashes mid-shift,
# so recovery doesn't require unplugging the Pi.
#
# ⚠️  REPLACE the ?screen= value below for the station this Pi
#     is actually going to display before pasting into Terminal.
#
tee /home/pi/fix-chromium.sh > /dev/null << 'EOF'
#!/bin/bash
# Wait up to ~60s for network before doing anything (avoids
# launching Chromium before WiFi reconnects after a power cycle)
for i in $(seq 1 30); do
  ping -c1 -W2 8.8.8.8 >/dev/null 2>&1 && break
  sleep 2
done

# Clear crashed-session flags so Chromium never shows a
# "restore pages?" prompt hidden behind the kiosk window
sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/g' /home/pi/.config/chromium/Default/Preferences 2>/dev/null
sed -i 's/"exited_cleanly":false/"exited_cleanly":true/g' /home/pi/.config/chromium/Default/Preferences 2>/dev/null

xset s off
xset -dpms
xset s noblank

# Auto-restart Chromium if it ever crashes or gets closed
# mid-shift, so recovery doesn't require unplugging the Pi
while true; do
  chromium \
    --kiosk \
    --noerrdialogs \
    --disable-infobars \
    --disable-extensions \
    --no-first-run \
    "https://dp-kds.vercel.app/?screen=kitchen"
  sleep 2
done
EOF
chmod +x /home/pi/fix-chromium.sh

mkdir -p /home/pi/.config/autostart
tee /home/pi/.config/autostart/kds.desktop > /dev/null << 'EOF'
[Desktop Entry]
Type=Application
Name=KDS
Exec=bash -c '/home/pi/fix-chromium.sh'
Hidden=false
NoDisplay=false
X-GNOME-Autostart-enabled=true
EOF

# ── STEP 5b: Which screen does this Pi show? ─────────────────
# Edit fix-chromium.sh and change the URL at the bottom:
#   Kitchen ticket display → ?screen=kitchen
#   Drinks/sides station   → ?screen=drinks
#   Expo station            → ?screen=expo
#   Waiter/ordering tables  → no ?screen= param at all
# NOTE: leaving off ?screen= entirely loads the waiter/tables
# ordering view, not a kitchen display — don't leave a KDS Pi
# on the bare URL by accident.


# ── STEP 6: Set Pi to auto-login to desktop ──────────────────
sudo raspi-config nonint do_boot_behaviour B4
# B4 = auto-login to desktop (no password prompt on boot)


# ── STEP 7: Reboot and test ──────────────────────────────────
sudo reboot
# After reboot the Pi should go straight into your KDS.
# No keyboard or mouse needed from this point on.


# ── STEP 8: Plug in the wireless USB numpad ──────────────────
# Insert the USB dongle into any USB port on the Pi.
# It will work immediately — no drivers, no setup.
# Test by pressing keys — they should control the KDS.


# ============================================================
# NUMPAD KEY REFERENCE CARD
# Print this and tape it near the monitor for staff
# ============================================================
#
#  ┌─────────────────────────────────────────────┐
#  │         DONA PATYS KDS — CONTROL PAD        │
#  │                                             │
#  │  ENTER      → Avanzar orden                 │
#  │               (Nueva→En Proceso→Lista)      │
#  │                                             │
#  │  BACKSPACE  → Deshacer último paso          │
#  │                                             │
#  │  ← →        → Cambiar entre órdenes         │
#  │                                             │
#  │  1 2 3      → Ir directo a orden 1, 2 ó 3   │
#  │                                             │
#  │  ESC        → Volver a primera orden        │
#  └─────────────────────────────────────────────┘
#
# ============================================================


# ── TROUBLESHOOTING ──────────────────────────────────────────

# White screen / blank screen on boot?
# → This should now be fixed by fix-chromium.sh (waits for
#   network + clears crash-restore state + auto-restarts
#   Chromium if it ever dies).
# → If it still happens, SSH in (see below) and check:
#     cat /home/pi/fix-chromium.sh          (URL correct? script present?)
#     cat /home/pi/.config/autostart/kds.desktop
#     pgrep -af chromium                    (is it even running?)
#     ping -c3 8.8.8.8                      (is WiFi actually connecting
#                                             within the 60s wait window?)
#   If WiFi takes longer than 60s to connect on your network,
#   raise the "seq 1 30" loop count in fix-chromium.sh (each
#   step is 2s, so 30 = 60s, 60 = 2min, etc).
# → IMPORTANT: the app is a React build using absolute asset
#   paths. It must be loaded from the live Vercel URL
#   (https://dp-kds.vercel.app/...), never from a local
#   file:// path (e.g. file:///home/pi/DP-KDS/...) — file://
#   breaks the asset paths and shows a white screen.

# App not loading?
# → Check WiFi is connected: ping google.com
# → Check the URL in fix-chromium.sh is correct
# → Try opening manually: chromium https://dp-kds.vercel.app

# Screen went black?
# → Re-run Step 4 (the xorg.conf blanking disable)
# → Also try: xset s off && xset -dpms

# Numpad not working?
# → Unplug and replug the USB dongle
# → Make sure you're on the Kitchen screen (not Waiter/History)
# → Numpad only works in Kitchen screen by design

# Need to access desktop again for maintenance?
# → Plug in a keyboard, press Alt+F4 to close Chrome
# → Or: ssh pi@<hostname>.local from another computer on the
#   same WiFi (e.g. ssh pi@donapatys-kds.local)

# How to find Pi's IP/hostname (for SSH):
# → On Pi: hostname -I    and    hostname
# → Or check your router's connected devices list
# → Or try: ssh pi@<hostname>.local (mDNS, works if both
#   devices are on the same network)

# ── TO CLONE THIS SETUP TO ANOTHER PI ────────────────────────
# 1. Flash a fresh SD card with Raspberry Pi OS
# 2. Boot it up and connect to WiFi
# 3. Run all the same steps above
# 4. Set the ?screen= value in fix-chromium.sh for that
#    station (drinks / expo / kitchen)
# 5. Done — takes ~15 minutes since you've done it before
#
# ============================================================
