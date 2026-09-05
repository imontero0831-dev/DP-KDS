#!/bin/bash
# firstrun.sh for re-provisioning Kitchen (kds-display-3)'s microSD from a fresh stock image,
# via Raspberry Pi Imager's --first-run-script flag.
#
# Why this exists: the previous card on this board panicked at boot with "Kernel panic - not
# syncing: No working init found" on 2026-09-05. init/systemd/dash all had structurally valid
# metadata (correct ELF headers, plausible sizes) when inspected via debugfs from a Mac, but that
# only rules out a missing/truncated file, not silent content-level bit rot -- which is exactly
# what took out this same physical card's Chromium binary on 2026-09-01. Re-flashing fresh
# instead of patching in place.
#
# Two-stage design, because firstrun.sh runs under a minimal systemd.run target with NO network
# services up yet:
#   Stage 1 (this script): everything that doesn't actually need a network connection --
#     user/hostname/SSH/WiFi-as-static-files, console autologin, all watchdog scripts, cron,
#     openbox/chromium launch config, PulseAudio -- plus writing + enabling a oneshot systemd
#     service for stage 2. This is deliberately almost everything: the first version of this
#     script only put user/hostname/SSH/WiFi here and left autologin + all the config files in
#     stage 2, which meant a board sat at an interactive password prompt until WiFi came up --
#     confirmed the hard way 2026-09-05 that restaurant WiFi association can take longer than
#     expected, and a kiosk with no keyboard/mouse has no business ever showing a login prompt.
#   Stage 2 (embedded below, runs once on the FIRST NORMAL boot after this, when NetworkManager
#     has actually brought wlan0 up): ONLY the things that truly require internet -- apt-get
#     installs and the Tailscale install. Everything else is already in place by the time this
#     runs, so the worst case if WiFi is slow is a blank/incomplete kiosk screen, never a login
#     prompt.
#
# Usage (unmount the card first, then target its raw disk):
#   /Applications/Raspberry\ Pi\ Imager.app/Contents/MacOS/rpi-imager --cli \
#     --first-run-script pi-kiosk-failsafes/kds-kitchen-firstrun.sh \
#     https://downloads.raspberrypi.com/raspios_lite_arm64_latest /dev/diskN
exec > /boot/firmware/firstrun.log 2>&1
set -x
set -e

# Modern Raspberry Pi OS (Bookworm/Trixie) images no longer ship a pre-existing "pi" user.
if ! id -u pi >/dev/null 2>&1; then
  useradd -m -s /bin/bash pi
  usermod -a -G adm,dialout,cdrom,sudo,audio,video,plugdev,games,users,input,render,netdev,gpio,i2c,spi pi 2>/dev/null || true
fi
echo 'pi:110965.Ps' | chpasswd

# Separate, easy-to-miss mechanism from everything else in this script: modern Raspberry Pi OS
# (Bookworm/Trixie) also runs its own first-boot account-setup wizard on the console, independent
# of this firstrun.sh entirely -- it only skips itself if /boot/firmware/userconf.txt exists
# (this is what Raspberry Pi Imager's own "set username/password" GUI field writes). Creating the
# pi user by hand above does NOT satisfy this separate check -- confirmed the hard way 2026-09-05,
# this board sat at an interactive "username:" prompt on real hardware despite firstrun.sh having
# already run successfully. Hash is `echo '110965.Ps' | openssl passwd -6 -stdin` (matches the
# same password set via chpasswd above, so credentials stay consistent either way).
echo 'pi:$6$Co5y33tmyThsTOcd$n5Pk6c6F37x/h2y9OpEkzC8KlsV7V1kx9Q4Cauuni8EkdgCDEw2bfe/6Mx/Hy0qIYIhQWw6bdrzcgIB8r6rzo0' > /boot/firmware/userconf.txt

raspi-config nonint do_hostname kds-display-3
raspi-config nonint do_ssh 0
# Some Pi WiFi chips stay rfkill-blocked until a country code is set, independent of the
# cfg80211.ieee80211_regdom= kernel cmdline arg. do_wifi_country doesn't hang (unlike
# do_wifi_ssid_passphrase below) -- confirmed via firstrun.log in the 2026-08-27 session.
raspi-config nonint do_wifi_country US
rfkill unblock wifi || true

