# ============================================================
# DONA PATYS KDS — Raspberry Pi Kiosk Setup
# ============================================================
# Follow these steps IN ORDER after flashing Raspberry Pi OS
# to your SD card. Should take ~20 minutes total.
# ============================================================


# ── STEP 1: Connect to WiFi ──────────────────────────────────
# Do this through the Pi desktop GUI on first boot.
# Click the WiFi icon in the top-right corner and connect
# to your restaurant's WiFi. Only needs to be done once.


# ── STEP 2: Open Terminal and run updates ────────────────────
sudo apt update && sudo apt upgrade -y


# ── STEP 3: Install Chromium (usually pre-installed) ─────────
sudo apt install -y chromium-browser


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


# ── STEP 5: Create the autostart file ────────────────────────
# This makes the Pi boot straight into your KDS, fullscreen,
# no desktop icons, no taskbar — just the app.
#
# First create the directory if it doesn't exist:
mkdir -p /home/pi/.config/lxsession/LXDE-pi

# Now create the autostart file:
# ⚠️  REPLACE the URL below with your actual Vercel URL
#     before pasting this into Terminal.
#
sudo tee /home/pi/.config/lxsession/LXDE-pi/autostart > /dev/null << 'EOF'
@lxpanel --profile LXDE-pi
@pcmanfm --desktop --profile LXDE-pi
@xset s off
@xset -dpms
@xset s noblank
@chromium-browser \
  --kiosk \
  --noerrdialogs \
  --disable-infobars \
  --disable-extensions \
  --disable-plugins \
  --disable-translate \
  --disable-sync \
  --disable-background-networking \
  --disable-features=TranslateUI \
  --no-first-run \
  --check-for-update-interval=31536000 \
  https://YOUR-VERCEL-APP-URL.vercel.app
EOF

# ── STEP 5b: For FOOD station ────────────────────────────────
# If this Pi is the food station, change the URL to:
#   https://YOUR-VERCEL-APP-URL.vercel.app?station=food

# ── STEP 5c: For DRINKS station ──────────────────────────────
# If this Pi is the drinks station, change the URL to:
#   https://YOUR-VERCEL-APP-URL.vercel.app?station=drinks


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

# App not loading?
# → Check WiFi is connected: ping google.com
# → Check the URL in autostart file is correct
# → Try opening manually: chromium-browser https://your-url.vercel.app

# Screen went black?
# → Re-run Step 4 (the xorg.conf blanking disable)
# → Also try: xset s off && xset -dpms

# Numpad not working?
# → Unplug and replug the USB dongle
# → Make sure you're on the Kitchen screen (not Waiter/History)
# → Numpad only works in Kitchen screen by design

# Need to access desktop again for maintenance?
# → Plug in a keyboard, press Alt+F4 to close Chrome
# → Or: ssh pi@<pi-ip-address> from another computer

# How to find Pi's IP address (for SSH):
# → On Pi: hostname -I
# → Or check your router's connected devices list

# ── TO CLONE THIS SETUP TO A SECOND PI ──────────────────────
# 1. Flash a fresh SD card with Raspberry Pi OS
# 2. Boot it up and connect to WiFi
# 3. Run all the same steps above
# 4. Change the URL in Step 5 to ?station=drinks (or food)
# 5. Done — takes ~15 minutes since you've done it before
#
# ============================================================
