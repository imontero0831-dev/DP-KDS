#!/bin/bash
# firstrun.sh for provisioning Expo (kds-expo)'s microSD from a fresh stock image,
# via Raspberry Pi Imager's --first-run-script flag.
#
# Why this exists: the Expo card was only ever provisioned by an early stub firstrun.sh that set
# user/hostname/SSH and a single (restaurant-only) WiFi profile and nothing else -- no console
# autologin, no openbox/chromium kiosk, no watchdogs, no Tailscale, no ForAllTheDogs fallback.
# This brings it to full parity with Kitchen (kds-display-3) and Drinks (kds-display-2): same
# two-stage recipe, same failsafe bundle, just hostname kds-expo and the ?screen=expo kiosk URL.
# Like Drinks, this station has no speaker, so no PulseAudio.
#
# Two-stage design, because firstrun.sh runs under a minimal systemd.run target with NO network
# services up yet:
#   Stage 1 (this script): everything that doesn't actually need a network connection --
#     user/hostname/SSH/WiFi-as-static-files, console autologin, all watchdog scripts, cron,
#     openbox/chromium launch config -- plus writing + enabling a oneshot systemd service for
#     stage 2. This is deliberately almost everything: the first version of this script only put
#     user/hostname/SSH/WiFi here and left autologin + all the config files in stage 2, which
#     meant a board sat at an interactive password prompt until WiFi came up -- confirmed the
#     hard way 2026-09-05 that restaurant WiFi association can take longer than expected, and a
#     kiosk with no keyboard/mouse has no business ever showing a login prompt at all.
#   Stage 2 (embedded below, runs once on the FIRST NORMAL boot after this, when NetworkManager
#     has actually brought wlan0 up): ONLY the things that truly require internet -- apt-get
#     installs and the Tailscale install. Everything else is already in place by the time this
#     runs, so the worst case if WiFi is slow is a blank/incomplete kiosk screen, never a login
#     prompt.
#
# Usage (unmount the card first, then target its raw disk):
#   /Applications/Raspberry\ Pi\ Imager.app/Contents/MacOS/rpi-imager --cli \
#     --first-run-script pi-kiosk-failsafes/kds-expo-firstrun.sh \
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
# pi user by hand above does NOT satisfy this separate check -- confirmed the hard way 2026-09-05
# on Kitchen's board. Hash is `echo '110965.Ps' | openssl passwd -6 -stdin` (matches the same
# password set via chpasswd above, so credentials stay consistent either way).
echo 'pi:$6$Co5y33tmyThsTOcd$n5Pk6c6F37x/h2y9OpEkzC8KlsV7V1kx9Q4Cauuni8EkdgCDEw2bfe/6Mx/Hy0qIYIhQWw6bdrzcgIB8r6rzo0' > /boot/firmware/userconf.txt

raspi-config nonint do_hostname kds-expo
raspi-config nonint do_ssh 0
# Some Pi WiFi chips stay rfkill-blocked until a country code is set, independent of the
# cfg80211.ieee80211_regdom= kernel cmdline arg. do_wifi_country doesn't hang (unlike
# do_wifi_ssid_passphrase, which needs live NetworkManager D-Bus access not available yet here).
raspi-config nonint do_wifi_country US
rfkill unblock wifi || true

# No lightdm on this board (matches its own prior setup) -- console autologin + a
# .bash_profile startx hook instead. Writing the getty drop-in directly instead of
# `raspi-config nonint do_boot_behaviour B2` -- confirmed the hard way 2026-09-05 that command
# needs a live systemd/D-Bus session to actually apply (same category of gotcha as
# do_wifi_ssid_passphrase above), so it silently failed to take effect when run in this offline
# stage. A plain file write has no such dependency.
install -d -m 755 /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'AUTOLOGINEOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I $TERM
AUTOLOGINEOF

# Belt-and-suspenders on the above: confirmed 2026-09-05 that this exact drop-in, written here in
# stage 1 and verified byte-correct in firstrun.log with no error, was GONE from the filesystem
# after a real boot -- board came up to an interactive "kds-expo login:" prompt with no
# keyboard attached to answer it. Everything else stage 1 wrote in this same run (sudoers, both
# NetworkManager keyfiles, hostname) survived fine, so this isn't a wholesale rollback -- something
# specific to console/tty config removed just this directory on a later boot. Prime suspect: a
# Recommends-pulled package from stage 2's `apt-get install xserver-xorg ...` (no
# --no-install-recommends was used) running a postinst that resets tty1's getty config, since that's
# the only thing that runs after stage 1 and before the board was next observed. Rather than chase
# the exact package, make autologin unconditionally self-healing instead: a tiny oneshot that
# rewrites this same drop-in fresh on every single boot, ordered before getty@tty1 even starts, so
# it doesn't matter what removes it -- there is no keyboard on this board to ever answer that prompt.
cat > /usr/local/sbin/ensure-tty1-autologin.sh << 'ENSUREEOF'
#!/bin/bash
install -d -m 755 /etc/systemd/system/getty@tty1.service.d
cat > /etc/systemd/system/getty@tty1.service.d/autologin.conf << 'AUTOLOGINEOF'
[Service]
ExecStart=
ExecStart=-/sbin/agetty --autologin pi --noclear %I $TERM
AUTOLOGINEOF
ENSUREEOF
chmod 755 /usr/local/sbin/ensure-tty1-autologin.sh