# No lightdm on this board (matches its own prior setup, and KDS2/3's original from-scratch
# recipe) -- console autologin + a .bash_profile startx hook instead. Writing the getty drop-in
# directly instead of `raspi-config nonint do_boot_behaviour B2` -- confirmed the hard way
# 2026-09-05 that command needs a live systemd/D-Bus session to actually apply (same category of
# gotcha as do_wifi_ssid_passphrase above), so it silently failed to take effect when run in this
# offline stage. A plain file write has no such dependency.
install -d -m 755 /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'AUTOLOGINEOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I $TERM
AUTOLOGINEOF

install -o pi -g pi -m 700 -d /home/pi/.ssh
cat > /home/pi/.ssh/authorized_keys << 'KEYEOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIuTSj0oEMtHqrhPqlaANFE72gCZk5LU/b9Yag2nVc/c claude-code-dpkds-fleet
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIAkZIxelLukrvKfxM11iY5/Sq0NS8sMejqM5Ejdr681 mac-mini-to-kds
KEYEOF
chown pi:pi /home/pi/.ssh/authorized_keys
chmod 600 /home/pi/.ssh/authorized_keys

# WiFi as NetworkManager keyfiles instead of `raspi-config nonint do_wifi_ssid_passphrase`
# (hangs at this boot stage -- see header). Restaurant WiFi as the preferred network, plus a
# fallback hotspot both prior cards were also configured with. Deliberately ONE mechanism only
# (NetworkManager) -- see the wpa_supplicant.service masking below for why.
install -d -m 700 /etc/NetworkManager/system-connections
cat > /etc/NetworkManager/system-connections/preconfigured.nmconnection << 'NMEOF'
[connection]
id=preconfigured
uuid=D6ECEB16-DB12-4726-B238-2F462868229A
type=wifi
autoconnect-priority=10

[wifi]
mode=infrastructure
ssid=ATTiGiwtdS

[wifi-security]
key-mgmt=wpa-psk
psk=9ss4?2p2sufd

[ipv4]
method=auto

[ipv6]
method=auto
addr-gen-mode=default

[proxy]
NMEOF
chmod 600 /etc/NetworkManager/system-connections/preconfigured.nmconnection

cat > /etc/NetworkManager/system-connections/fallback-hotspot.nmconnection << 'NMEOF2'
[connection]
id=fallback-hotspot
uuid=7A1E9C4B-3F5D-4A2E-9B6C-1D8F0A2E5C7B
type=wifi
autoconnect-priority=5

[wifi]
mode=infrastructure
ssid=ForAllTheDogs

[wifi-security]
key-mgmt=wpa-psk
psk=chicago23

[ipv4]
method=auto

[ipv6]
method=auto
addr-gen-mode=default

[proxy]
NMEOF2
chmod 600 /etc/NetworkManager/system-connections/fallback-hotspot.nmconnection

# Global WiFi hardening, matching the rest of the fleet (install-failsafes.sh steps 1/1b).
install -d -m 755 /etc/NetworkManager/conf.d
cat > /etc/NetworkManager/conf.d/wifi-powersave-off.conf << 'CONFEOF'
[connection]
wifi.powersave = 2
CONFEOF
cat > /etc/NetworkManager/conf.d/wifi-band-24ghz.conf << 'CONFEOF2'
[connection-wifi-band-24ghz]
match-device=type:wifi
802-11-wireless.band=bg
CONFEOF2

# Real finding, not a guess: pulled directly off this same card's rootfs before re-flashing --
# wpa_supplicant.service was enabled system-wide (multi-user.target.wants) at the same time as
# NetworkManager.service, even though /etc/wpa_supplicant/wpa_supplicant.conf didn't exist on the
# rootfs (it only ever lived on the boot partition, never copied over) -- so it would start, fail
# immediately with no config, and keep retrying, repeatedly contending with NetworkManager for
# wlan0. This is a well-documented cause of exactly the interface flapping/disappearing
# ("no wlan0 device found") seen in this board's wifi-auth-watchdog.log. Masking it here so a
# fresh image never has this fight in the first place.
systemctl disable wpa_supplicant.service 2>/dev/null || true
systemctl mask wpa_supplicant.service 2>/dev/null || true

