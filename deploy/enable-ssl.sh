#!/usr/bin/env bash
# =============================================================================
# Байдабаза — Enable SSL (switch from HTTP to HTTPS)
# Usage: bash deploy/enable-ssl.sh YOUR_DOMAIN
#
# Prerequisites:
#   1. bash deploy/install.sh  (site must already be running on HTTP)
#   2. certbot installed on the host
#   3. Port 80 accessible from the internet
#
# This script:
#   1. Obtains a Let's Encrypt certificate via webroot challenge
#   2. Copies certs to docker/ssl/
#   3. Patches docker/nginx-ssl.conf with your domain
#   4. Switches nginx to the HTTPS config
#   5. Reloads nginx
#   6. Sets up auto-renewal cron
# =============================================================================
set -euo pipefail

CYAN='\033[0;36m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; RESET='\033[0m'
info()    { echo -e "${CYAN}▶ $*${RESET}"; }
success() { echo -e "${GREEN}✓ $*${RESET}"; }
warn()    { echo -e "${YELLOW}⚠ $*${RESET}"; }
error()   { echo -e "${RED}✗ $*${RESET}"; exit 1; }

DOMAIN="${1:-}"
if [ -z "$DOMAIN" ]; then
  error "Usage: bash deploy/enable-ssl.sh YOUR_DOMAIN (e.g. example.com)"
fi

if [ -f ".env" ]; then set -a && source .env && set +a; fi

# ── 1. Check certbot ─────────────────────────────────────────────────────────
command -v certbot >/dev/null 2>&1 || error "certbot not found. Install: apt install -y certbot"

# ── 2. Create certbot webroot dir ─────────────────────────────────────────────
info "Creating certbot webroot directory..."
mkdir -p docker/certbot docker/ssl
success "Directories ready"

# ── 3. Ensure nginx is running for webroot challenge ─────────────────────────
info "Ensuring nginx is running..."
docker compose up -d nginx 2>/dev/null || true
sleep 2

# ── 4. Obtain certificate ─────────────────────────────────────────────────────
info "Obtaining Let's Encrypt certificate for ${DOMAIN}..."
certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  --email "${SMTP_USER:-webmaster@${DOMAIN}}" \
  --agree-tos \
  --no-eff-email \
  --force-renewal \
  -d "${DOMAIN}" \
  -d "www.${DOMAIN}" \
  || {
    warn "www.${DOMAIN} might not be configured. Trying without www..."
    certbot certonly \
      --webroot \
      --webroot-path /var/www/certbot \
      --email "${SMTP_USER:-webmaster@${DOMAIN}}" \
      --agree-tos \
      --no-eff-email \
      --force-renewal \
      -d "${DOMAIN}" \
      || error "Failed to obtain certificate. Check DNS and port 80."
  }

success "Certificate obtained"

# ── 5. Copy certs to docker/ssl/ ──────────────────────────────────────────────
info "Copying certificates..."
cp "/etc/letsencrypt/live/${DOMAIN}/fullchain.pem" docker/ssl/
cp "/etc/letsencrypt/live/${DOMAIN}/privkey.pem" docker/ssl/
chmod 600 docker/ssl/*.pem
success "Certificates copied to docker/ssl/"

# ── 6. Patch nginx-ssl.conf with domain ──────────────────────────────────────
info "Configuring nginx for ${DOMAIN}..."
cp docker/nginx-ssl.conf docker/nginx-ssl.conf.bak
sed -i "s/YOUR_DOMAIN/${DOMAIN}/g" docker/nginx-ssl.conf
success "nginx-ssl.conf configured"

# ── 7. Switch docker-compose nginx volume to SSL config ───────────────────────
info "Switching nginx to HTTPS config..."
# Update docker-compose.yml nginx volume mount
if grep -q "nginx.conf:/etc/nginx/conf.d/default.conf" docker-compose.yml; then
  sed -i "s|nginx.conf:/etc/nginx/conf.d/default.conf|nginx-ssl.conf:/etc/nginx/conf.d/default.conf|g" docker-compose.yml
  success "docker-compose.yml updated to use nginx-ssl.conf"
else
  warn "Could not auto-update docker-compose.yml. Edit manually:"
  warn "  Change: ./docker/nginx.conf → ./docker/nginx-ssl.conf in nginx volumes"
fi

# ── 8. Reload nginx ───────────────────────────────────────────────────────────
info "Reloading nginx..."
docker compose up -d nginx
sleep 3
docker compose exec nginx nginx -t && docker compose exec nginx nginx -s reload
success "nginx reloaded with HTTPS config"

# ── 9. Set up auto-renewal cron ───────────────────────────────────────────────
info "Setting up certificate auto-renewal..."
CRON_CMD="0 3 * * 1 certbot renew --webroot --webroot-path /var/www/certbot --quiet && cp /etc/letsencrypt/live/${DOMAIN}/fullchain.pem $(pwd)/docker/ssl/ && cp /etc/letsencrypt/live/${DOMAIN}/privkey.pem $(pwd)/docker/ssl/ && docker compose -f $(pwd)/docker-compose.yml exec nginx nginx -s reload"

(crontab -l 2>/dev/null | grep -v "certbot renew"; echo "$CRON_CMD") | crontab -
success "Auto-renewal cron added (runs every Monday 3am)"

echo ""
echo -e "${GREEN}✓ SSL enabled!${RESET}"
echo ""
echo -e "  https://${DOMAIN}      → Public site"
echo -e "  https://${DOMAIN}/crm  → Admin CRM"
echo -e "  https://${DOMAIN}/api  → REST API"
echo ""
echo -e "${YELLOW}Test: curl -I https://${DOMAIN}/api/auth/healthz${RESET}"