cat > /etc/systemd/system/ensure-tty1-autologin.service << 'UNITEOF2'
[Unit]
Description=Re-assert tty1 console autologin drop-in before every getty start
After=local-fs.target
Before=getty@tty1.service

[Service]
Type=oneshot
ExecStart=/usr/local/sbin/ensure-tty1-autologin.sh
RemainAfterExit=yes

[Install]
WantedBy=getty.target
UNITEOF2
systemctl enable ensure-tty1-autologin.service

install -o pi -g pi -m 700 -d /home/pi/.ssh
cat > /home/pi/.ssh/authorized_keys << 'KEYEOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIuTSj0oEMtHqrhPqlaANFE72gCZk5LU/b9Yag2nVc/c claude-code-dpkds-fleet
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIAkZIxelLukrvKfxM11iY5/Sq0NS8sMejqM5Ejdr681 mac-mini-to-kds
KEYEOF
chown pi:pi /home/pi/.ssh/authorized_keys
chmod 600 /home/pi/.ssh/authorized_keys

# WiFi as NetworkManager keyfiles instead of `raspi-config nonint do_wifi_ssid_passphrase`
# (hangs at this boot stage). Restaurant WiFi as the preferred network, plus the same fallback
# hotspot the rest of the fleet is configured with. Deliberately ONE mechanism only
# (NetworkManager) -- see the wpa_supplicant.service masking below for why.
install -d -m 700 /etc/NetworkManager/system-connections
cat > /etc/NetworkManager/system-connections/preconfigured.nmconnection << 'NMEOF'
[connection]
id=preconfigured
uuid=1EE83316-3A2F-4E62-B72D-2C8C0FBD2831
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
uuid=A01CEEED-8E94-4A38-A4BA-EA13ECB1CE80
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
# rootfs -- so it would start, fail immediately with no config, and keep retrying, repeatedly
# contending with NetworkManager for wlan0. disable alone (drop the multi-user.target.wants
# symlink) fixes that. Confirmed 2026-09-05 via live journal capture on Drinks' board that also
# masking it was wrong: mask replaces the unit with a /dev/null symlink, which blocks systemd from
# ever starting it again for ANY reason -- including NetworkManager's own on-demand D-Bus
# activation of wpa_supplicant as its wifi backend. Every wlan0 connection attempt failed with
# "Couldn't initialize supplicant interface: Failed to D-Bus activate wpa_supplicant service" until
# NetworkManager gave up and reported the device as unavailable -- looked exactly like a dead radio,
# wasn't. disable only; do not mask.
systemctl disable wpa_supplicant.service 2>/dev/null || true

# Passwordless sudo for pi -- confirmed missing 2026-09-05 via wifi-auth-watchdog.log, which
# showed every single recovery attempt failing with "sudo: a password is required" for the
# card's entire run. The original boards all have this (see reference_dpkds_kiosk_pi_fleet.md);
# it was simply never carried into this re-provisioning script. Every watchdog script's sudo
# calls are silently useless without this.
cat > /etc/sudoers.d/010_pi-nopasswd << 'SUDOEOF'
pi ALL=(ALL) NOPASSWD:ALL
SUDOEOF
chmod 0440 /etc/sudoers.d/010_pi-nopasswd
chown root:root /etc/sudoers.d/010_pi-nopasswd

# Second WiFi bring-up path via cloud-init's own network-config (netplan format) -- this image
# already ships a `ds=nocloud` cloud-init datasource (confirmed via cmdline.txt) with dsmode
# "local", meaning cloud-init applies this before/alongside first boot regardless. The
# NetworkManager keyfiles above are the officially-documented approach and should be sufficient
# on their own, but wifi-signal.log showed wlan0 never appearing in /proc/net/wireless at all
# after 2026-09-05's fresh re-flash (not a slow-association issue -- the interface itself never
# came up), and this is a second, independent mechanism worth having in place at the same time
# in case the keyfile path alone isn't what actually brings the radio up on this hardware.
cat > /boot/firmware/network-config << 'NETCFGEOF'
network:
  version: 2
  wifis:
    wlan0:
      dhcp4: true
      optional: true
      access-points:
        "ATTiGiwtdS":
          password: "9ss4?2p2sufd"
        "ForAllTheDogs":
          password: "chicago23"
NETCFGEOF

cat > /home/pi/.bash_profile << 'PROFEOF'
if [ -z "$DISPLAY" ] && [ "$(tty)" = "/dev/tty1" ]; then
  startx
fi
PROFEOF

cat > /home/pi/.xinitrc << 'XINITEOF'
exec openbox-session
XINITEOF

# -o pi -g pi on BOTH path components: `install -d` running as root here would otherwise leave
# /home/pi/.config itself root-owned, and chromium (running as pi) then can't create its
# crash-handler dir under it -- it aborts on every launch with "mkdir: Permission denied" ->
# NOTREACHED -> zygote dies, ~30x/min inside fix-chromium.sh's respawn loop, giving a
# permanently blank screen with no console text. Confirmed the hard way on Drinks 2026-09-05.
install -d -m 755 -o pi -g pi /home/pi/.config /home/pi/.config/openbox
cat > /home/pi/.config/openbox/autostart << 'AUTOSTARTEOF'
xset s off
xset s noblank
xset -dpms
unclutter -idle 0.5 -root &
xbindkeys &
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

