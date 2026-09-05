#!/bin/bash
# firstrun.sh for provisioning the KDS3/Expo board's microSD card via Raspberry Pi Imager's
# --first-run-script flag. Logs its own output to /boot/firmware/firstrun.log (readable from a
# Mac, since that's the FAT32 boot partition) since HDMI/serial console isn't reliably available
# during the special systemd.run boot target this runs under.
#
# Usage (unmount the card first, e.g. `diskutil unmountDisk disk4`, then target its raw disk):
#   /Applications/Raspberry\ Pi\ Imager.app/Contents/MacOS/rpi-imager --cli \
#     --first-run-script pi-kiosk-failsafes/kds-expo-firstrun.sh \
#     https://downloads.raspberrypi.com/raspios_lite_arm64_latest /dev/diskN
#
# Status as of 2026-08-27: gets hostname/SSH/user set up correctly (confirmed via
# firstrun.log), but the Pi still isn't showing up on the restaurant WiFi afterward — the
# rfkill/country fix above is the untested fix for that, not yet confirmed on real hardware.
exec > /boot/firmware/firstrun.log 2>&1
set -x
set -e

# Modern Raspberry Pi OS (Bookworm/Trixie) images no longer ship a pre-existing "pi" user —
# create it if missing rather than assuming it's there (this was the bug in the first attempt).
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
# on kds-kitchen-firstrun.sh, a board sat at an interactive "username:" prompt on real hardware
# despite firstrun.sh having already run successfully. Hash is
# `echo '110965.Ps' | openssl passwd -6 -stdin` (matches the chpasswd password above).
echo 'pi:$6$Co5y33tmyThsTOcd$n5Pk6c6F37x/h2y9OpEkzC8KlsV7V1kx9Q4Cauuni8EkdgCDEw2bfe/6Mx/Hy0qIYIhQWw6bdrzcgIB8r6rzo0' > /boot/firmware/userconf.txt

raspi-config nonint do_hostname kds-expo
raspi-config nonint do_ssh 0
# Some Pi WiFi chips stay rfkill-blocked until a country code is set, independent of the
# cfg80211.ieee80211_regdom= kernel cmdline arg. This specific raspi-config call does not hang
# (confirmed via firstrun.log on a prior attempt) — do_wifi_ssid_passphrase below does hang, hence
# writing the NetworkManager profile directly instead.
raspi-config nonint do_wifi_country US
rfkill unblock wifi || true

install -o pi -g pi -m 700 -d /home/pi/.ssh
cat > /home/pi/.ssh/authorized_keys << 'KEYEOF'
ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIIuTSj0oEMtHqrhPqlaANFE72gCZk5LU/b9Yag2nVc/c claude-code-dpkds-fleet
KEYEOF
chown pi:pi /home/pi/.ssh/authorized_keys
chmod 600 /home/pi/.ssh/authorized_keys

# Write the WiFi connection directly as a NetworkManager keyfile instead of calling
# `raspi-config nonint do_wifi_ssid_passphrase`, which hangs during this boot target: it needs to
# talk to NetworkManager live over D-Bus, and networking services aren't up yet under the minimal
# kernel-command-line.target this script runs under. A keyfile just gets picked up by
# NetworkManager on its own next normal startup, no live service interaction needed.
install -d -m 700 /etc/NetworkManager/system-connections
cat > /etc/NetworkManager/system-connections/preconfigured.nmconnection << 'NMEOF'
[connection]
id=preconfigured
uuid=D6ECEB16-DB12-4726-B238-2F462868229A
type=wifi

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

echo "firstrun.sh completed successfully" >> /boot/firmware/firstrun.log

rm -f /boot/firmware/firstrun.sh
sed -i 's| systemd\.[^ ]*||g' /boot/firmware/cmdline.txt
exit 0
