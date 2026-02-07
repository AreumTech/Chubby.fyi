#!/bin/bash
# Update UFW firewall rules with current Cloudflare IP ranges
#
# Run periodically (e.g., monthly cron) to keep CF IPs up to date.
# Cloudflare publishes IPs at: https://www.cloudflare.com/ips/
#
# Cron example:
#   0 3 1 * * /opt/chubby/update-cloudflare-ips.sh >> /var/log/cf-ip-update.log 2>&1

set -euo pipefail

echo "=== Updating Cloudflare IP allowlist: $(date) ==="

# Fetch current Cloudflare IPs
CF_V4=$(curl -sf https://www.cloudflare.com/ips-v4)
CF_V6=$(curl -sf https://www.cloudflare.com/ips-v6)

if [ -z "$CF_V4" ]; then
    echo "ERROR: Failed to fetch Cloudflare IPs. Aborting."
    exit 1
fi

# Reset firewall
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH
ufw allow ssh

# Allow HTTP from Cloudflare IPs
while IFS= read -r ip; do
    [ -n "$ip" ] && ufw allow from "$ip" to any port 80 proto tcp
done <<< "$CF_V4"

while IFS= read -r ip; do
    [ -n "$ip" ] && ufw allow from "$ip" to any port 80 proto tcp
done <<< "$CF_V6"

ufw --force enable

echo "=== Firewall updated with $(echo "$CF_V4" | wc -l) IPv4 + $(echo "$CF_V6" | wc -l) IPv6 ranges ==="