# --remote-debugging-port=9222 from day one -- forgetting this on Kitchen's original setup was
# its own bug (chromium-watchdog's healthcheck fails forever without it, looking like a crash
# loop). The while-loop here waits out slow WiFi on its own, same reasoning as stage 2 below --
# if Xorg/chromium aren't installed yet by the time this first runs, `chromium` just fails and
# the loop retries every 2s until stage 2 finishes installing it and reboots.
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
    "https://dp-kds.vercel.app/?screen=expo"
  sleep 2
done
CHROMEEOF
chmod 755 /home/pi/fix-chromium.sh

# --- v8 failsafe bundle, baked in from boot one (see pi-kiosk-failsafes/ in the DP-KDS repo,
#     commit 1f472ec, for the source of truth -- these are embedded verbatim) ---

cat > /home/pi/alert.sh << 'ALERTEOF'
#!/bin/bash
TOPIC="dpkds-kiosk-0d13f59d64cb"
TITLE="${1:-DP-KDS alert}"
MSG="${2:-}"
curl -s -m 10 \
  -H "Title: $TITLE" \
  -H "Priority: ${3:-high}" \
  -H "Tags: ${4:-warning}" \
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
if [ -r /home/pi/reboot-budget.sh ]; then . /home/pi/reboot-budget.sh; else
  reboot_allowed() { return 0; }; record_reboot() { :; }
fi

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
  elif ! reboot_allowed; then
    NOW=$(date +%s)
    LAST=$(cat "$GIVEUP_ALERT_STAMP" 2>/dev/null || echo 0)
    if [ $((NOW - LAST)) -ge 3600 ]; then
      log "would reboot (check #$FAILS) but shared reboot budget spent -- lighter recovery + alert"
      alert "KDS $(hostname) needs hands" "Tailscale unreachable ~$((FAILS * 3)) min and the shared reboot budget is spent (3/6h). Not rebooting again."
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
    record_reboot "tailscale unreachable ~$((FAILS * 3))min"
    echo 0 > "$STATE"
    sync
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

# reboot-budget.sh + kiosk-health.sh -- v8 additions. See pi-kiosk-failsafes/
# in the DP-KDS repo for the annotated source; embedded verbatim here.
cat > /home/pi/reboot-budget.sh << 'RBEOF'
#!/bin/bash
# Shared reboot budget for every KDS watchdog. This file is SOURCED, not run.
#
# The failure it exists to prevent: 2026-09-02/04, tailscale-watchdog.sh
# power-cycled kds-display-2 1146 times over 29.5h because a WiFi fault it
# could not fix never cleared. That one watchdog now caps its own reboots
# per incident -- but nothing stopped two *different* watchdogs each
# rebooting 3x back to back, or a watchdog added later from repeating the
# same mistake from scratch. This is one budget they all draw from.
#
# Rule: at most $RB_MAX reboots per rolling $RB_WINDOW seconds, counted
# across ALL watchdogs combined, and the ledger deliberately lives under
# /home/pi so it SURVIVES the reboots it is counting (tailscale-watchdog's
# own per-incident counter resets on reboot -- that is a different, weaker
# guarantee). Once the budget is spent, reboot_allowed returns non-zero and
# the caller MUST fall back to alerting a human instead of rebooting again.
#
# Usage:
#   . /home/pi/reboot-budget.sh
#   if reboot_allowed; then
#     record_reboot "chromium crash-loop unrecovered 10min"
#     sync; sudo /sbin/reboot
#   else
#     "$ALERT" "KDS $(hostname) needs hands" "Reboot budget spent, still broken."
#   fi

RB_LEDGER=/home/pi/.reboot-ledger
RB_MAX=3
RB_WINDOW=21600          # 6 hours

# Number of reboots recorded in the last $RB_WINDOW seconds.
reboot_count_recent() {
  local now cutoff n=0 ts
  now=$(date +%s)
  cutoff=$((now - RB_WINDOW))
  [ -f "$RB_LEDGER" ] || { echo 0; return; }
  while read -r ts _; do
    case "$ts" in ''|*[!0-9]*) continue;; esac
    [ "$ts" -ge "$cutoff" ] && n=$((n + 1))
  done < "$RB_LEDGER"
  echo "$n"
}

# True (exit 0) while the fleet-wide budget still has room.
reboot_allowed() {
  [ "$(reboot_count_recent)" -lt "$RB_MAX" ]
}

# Append a reboot to the shared ledger. Call this immediately before
# `sudo reboot`, followed by `sync` so the line is on disk before the box
# goes down.
record_reboot() {
  local now
  now=$(date +%s)
  echo "$now $(date '+%Y-%m-%d %H:%M:%S') by=$(basename "${0:-unknown}") reason=${1:-unspecified}" >> "$RB_LEDGER"
  if [ "$(wc -l < "$RB_LEDGER" 2>/dev/null || echo 0)" -gt 50 ]; then
    tail -n 50 "$RB_LEDGER" > "$RB_LEDGER.tmp" && mv "$RB_LEDGER.tmp" "$RB_LEDGER"
  fi
}
RBEOF
chmod 755 /home/pi/reboot-budget.sh