cat > /home/pi/.bash_profile << 'PROFEOF'
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  startx
fi
PROFEOF

cat > /home/pi/.xinitrc << 'XINITEOF'
exec openbox-session
XINITEOF

install -d -m 755 /home/pi/.config/openbox
cat > /home/pi/.config/openbox/autostart << 'AUTOSTARTEOF'
xset s off
xset s noblank
xset -dpms
unclutter -idle 0.5 -root &
xbindkeys &
xmodmap -e "keysym KP_1 = Return"
/home/pi/fix-chromium.sh &
AUTOSTARTEOF
chmod 755 /home/pi/.config/openbox/autostart

cat > /home/pi/.xbindkeysrc << 'XBINDEOF'
"/home/pi/restart-chromium.sh"
    Num_Lock
XBINDEOF

cat > /home/pi/restart-chromium.sh << 'RESTARTEOF'
#!/bin/bash
pkill -x chromium
RESTARTEOF
chmod 755 /home/pi/restart-chromium.sh

# --remote-debugging-port=9222 from day one -- forgetting this was its own bug on 2026-08-20
# (chromium-watchdog's healthcheck fails forever without it, looking like a crash loop). The
# while-loop here waits out slow WiFi on its own, same reasoning as stage 2 below -- if
# Xorg/chromium aren't installed yet by the time this first runs, `chromium` just fails and the
# loop retries every 2s until stage 2 finishes installing it and reboots.
cat > /home/pi/fix-chromium.sh << 'CHROMEEOF'
#!/bin/bash
for i in $(seq 1 30); do
  ping -c1 -W2 8.8.8.8 >/dev/null 2>&1 && break
  sleep 2
done
while true; do
  chromium \
    --remote-debugging-port=9222 --noerrdialogs \
    --disable-infobars \
    --disable-background-networking \
    --kiosk \
    --no-first-run \
    --disable-session-crashed-bubble \
    --disable-restore-session-state \
    "https://dp-kds.vercel.app/?screen=kitchen"
  sleep 2
done
CHROMEEOF
chmod 755 /home/pi/fix-chromium.sh

# --- v7 failsafe bundle, baked in from boot one (see pi-kiosk-failsafes/ in the DP-KDS repo,
#     commit 1f472ec, for the source of truth -- these are embedded verbatim) ---

cat > /home/pi/alert.sh << 'ALERTEOF'
#!/bin/bash
TOPIC="dpkds-kiosk-0d13f59d64cb"
TITLE="${1:-DP-KDS alert}"
MSG="${2:-}"
curl -s -m 10 \
  -H "Title: $TITLE" \
  -H "Priority: high" \
  -H "Tags: warning" \
  -d "$MSG" \
  "https://ntfy.sh/$TOPIC" >/dev/null 2>&1
ALERTEOF
chmod 755 /home/pi/alert.sh

cat > /home/pi/tailscale-watchdog.sh << 'TSWEOF'
#!/bin/bash
LOG=/home/pi/tailscale-watchdog.log
DIAG_LOG=/home/pi/tailscale-watchdog-diag.log
DIAG_MAX_BYTES=524288
PEER=100.123.176.96
STATE=/home/pi/.tailscale-watchdog-fails
REBOOT_STATE=/home/pi/.tailscale-watchdog-reboots
GIVEUP_ALERT_STAMP=/home/pi/.tailscale-watchdog-last-giveup-alert
MAX_REBOOTS=3
ALERT=/home/pi/alert.sh

log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }
alert() { [ -x "$ALERT" ] && "$ALERT" "$1" "$2" >/dev/null 2>&1 & }

