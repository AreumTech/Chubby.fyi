#!/bin/bash
# Initial Hetzner VPS setup for Chubby MCP Server
#
# Run once on a fresh CX22 (x86) or CAX11 (ARM) Hetzner Cloud VPS.
# Tested on: Ubuntu 24.04 LTS
#
# Usage: ssh root@YOUR_VPS_IP 'bash -s' < deploy/hetzner/scripts/setup.sh
#    or: scp this file to the server and run it.
#
# What this does:
#   1. System updates + essential packages
#   2. Creates 'chubby' service user
#   3. Configures UFW firewall (Cloudflare IPs only + SSH)
#   4. Installs and configures nginx
#   5. Sets up the systemd service
#   6. Optionally installs Node.js (for Node.js server variant)
#
# After running this, use deploy.sh to upload the server binary.

set -euo pipefail

echo "=== Chubby MCP Server: Hetzner VPS Setup ==="

# --- 1. System updates ---
echo "--- Installing packages ---"
apt-get update
apt-get upgrade -y
apt-get install -y nginx ufw fail2ban curl jq unattended-upgrades

# Enable automatic security updates
dpkg-reconfigure -plow unattended-upgrades

# --- 2. Create service user ---
echo "--- Creating chubby user ---"
if ! id chubby &>/dev/null; then
    useradd --system --shell /usr/sbin/nologin --home-dir /opt/chubby chubby
fi
mkdir -p /opt/chubby
chown chubby:chubby /opt/chubby

# --- 3. Firewall: Cloudflare IPs only + SSH ---
echo "--- Configuring firewall ---"
ufw --force reset
ufw default deny incoming
ufw default allow outgoing

# SSH (restrict to your IP if you know it, otherwise allow all)
ufw allow ssh

# Allow HTTP from Cloudflare IPs only
# Source: https://www.cloudflare.com/ips/
CF_IPV4=(
    173.245.48.0/20
    103.21.244.0/22
    103.22.200.0/22
    103.31.4.0/22
    141.101.64.0/18
    108.162.192.0/18
    190.93.240.0/20
    188.114.96.0/20
    197.234.240.0/22
    198.41.128.0/17
    162.158.0.0/15
    104.16.0.0/13
    104.24.0.0/14
    172.64.0.0/13
    131.0.72.0/22
)

CF_IPV6=(
    2400:cb00::/32
    2606:4700::/32
    2803:f800::/32
    2405:b500::/32
    2405:8100::/32
    2a06:98c0::/29
    2c0f:f248::/32
)

for ip in "${CF_IPV4[@]}"; do
    ufw allow from "$ip" to any port 80 proto tcp
done
for ip in "${CF_IPV6[@]}"; do
    ufw allow from "$ip" to any port 80 proto tcp
done

ufw --force enable
echo "Firewall configured: SSH open, HTTP from Cloudflare only."

# --- 4. nginx setup ---
echo "--- Configuring nginx ---"

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# The actual site config is uploaded by deploy.sh
# Placeholder to verify nginx starts
cat > /etc/nginx/sites-available/api.chubby.fyi << 'NGINX_PLACEHOLDER'
server {
    listen 80 default_server;
    server_name _;
    location /health {
        return 200 '{"status":"setup_pending"}';
        add_header Content-Type application/json;
    }
    location / {
        return 503 '{"status":"setup_pending"}';
        add_header Content-Type application/json;
    }
}
NGINX_PLACEHOLDER

ln -sf /etc/nginx/sites-available/api.chubby.fyi /etc/nginx/sites-enabled/
nginx -t && systemctl restart nginx

# --- 5. fail2ban for SSH brute force ---
echo "--- Configuring fail2ban ---"
cat > /etc/fail2ban/jail.local << 'F2B'
[sshd]
enabled = true
port = ssh
maxretry = 5
bantime = 3600
F2B
systemctl restart fail2ban

# --- 6. Node.js (optional, only if using Node.js server) ---
# Uncomment if you want the Node.js server instead of Go:
#
# echo "--- Installing Node.js 20 ---"
# curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
# apt-get install -y nodejs
# node --version

echo ""
echo "=== Setup complete ==="
echo ""
echo "Next steps:"
echo "  1. Point api.chubby.fyi DNS to this server's IP (Cloudflare, orange-cloud ON)"
echo "  2. Set Cloudflare SSL mode to 'Full' for api.chubby.fyi"
echo "  3. Run deploy.sh to upload the server binary + nginx config"
echo "  4. (Optional) Restrict SSH: ufw delete allow ssh && ufw allow from YOUR_IP to any port 22"
echo ""
echo "Server IP: $(curl -s ifconfig.me)"