cat > /home/pi/kiosk-health.sh << 'KHEOF'
#!/bin/bash
# kiosk-health.sh -- the "health brain". One 1-minute cron tick that runs
# every cheap probe, folds the results into a single severity, and drives a
# three-tier response. It is the layer the other watchdogs never had: they
# each react to one failure in isolation and only to a process EXITING.
# The 2026-09-05 Drinks outage was invisible to all of them because
# Chromium never exited -- fix-chromium.sh respawned it ~30x/min on a
# permanent permission fault (/home/pi/.config owned root:root), so from
# the outside "chromium" was always running, just never alive for more
# than ~2s. Nothing counted the restarts; nothing alerted; the screen was
# blank for hours.
#
# Tiers (least to most aggressive):
#   NOTICE   -> log + low-priority ntfy. "Something's off, screen probably
#               still up, look when you can." Never touches the machine.
#   DEGRADED -> one TARGETED self-heal of the failing component + high
#               ntfy. Re-checked on the next ticks; if it doesn't clear,
#               it escalates.
#   CRITICAL -> hard reboot, but ONLY within the shared reboot budget
#               (reboot-budget.sh: max 3 / 6h across all watchdogs). Budget
#               spent -> stop rebooting, fire a max-priority "needs on-site"
#               ntfy instead of looping the box to death (the mistake
#               tailscale-watchdog made in Sept).
#
# Alert noise control: alerts fire on STATE TRANSITIONS only, then re-fire
# at most every 30 min while still bad. The old chromium-watchdog logged
# 1000+ identical lines during the Sept reboot loop -- that must never
# reach the phone as 1000 pushes.
#
# Requires: fix-chromium.sh launching chromium with --remote-debugging-port=9222.

STATE_DIR=/home/pi/.kiosk-health
LOG=/home/pi/kiosk-health.log
ALERT=/home/pi/alert.sh
EXPECTED_ORIGIN="https://dp-kds.vercel.app"

BOOT_GRACE=90            # ignore everything for the first 90s after boot
CHROMIUM_HEALTHY_ETIMES=45   # an instance younger than this isn't "up" yet
CRASHLOOP_WINDOW=600         # 10 min
CRASHLOOP_NOTICE=4           # restarts in window while otherwise healthy
CRASHLOOP_DEGRADED=10        # restarts in window, no healthy instance
FASTCRASH_ETIMES=10          # "dies before it can finish starting"
FASTCRASH_MIN=3              # this many fast crashes = permanent fault
NO_HEALTHY_CRITICAL=600      # 10 min with no healthy chromium at all
HEAL_SETTLE=300             # give a heal 5 min to take before escalating
WIFI_DOWN_DEGRADED=300      # wlan0 down this long -> heal
WIFI_DOWN_CRITICAL=600      # ...still down this long -> reboot
DISK_DEGRADED=90
DISK_CRITICAL=96
LOADAVG_MULT=4              # load1 > cores * this = hot
LOAD_HOT_CRITICAL=600
TEMP_NOTICE=80             # deg C
REALERT_SECONDS=1800       # re-push an unchanged bad state every 30 min

mkdir -p "$STATE_DIR"
log() { echo "$(date '+%Y-%m-%d %H:%M:%S') $1" >> "$LOG"; }
# rotate our own log so a chatty incident can't fill the disk
if [ -f "$LOG" ] && [ "$(wc -c < "$LOG")" -gt 524288 ]; then
  tail -c 262144 "$LOG" > "$LOG.tmp" && mv "$LOG.tmp" "$LOG"
fi

sget() { cat "$STATE_DIR/$1" 2>/dev/null; }
sset() { echo "$2" > "$STATE_DIR/$1"; }
sclear() { rm -f "$STATE_DIR/$1"; }
now=$(date +%s)

# ---- gates --------------------------------------------------------------
# 1. Don't judge a box that's still provisioning. Stage 2 writes this marker
#    only after apt + Tailscale succeed and just before its final reboot, so
#    its absence means "kiosk software may not even be installed yet" -- a
#    reboot here would just interrupt apt. On an already-running Pi that
#    predates v8 the marker appears the moment install-failsafes.sh finishes,
#    so this brain stays dormant until the box is fully on the v8 bundle.
[ -f /home/pi/.failsafe-v8-installed ] || exit 0

# 2. Boot grace -- cold start (X, openbox, chromium, first page load) needs
#    more than a minute; don't start counting against it immediately.
UPTIME=$(awk '{print int($1)}' /proc/uptime 2>/dev/null || echo 9999)
if [ "$UPTIME" -lt "$BOOT_GRACE" ]; then
  exit 0
fi

# heartbeat -- proves this brain itself is still ticking
sset heartbeat "$now"

# ---- shared reboot budget ------------------------------------------------
if [ -r /home/pi/reboot-budget.sh ]; then
  . /home/pi/reboot-budget.sh
else
  # fallback if the shared helper isn't deployed yet: same 3-per-6h rule,
  # self-contained.
  RB_LEDGER=/home/pi/.reboot-ledger
  reboot_count_recent() {
    local c=0 t ct; ct=$((now - 21600)); [ -f "$RB_LEDGER" ] || { echo 0; return; }
    while read -r t _; do case "$t" in ''|*[!0-9]*) continue;; esac
      [ "$t" -ge "$ct" ] && c=$((c + 1)); done < "$RB_LEDGER"; echo "$c"
  }
  reboot_allowed() { [ "$(reboot_count_recent)" -lt 3 ]; }
  record_reboot() { echo "$now $(date '+%F %T') by=kiosk-health reason=${1:-?}" >> "$RB_LEDGER"; }