capture_diag() {
  {
    echo "=== $(date '+%Y-%m-%d %H:%M:%S') diagnostic snapshot (check #$FAILS) ==="
    echo "--- nmcli device status ---"
    nmcli device status 2>&1
    echo "--- wlan0 detail ---"
    nmcli -t -f GENERAL.STATE,GENERAL.REASON,IP4.ADDRESS device show wlan0 2>&1
    echo "--- interface ownership ---"
    systemctl is-active wpa_supplicant 2>&1 | sed 's/^/wpa_supplicant: /'
    systemctl is-active NetworkManager 2>&1 | sed 's/^/NetworkManager: /'
    echo "--- NetworkManager journal (last 10 min) ---"
    journalctl -u NetworkManager --no-pager --since '10 min ago' 2>&1
    echo
  } >> "$DIAG_LOG"
  if [ "$(wc -c < "$DIAG_LOG" 2>/dev/null || echo 0)" -gt "$DIAG_MAX_BYTES" ]; then
    tail -c "$DIAG_MAX_BYTES" "$DIAG_LOG" > "$DIAG_LOG.tmp" && mv "$DIAG_LOG.tmp" "$DIAG_LOG"
  fi
}

check_ok() { tailscale ping -c 1 --timeout=5s "$PEER" >/dev/null 2>&1; }

if check_ok; then
  rm -f "$STATE" "$REBOOT_STATE"
  exit 0
fi

sleep 30
if check_ok; then
  rm -f "$STATE" "$REBOOT_STATE"
  exit 0
fi

FAILS=$(cat "$STATE" 2>/dev/null || echo 0)
FAILS=$((FAILS + 1))
echo "$FAILS" > "$STATE"

if [ "$FAILS" -ge 10 ]; then
  REBOOTS=$(cat "$REBOOT_STATE" 2>/dev/null || echo 0)
  capture_diag
  if [ "$REBOOTS" -ge "$MAX_REBOOTS" ]; then
    NOW=$(date +%s)
    LAST=$(cat "$GIVEUP_ALERT_STAMP" 2>/dev/null || echo 0)
    if [ $((NOW - LAST)) -ge 3600 ]; then
      log "still unreachable after $REBOOTS reboots + $FAILS checks -- giving up on auto-reboot, needs on-site attention"
      alert "KDS $(hostname) still down" "Rebooted $REBOOTS times, still can't reach Tailscale. Giving up on auto-reboot -- needs on-site check. See tailscale-watchdog-diag.log."
      echo "$NOW" > "$GIVEUP_ALERT_STAMP"
    fi
    sudo /usr/sbin/ip link set wlan0 down
    sleep 3
    sudo /usr/sbin/ip link set wlan0 up
    sleep 5
    sudo /usr/bin/systemctl restart tailscaled
    echo 0 > "$STATE"
  else
    REBOOTS=$((REBOOTS + 1))
    echo "$REBOOTS" > "$REBOOT_STATE"
    log "still unreachable after $FAILS checks (~$((FAILS * 3)) min), rebooting (attempt $REBOOTS/$MAX_REBOOTS)"
    alert "KDS $(hostname) rebooting" "Tailscale unreachable for ~$((FAILS * 3)) min. Reboot attempt $REBOOTS/$MAX_REBOOTS."
    echo 0 > "$STATE"
    sudo /sbin/reboot
    exit 0
  fi
elif [ "$FAILS" -ge 2 ]; then
  log "still unreachable (check #$FAILS), bouncing wlan0 + restarting tailscaled"
  capture_diag
  sudo /usr/sbin/ip link set wlan0 down
  sleep 3
  sudo /usr/sbin/ip link set wlan0 up
  sleep 5
  sudo /usr/bin/systemctl restart tailscaled
else
  log "peer unreachable (check #$FAILS), restarting tailscaled"
  sudo /usr/bin/systemctl restart tailscaled
fi

sleep 10
if check_ok; then
  log "recovered on check #$FAILS"
  if [ "$(cat "$REBOOT_STATE" 2>/dev/null || echo 0)" -gt 0 ]; then
    alert "KDS $(hostname) recovered" "Tailscale reachable again after $FAILS checks and $(cat "$REBOOT_STATE") reboot(s)."
  fi
  rm -f "$STATE" "$REBOOT_STATE"
fi
TSWEOF
chmod 755 /home/pi/tailscale-watchdog.sh

cat > /home/pi/chromium-watchdog.sh << 'CWEOF'
#!/bin/bash
LOG=/home/pi/chromium-watchdog.log
EXPECTED_ORIGIN="https://dp-kds.vercel.app"
GRACE_SECONDS=45
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }

OLDEST_PID=$(pgrep -x chromium -o 2>/dev/null)
[ -z "$OLDEST_PID" ] && exit 0

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
CWEOF
chmod 755 /home/pi/chromium-watchdog.sh