fi

# Overall severity accumulator: 0 OK, 1 NOTICE, 2 DEGRADED, 3 CRITICAL.
SEV=0
REASONS=""
bump() {   # bump <level> <reason>
  [ "$1" -gt "$SEV" ] && SEV="$1"
  REASONS="${REASONS:+$REASONS; }$2"
}

# =========================================================================
# 1. CHROMIUM CRASH-LOOP / LIVENESS
# =========================================================================
OLDEST_PID=$(pgrep -x chromium -o 2>/dev/null)
LAST_PID=$(sget chromium-pid)
STARTS_FILE="$STATE_DIR/chromium-starts"

# Detect a (re)start: the oldest chromium PID changed, or went missing and
# came back. Each transition to a new non-empty PID is one start.
if [ -n "$OLDEST_PID" ] && [ "$OLDEST_PID" != "$LAST_PID" ]; then
  echo "$now" >> "$STARTS_FILE"
  sset chromium-pid "$OLDEST_PID"
elif [ -z "$OLDEST_PID" ]; then
  sclear chromium-pid
fi

# Prune the starts ledger to the crash-loop window.
if [ -f "$STARTS_FILE" ]; then
  cutoff=$((now - CRASHLOOP_WINDOW))
  awk -v c="$cutoff" '$1 >= c' "$STARTS_FILE" > "$STARTS_FILE.tmp" 2>/dev/null \
    && mv "$STARTS_FILE.tmp" "$STARTS_FILE"
fi
RESTARTS=0
[ -f "$STARTS_FILE" ] && RESTARTS=$(wc -l < "$STARTS_FILE" | tr -d ' ')
[ -z "$RESTARTS" ] && RESTARTS=0

# Age of the current instance.
ETIMES=0
if [ -n "$OLDEST_PID" ]; then
  ETIMES=$(ps -o etimes= -p "$OLDEST_PID" 2>/dev/null | tr -d ' ')
  [ -z "$ETIMES" ] && ETIMES=0
fi

# Is chromium actually HEALTHY right now? (up past grace + debug port
# answers + a tab at our origin + that tab's title isn't a Chrome error
# page). Positive DOM canary is a later addition -- this is title-based and
# needs no websocket client on the Pi.
# CHROMIUM_ALIVE: process up + debug port answers + a tab at our origin
# exists. This is the "probably fine" bar. HEALTHY is stricter (adds the
# error-title check + the etimes>=45 maturity gate). The distinction
# matters for one specific safety property below: we NEVER reboot on
# "not HEALTHY" alone -- only on "not ALIVE" -- so a flaky title parse or
# an app that renames its own tab can't cause this brain to power-cycle a
# working kitchen screen mid-service.
CHROMIUM_ALIVE=0
HEALTHY=0
if [ -n "$OLDEST_PID" ] && curl -s --max-time 5 http://localhost:9222/json/version >/dev/null 2>&1; then
  TABS=$(curl -s --max-time 5 http://localhost:9222/json 2>/dev/null)
  ORIGIN_TAB=$(printf '%s' "$TABS" | tr ',' '\n' | grep -o "\"url\": *\"${EXPECTED_ORIGIN}[^\"]*\"" | head -1)
  TITLE_LINE=$(printf '%s' "$TABS" | tr '}' '\n' | grep -F "$EXPECTED_ORIGIN" | grep -o '"title": *"[^"]*"' | head -1)
  if [ -n "$ORIGIN_TAB" ]; then
    CHROMIUM_ALIVE=1
    if [ "$ETIMES" -ge "$CHROMIUM_HEALTHY_ETIMES" ]; then
      case "$TITLE_LINE" in
        *"is not available"*|*"can"?"t be reached"*|*"No internet"*|*"not available"*|*"took too long"*|*"HTTP ERROR"*|*"502"*|*"503"*|*"504"*)
          HEALTHY=0 ;;
        *)
          HEALTHY=1 ;;
      esac
    fi
  fi
fi

if [ "$CHROMIUM_ALIVE" -eq 1 ]; then
  sset chromium-last-alive "$now"
fi
if [ "$HEALTHY" -eq 1 ]; then
  sset chromium-last-healthy "$now"
  : > "$STARTS_FILE"                 # recovered -> forget the churn
  sclear chromium-heal-at
  RESTARTS=0
fi
LAST_HEALTHY=$(sget chromium-last-healthy)
[ -z "$LAST_HEALTHY" ] && LAST_HEALTHY=0
HEALTHY_AGE=$((now - LAST_HEALTHY))
[ "$LAST_HEALTHY" -eq 0 ] && HEALTHY_AGE=999999

LAST_ALIVE=$(sget chromium-last-alive)
[ -z "$LAST_ALIVE" ] && LAST_ALIVE=0
ALIVE_AGE=$((now - LAST_ALIVE))
# First run with no history: seed it to now so a genuinely-fine box that
# this brain has simply never observed yet doesn't count as "dead for
# ages". A truly broken chromium will fail the ALIVE check on this same
# tick and the age starts climbing for real from here.
if [ "$LAST_ALIVE" -eq 0 ]; then
  [ "$CHROMIUM_ALIVE" -eq 1 ] || sset chromium-last-alive "$now"
  ALIVE_AGE=0
fi

# --- fast-crash fingerprint: repeatedly dies before it can finish starting.
# This is the Drinks-bug shape. It never self-heals, so don't wait for the
# count to reach CRASHLOOP_DEGRADED -- act now.
FASTCRASH=0
if [ "$RESTARTS" -ge "$FASTCRASH_MIN" ] && [ "$ALIVE_AGE" -gt 120 ]; then
  if [ -z "$OLDEST_PID" ] || [ "$ETIMES" -lt "$FASTCRASH_ETIMES" ]; then
    FASTCRASH=1
  fi
fi

CHROMIUM_TIER=0
CHROMIUM_MSG=""
if [ "$ALIVE_AGE" -ge "$NO_HEALTHY_CRITICAL" ]; then
  # not even ALIVE (process/debug-port/origin-tab) for 10 min -> this is
  # the Drinks-outage state. Reboot (within budget).
  CHROMIUM_TIER=3
  CHROMIUM_MSG="chromium not alive for ${ALIVE_AGE}s (>${NO_HEALTHY_CRITICAL}), ${RESTARTS} restarts/10min"
elif [ "$FASTCRASH" -eq 1 ]; then
  CHROMIUM_TIER=2
  CHROMIUM_MSG="chromium fast-crash loop: ${RESTARTS} restarts/10min, current age ${ETIMES}s, never healthy -- config fault, won't self-recover"
elif [ "$RESTARTS" -ge "$CRASHLOOP_DEGRADED" ] && [ "$HEALTHY_AGE" -gt 120 ]; then
  CHROMIUM_TIER=2
  CHROMIUM_MSG="chromium crash loop: ${RESTARTS} restarts/10min, no healthy instance"
elif [ "$CHROMIUM_ALIVE" -eq 1 ] && [ "$HEALTHY_AGE" -ge "$NO_HEALTHY_CRITICAL" ]; then
  # alive but stuck (error page / never matured) for 10 min -- heal (which
  # reloads it), do NOT reboot: the box is otherwise fine.
  CHROMIUM_TIER=2
  CHROMIUM_MSG="chromium alive but not healthy for ${HEALTHY_AGE}s (stuck page?)"
elif [ "$RESTARTS" -ge "$CRASHLOOP_NOTICE" ]; then
  CHROMIUM_TIER=1
  CHROMIUM_MSG="chromium restarted ${RESTARTS}x/10min (currently $( [ "$HEALTHY" -eq 1 ] && echo healthy || echo 'not yet healthy'))"
elif [ "$CHROMIUM_ALIVE" -eq 1 ] && [ "$HEALTHY_AGE" -ge 300 ]; then
  CHROMIUM_TIER=1
  CHROMIUM_MSG="chromium alive but not confirmed-healthy for ${HEALTHY_AGE}s"
fi

# Act on the chromium tier. A DEGRADED chromium gets ONE targeted heal per
# HEAL_SETTLE window; it stays at bump 2 between heals. It escalates to
# CRITICAL on its own via the HEALTHY_AGE >= NO_HEALTHY_CRITICAL rule above
# (CHROMIUM_TIER=3) -- i.e. if 10 minutes pass with no healthy instance
# despite the heals, the RESPOND section reboots (within budget). No
# separate "heal didn't take" branch needed.
if [ "$CHROMIUM_TIER" -eq 3 ]; then
  bump 3 "$CHROMIUM_MSG"