cat > /home/pi/hdmi-watchdog.sh << 'HDMIEOF'
#!/bin/bash
LOG=/home/pi/hdmi-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }
command -v xrandr >/dev/null 2>&1 || exit 0
export DISPLAY=:0
export XAUTHORITY=$(find /tmp -maxdepth 1 -name 'serverauth.*' 2>/dev/null | head -1)
[ -z "$XAUTHORITY" ] && exit 0
xrandr --query >/dev/null 2>&1 || exit 0
CONNECTED=$(xrandr --query | grep ' connected' | awk '{print $1}')
ACTIVE=$(xrandr --listactivemonitors | awk 'NR>1{print $NF}')
for out in $CONNECTED; do
  if ! grep -qx "$out" <<< "$ACTIVE"; then
    log "output $out connected but inactive, forcing --auto"
    xrandr --output "$out" --auto
  fi
done
HDMIEOF
chmod 755 /home/pi/hdmi-watchdog.sh

cat > /home/pi/power-watchdog.sh << 'PWEOF'
#!/bin/bash
LOG=/home/pi/power-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }
command -v vcgencmd >/dev/null 2>&1 || exit 0
FLAGS=$(vcgencmd get_throttled 2>/dev/null | grep -oE '0x[0-9a-fA-F]+')
[ -z "$FLAGS" ] && exit 0
[ "$FLAGS" = "0x0" ] && exit 0
log "throttled=$FLAGS (undervoltage/throttle/frequency-cap event -- see 'vcgencmd get_throttled' bit reference for decoding)"
PWEOF
chmod 755 /home/pi/power-watchdog.sh

cat > /home/pi/session-watchdog.sh << 'SESSEOF'
#!/bin/bash
LOG=/home/pi/session-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }
systemctl is-active --quiet lightdm 2>/dev/null || exit 0
UPTIME=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 0)
[ "$UPTIME" -lt 120 ] && exit 0
pgrep -u pi -x 'labwc|openbox|wayfire' >/dev/null 2>&1 && exit 0
log "lightdm active, system up ${UPTIME}s, but no WM session running for pi -- restarting lightdm"
sudo systemctl restart lightdm
SESSEOF
chmod 755 /home/pi/session-watchdog.sh

cat > /home/pi/wifi-signal-log.sh << 'WSLEOF'
#!/bin/bash
LOG=/home/pi/wifi-signal.log
IFACE=wlan0
WIRELESS_LINE=$(grep "^ *$IFACE:" /proc/net/wireless 2>/dev/null)
if [ -z "$WIRELESS_LINE" ]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') no data for $IFACE" >> "$LOG"
  exit 0
fi
QUALITY=$(echo "$WIRELESS_LINE" | awk '{print $3}' | tr -d '.')
LEVEL=$(echo "$WIRELESS_LINE" | awk '{print $4}' | tr -d '.')
RETRY=$(echo "$WIRELESS_LINE" | awk '{print $9}')
ACTIVE_AP=$(nmcli -t -f active,freq,rate device wifi list --rescan no 2>/dev/null | grep '^yes:')
FREQ=$(echo "$ACTIVE_AP" | cut -d: -f2)
RATE=$(echo "$ACTIVE_AP" | cut -d: -f3)
echo "$(date '+%Y-%m-%d %H:%M:%S') quality=${QUALITY:-?}/70 level=${LEVEL:-?}dBm retries=${RETRY:-0} freq=${FREQ:-?} rate=${RATE:-?}" >> "$LOG"
LINES=$(wc -l < "$LOG" 2>/dev/null || echo 0)
if [ "$LINES" -gt 15000 ]; then
  tail -n 10000 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi
WSLEOF
chmod 755 /home/pi/wifi-signal-log.sh