elif [ "$CHROMIUM_TIER" -eq 2 ]; then
  HEAL_AT=$(sget chromium-heal-at)
  [ -z "$HEAL_AT" ] && HEAL_AT=0
  if [ $((now - HEAL_AT)) -ge "$HEAL_SETTLE" ]; then
    log "HEAL chromium: $CHROMIUM_MSG"
    pkill -x chromium 2>/dev/null
    sleep 2
    pkill -9 -x chromium 2>/dev/null
    rm -rf /home/pi/.config/chromium/Singleton* \
           /home/pi/.config/chromium/"Crash Reports"/* \
           /home/pi/.config/chromium/BrowserMetrics/* \
           /home/pi/.cache/chromium/* 2>/dev/null
    # Re-assert ownership -- the exact fault behind the Sept Drinks loop.
    # If it's back (OS update, bad chown, re-provision), fix it here so
    # fix-chromium.sh's next relaunch actually sticks.
    chown -R pi:pi /home/pi/.config /home/pi/.cache 2>/dev/null
    sset chromium-heal-at "$now"
    bump 2 "chromium heal fired ($CHROMIUM_MSG)"
  else
    bump 2 "chromium degraded, heal settling ($CHROMIUM_MSG)"
  fi
elif [ "$CHROMIUM_TIER" -eq 1 ]; then
  bump 1 "$CHROMIUM_MSG"
fi

# =========================================================================
# 2. WIFI  (health brain owns the ESCALATION; wifi-auth-watchdog still does
#    the every-2-min nmcli-up. Here we add rfkill/radio-bounce + reboot.)
# =========================================================================
WIFI_OK=0
if grep -q '^ *wlan0:' /proc/net/wireless 2>/dev/null; then
  WSTATE=$(nmcli -t -f DEVICE,STATE device status 2>/dev/null | grep '^wlan0:' | cut -d: -f2)
  [ "$WSTATE" = "connected" ] && WIFI_OK=1
fi
if [ "$WIFI_OK" -eq 1 ]; then
  sclear wifi-down-since
  sclear wifi-heal-at
else
  DOWN_SINCE=$(sget wifi-down-since)
  [ -z "$DOWN_SINCE" ] && { DOWN_SINCE="$now"; sset wifi-down-since "$now"; }
  DOWN_FOR=$((now - DOWN_SINCE))
  if [ "$DOWN_FOR" -lt 60 ]; then
    :   # single unlucky sample -- wait for it to persist one more tick
  elif [ "$DOWN_FOR" -ge "$WIFI_DOWN_CRITICAL" ]; then
    bump 3 "wlan0 down ${DOWN_FOR}s (>${WIFI_DOWN_CRITICAL})"
  elif [ "$DOWN_FOR" -ge "$WIFI_DOWN_DEGRADED" ]; then
    WHEAL=$(sget wifi-heal-at); [ -z "$WHEAL" ] && WHEAL=0
    if [ $((now - WHEAL)) -ge "$HEAL_SETTLE" ]; then
      log "HEAL wifi: wlan0 down ${DOWN_FOR}s -- rfkill unblock + radio bounce"
      sudo /usr/sbin/rfkill unblock wifi 2>/dev/null
      sudo nmcli radio wifi off 2>/dev/null; sleep 2; sudo nmcli radio wifi on 2>/dev/null
      WIFI_CONN=$(nmcli -t -f NAME,TYPE connection show 2>/dev/null | grep ':802-11-wireless$' | head -1 | cut -d: -f1)
      [ -n "$WIFI_CONN" ] && sudo nmcli connection up "$WIFI_CONN" >/dev/null 2>&1 &
      sset wifi-heal-at "$now"
    fi
    bump 2 "wlan0 down ${DOWN_FOR}s"
  else
    bump 1 "wlan0 down ${DOWN_FOR}s"
  fi
fi

# =========================================================================
# 3. DISK
# =========================================================================
USE=$(df / | tail -1 | awk '{print $5}' | tr -d '%')
[ -z "$USE" ] && USE=0
if [ "$USE" -ge "$DISK_CRITICAL" ]; then
  bump 3 "disk ${USE}%"
elif [ "$USE" -ge "$DISK_DEGRADED" ]; then
  log "HEAL disk: ${USE}% -- vacuum journal + clear chromium metrics"
  sudo journalctl --vacuum-size=50M >/dev/null 2>&1
  rm -rf /home/pi/.config/chromium/BrowserMetrics/* \
         /home/pi/.config/chromium/"Crash Reports"/* 2>/dev/null
  bump 2 "disk ${USE}%"
fi

# =========================================================================
# 4. LOAD  (sustained only)
# =========================================================================
CORES=$(nproc 2>/dev/null || echo 4)
LOAD1=$(awk '{print $1}' /proc/loadavg 2>/dev/null | cut -d. -f1)
[ -z "$LOAD1" ] && LOAD1=0
HOT=$((CORES * LOADAVG_MULT))
if [ "$LOAD1" -ge "$HOT" ]; then
  LHS=$(sget load-hot-since); [ -z "$LHS" ] && { LHS="$now"; sset load-hot-since "$now"; }
  if [ $((now - LHS)) -ge "$LOAD_HOT_CRITICAL" ]; then
    bump 3 "load ${LOAD1} (>${HOT}) sustained $((now - LHS))s"
  else
    bump 1 "load ${LOAD1} (>${HOT})"
  fi
else
  sclear load-hot-since
fi

# =========================================================================
# 5. TEMP  (notice only -- power-watchdog logs throttle flags separately)
# =========================================================================
if command -v vcgencmd >/dev/null 2>&1; then
  T=$(vcgencmd measure_temp 2>/dev/null | grep -o '[0-9]*\.[0-9]*' | cut -d. -f1)
  if [ -n "$T" ] && [ "$T" -ge "$TEMP_NOTICE" ]; then
    bump 1 "SoC temp ${T}C"
  fi
fi

# =========================================================================
# RESPOND
# =========================================================================
case "$SEV" in
  0) STATE_NAME=OK ;;
  1) STATE_NAME=NOTICE ;;
  2) STATE_NAME=DEGRADED ;;
  3) STATE_NAME=CRITICAL ;;
esac

PREV=$(sget state)
PREV_SEV=$(sget state-sev); [ -z "$PREV_SEV" ] && PREV_SEV=0
LAST_ALERT=$(sget last-alert); [ -z "$LAST_ALERT" ] && LAST_ALERT=0

send_alert() {   # send_alert <priority> <tags> <title> <msg>
  [ -x "$ALERT" ] || return 0
  "$ALERT" "$3" "$4" "$1" "$2" >/dev/null 2>&1 &
  sset last-alert "$now"
}

HOST=$(hostname)

if [ "$SEV" -eq 3 ]; then
  # CRITICAL: reboot within budget, else escalate to a human.
  if reboot_allowed; then
    log "CRITICAL: $REASONS -- rebooting (budget $(reboot_count_recent)/3 used)"
    send_alert urgent rotating_light "KDS $HOST rebooting" "CRITICAL: $REASONS. Auto-reboot ($(reboot_count_recent)/3 in 6h)."
    record_reboot "$REASONS"
    sset state CRITICAL; sset state-sev 3
    sync
    sleep 2
    sudo /sbin/reboot
    exit 0
  else
    # budget spent -- do NOT reboot again; nag hourly
    GIVEUP=$(sget giveup-alert); [ -z "$GIVEUP" ] && GIVEUP=0
    if [ $((now - GIVEUP)) -ge 3600 ]; then
      log "CRITICAL: $REASONS -- reboot budget SPENT, needs on-site"
      send_alert urgent rotating_light "KDS $HOST needs hands" "CRITICAL and reboot budget spent (3 reboots/6h). Not rebooting again. $REASONS"
      sset giveup-alert "$now"
    fi
    sset state CRITICAL; sset state-sev 3
    exit 0
  fi
fi

# NOTICE / DEGRADED / OK
if [ "$SEV" -ne "$PREV_SEV" ]; then
  # transition
  if [ "$SEV" -eq 0 ]; then
    log "recovered: back to OK (was $PREV)"
    [ "$PREV_SEV" -ge 2 ] && send_alert default white_check_mark "KDS $HOST recovered" "Back to normal (was $PREV)."
    sclear giveup-alert
  elif [ "$SEV" -eq 1 ]; then
    log "NOTICE: $REASONS"
    send_alert low eye "KDS $HOST -- heads up" "NOTICE: $REASONS. Screen probably still up; SSH in when you can."
  elif [ "$SEV" -eq 2 ]; then
    log "DEGRADED: $REASONS"
    send_alert high warning "KDS $HOST degraded" "DEGRADED: $REASONS. Auto-heal running; watching for recovery."
  fi
elif [ "$SEV" -ne 0 ] && [ $((now - LAST_ALERT)) -ge "$REALERT_SECONDS" ]; then
  # unchanged bad state -- re-nudge, but only every 30 min
  case "$SEV" in
    1) send_alert low eye "KDS $HOST still off" "Still NOTICE: $REASONS" ;;
    2) send_alert high warning "KDS $HOST still degraded" "Still DEGRADED: $REASONS" ;;
  esac
  log "$STATE_NAME (unchanged, re-alert): $REASONS"
fi

sset state "$STATE_NAME"
sset state-sev "$SEV"
exit 0
KHEOF
chmod 755 /home/pi/kiosk-health.sh


chown pi:pi /home/pi/*.sh /home/pi/.bash_profile /home/pi/.xinitrc /home/pi/.xbindkeysrc
chown -R pi:pi /home/pi/.config   # belt-and-suspenders for the root-owned-.config bug above

# Cron: pi's own crontab, matching the rest of the fleet. `crontab` just writes the spool file --
# no daemon interaction needed, safe here in stage 1 (cron itself only needs to be running when a
# job's schedule actually fires, not when it's installed).
crontab -u pi - << 'CRONEOF'
*/3 * * * * /home/pi/tailscale-watchdog.sh
* * * * * /home/pi/kiosk-health.sh
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
# fresh boot; confirmed the hard way 2026-09-05 on Kitchen's card that a 2-minute wait wasn't
# enough, and this script used to plow ahead into a doomed apt-get anyway, self-disabling
# despite installing nothing at all).
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
    rpi-chromium-mods unclutter xbindkeys xdotool && { INSTALL_OK=1; break; }
  sleep 15