cat > /home/pi/wifi-auth-watchdog.sh << 'WAWEOF'
#!/bin/bash
LOG=/home/pi/wifi-auth-watchdog.log
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }
STATE=$(nmcli -t -f DEVICE,STATE,CONNECTION device status 2>/dev/null | grep '^wlan0:')
CONN_STATE=$(echo "$STATE" | cut -d: -f2)
[ -z "$STATE" ] && { log "no wlan0 device found, skipping"; exit 0; }
[ "$CONN_STATE" = "connected" ] && exit 0
log "wlan0 state=$CONN_STATE, not connected -- intervening"
for proc in nm-applet nm-connection-editor polkit-gnome-authentication-agent-1 polkit-mate-authentication-agent-1 lxpolkit xfce-polkit; do
  if pgrep -x "$proc" >/dev/null 2>&1; then
    log "killing stray $proc"
    pkill -x "$proc"
  fi
done
for pid in $(pgrep -f 'polkit|authentication-agent' 2>/dev/null); do
  cmd=$(ps -o comm= -p "$pid" 2>/dev/null)
  [ -z "$cmd" ] && continue
  log "killing stray auth-agent-like process: $cmd (pid $pid)"
  kill "$pid" 2>/dev/null
done
WIFI_CONN=$(nmcli -t -f NAME,TYPE connection show 2>/dev/null | grep ':802-11-wireless$' | head -1 | cut -d: -f1)
if [ -n "$WIFI_CONN" ]; then
  log "forcing 'nmcli connection up $WIFI_CONN'"
  sudo nmcli connection up "$WIFI_CONN" >>"$LOG" 2>&1
else
  log "no wifi connection profile found"
fi
WAWEOF
chmod 755 /home/pi/wifi-auth-watchdog.sh

cat > /home/pi/disk-watchdog.sh << 'DISKEOF'
#!/bin/bash
LOG=/home/pi/disk-watchdog.log
THRESHOLD=85
USE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
if [ "$USE" -ge "$THRESHOLD" ]; then
  rm -rf /home/pi/.config/chromium/BrowserMetrics/* /home/pi/.config/chromium/"Crash Reports"/*
  echo "$(date '+%Y-%m-%d %H:%M:%S') disk at ${USE}%, cleared BrowserMetrics + Crash Reports" >> "$LOG"
fi
DISKEOF
chmod 755 /home/pi/disk-watchdog.sh

chown pi:pi /home/pi/*.sh /home/pi/.bash_profile /home/pi/.xinitrc /home/pi/.xbindkeysrc \
  /home/pi/.config/openbox/autostart

# PulseAudio as a per-user systemd service -- Kitchen is the only station with a speaker, and
# this board needs it enabled explicitly (a card that started life as Drinks/Expo never has
# this, per the 2026-08-20 lesson). Needs linger so the user manager (and therefore its
# sockets/default targets) exists even before the first real console login. loginctl/systemctl
# --user here are pure local state changes, no network needed, safe in stage 1.
loginctl enable-linger pi 2>/dev/null || true
install -d -m 755 -o pi -g pi /run/user/1000 2>/dev/null || true
sudo -u pi XDG_RUNTIME_DIR=/run/user/1000 systemctl --user enable pulseaudio.socket pulseaudio.service 2>/dev/null || true

# Cron: pi's own crontab, matching the rest of the fleet. `crontab` just writes the spool file --
# no daemon interaction needed, safe here in stage 1 (cron itself only needs to be running when a
# job's schedule actually fires, not when it's installed).
crontab -u pi - << 'CRONEOF'
*/3 * * * * /home/pi/tailscale-watchdog.sh
*/2 * * * * /home/pi/hdmi-watchdog.sh
*/5 * * * * /home/pi/power-watchdog.sh
* * * * * /home/pi/chromium-watchdog.sh
* * * * * /home/pi/wifi-signal-log.sh
*/2 * * * * /home/pi/wifi-auth-watchdog.sh
*/2 * * * * /home/pi/session-watchdog.sh
*/15 * * * * /home/pi/disk-watchdog.sh
CRONEOF

# Hardware watchdog: this board's BCM chip ignores the requested timeout and hardwires 60s
# regardless -- see install-failsafes.sh for the confirmation via `wdctl`. Just the file edit
# here (no daemon-reexec needed) -- takes effect on the next real boot, which stage 2 below
# triggers anyway once it finishes.
if [ -e /dev/watchdog ]; then
  sed -i 's/^#\?RuntimeWatchdogSec=.*/RuntimeWatchdogSec=60s/' /etc/systemd/system.conf
fi

# Stage 2 -- deferred to the first NORMAL boot, when NetworkManager has real connectivity.
# ONLY the things that truly need internet: apt-get installs + Tailscale. Everything else is
# already in place from stage 1 above, so a slow/flaky WiFi connection just delays Chromium
# actually launching (fix-chromium.sh's own retry loop handles that) -- it never blocks on a
# login prompt or leaves the board in a half-configured state waiting on human input.
cat > /usr/local/sbin/kds-provision-stage2.sh << 'STAGE2EOF'
#!/bin/bash
exec > /home/pi/stage2-provision.log 2>&1
set -x

# Wait for real internet (up to ~10 min -- restaurant WiFi association can be slow after a
# fresh boot; confirmed the hard way 2026-09-05 that a 2-minute wait wasn't enough, and this
# script used to plow ahead into a doomed apt-get anyway, self-disabling despite installing
# nothing at all -- Kitchen sat at a bare login shell with no Xorg/chromium for exactly this
# reason).
NETWORK_OK=0
for i in $(seq 1 300); do
  if ping -c1 -W2 8.8.8.8 >/dev/null 2>&1; then
    NETWORK_OK=1
    break
  fi
  sleep 2
done

if [ "$NETWORK_OK" -ne 1 ]; then
  echo "no network after 10 min -- leaving stage2 service enabled, will retry on next boot"
  exit 1
fi

export DEBIAN_FRONTEND=noninteractive
INSTALL_OK=0
for attempt in 1 2 3; do
  apt-get update && apt-get install -y xserver-xorg xinit openbox chromium chromium-common chromium-sandbox \
    rpi-chromium-mods unclutter xbindkeys xdotool pulseaudio pulseaudio-utils alsa-utils && { INSTALL_OK=1; break; }
  sleep 15
done

if [ "$INSTALL_OK" -ne 1 ]; then
  echo "apt-get install failed after 3 attempts -- leaving stage2 service enabled, will retry on next boot"
  exit 1
fi
which startx Xorg openbox chromium

# Tailscale -- missed entirely in the first version of this script (confirmed the hard way
# 2026-09-05: a freshly re-flashed board never appeared on Tailscale because the binary
# simply wasn't there -- the original boards only had it because it was installed by hand
# months before this script existed). `tailscale up` itself needs an interactive login (no
# reusable authkey on file), so that part stays a manual follow-up over LAN SSH.
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
systemctl enable --now tailscaled

# psk-flags=0 (secret stored in the connection file, not agent-owned) -- already true since
# stage 1 wrote the keyfiles with psk= directly, but force it explicitly to match install-
# failsafes.sh's own defense-in-depth for any profile that might get recreated later. Needs
# nmcli/a live NetworkManager, hence down here in stage 2 rather than stage 1.
for c in $(nmcli -t -f NAME,TYPE connection show 2>/dev/null | grep ':802-11-wireless$' | cut -d: -f1); do
  nmcli connection modify "$c" wifi-sec.psk-flags 0 2>/dev/null || true
done

date '+%Y-%m-%d %H:%M:%S' > /home/pi/.failsafe-v7-installed
echo "stage2 provisioning completed successfully" >> /home/pi/stage2-provision.log

# Self-cleanup -- never run again after this.
systemctl disable kds-provision-stage2.service 2>/dev/null || true
rm -f /etc/systemd/system/kds-provision-stage2.service /usr/local/sbin/kds-provision-stage2.sh

sleep 5
reboot
STAGE2EOF
chmod 755 /usr/local/sbin/kds-provision-stage2.sh

cat > /etc/systemd/system/kds-provision-stage2.service << 'UNITEOF'
[Unit]
Description=DP-KDS Kitchen kiosk stage-2 provisioning (runs once on first real boot)
After=network-online.target
Wants=network-online.target

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/kds-provision-stage2.sh
RemainAfterExit=yes
TimeoutStartSec=900

[Install]
WantedBy=multi-user.target
UNITEOF
systemctl enable kds-provision-stage2.service

echo "firstrun.sh (stage 1) completed successfully" >> /boot/firmware/firstrun.log

rm -f /boot/firmware/firstrun.sh
sed -i 's| systemd\.[^ ]*||g' /boot/firmware/cmdline.txt
exit 0