done

if [ "$INSTALL_OK" -ne 1 ]; then
  echo "apt-get install failed after 3 attempts -- leaving stage2 service enabled, will retry on next boot"
  exit 1
fi
which startx Xorg openbox chromium

# Tailscale -- missed entirely in the first version of this script (confirmed the hard way
# 2026-09-05 on Kitchen's card: a freshly re-flashed board never appeared on Tailscale because
# the binary simply wasn't there -- the original boards only had it because it was installed
# by hand months before this script existed). `tailscale up` used to need a manual interactive
# login follow-up over LAN SSH every reflash (confirmed the hard way again 2026-09-06: a
# freshly re-flashed board sat in NeedsLogin state for 2 days getting reboot-looped by its
# own watchdog, which can't fix an auth problem no matter how many times it restarts). Now
# uses a reusable authkey generated from the admin console so this is unattended.
if ! command -v tailscale >/dev/null 2>&1; then
  curl -fsSL https://tailscale.com/install.sh | sh
fi
systemctl enable --now tailscaled
tailscale up --authkey=tskey-auth-kzoBvVwJBo11CNTRL-ZFYhnueLnmJoJA1Je43omJvHctfNSNHJ --hostname=kds-expo || true

# psk-flags=0 (secret stored in the connection file, not agent-owned) -- already true since
# stage 1 wrote the keyfiles with psk= directly, but force it explicitly to match install-
# failsafes.sh's own defense-in-depth for any profile that might get recreated later. Needs
# nmcli/a live NetworkManager, hence down here in stage 2 rather than stage 1.
for c in $(nmcli -t -f NAME,TYPE connection show 2>/dev/null | grep ':802-11-wireless$' | cut -d: -f1); do
  nmcli connection modify "$c" wifi-sec.psk-flags 0 2>/dev/null || true
done

date '+%Y-%m-%d %H:%M:%S' > /home/pi/.failsafe-v8-installed
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
Description=DP-KDS Expo kiosk stage-2 provisioning (runs once on first real boot)
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
