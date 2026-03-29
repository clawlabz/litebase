# LiteBase Production Deployment

## Prerequisites

- A VPS with 2GB+ RAM (e.g., Hetzner CCX13 $15/mo, DigitalOcean $12/mo)
- Docker & Docker Compose v2
- A domain name (e.g., `base.yourdomain.com`)
- (Optional) SMTP credentials for email verification (AWS SES recommended)

## Step 1: Clone and Configure

```bash
git clone https://github.com/clawlabz/litebase
cd litebase
cp .env.example .env
```

Edit `.env` with secure passwords:

```env
POSTGRES_PASSWORD=$(openssl rand -hex 24)
JWT_SECRET=$(openssl rand -hex 32)
STUDIO_PASSWORD=your-admin-password

# SMTP (recommended)
SMTP_HOST=email-smtp.us-east-1.amazonaws.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASS=your-smtp-password
SMTP_FROM=noreply@yourdomain.com
SMTP_FROM_NAME=YourApp
```

## Step 2: Start Services

```bash
docker compose up -d
```

Verify all services are running:

```bash
docker compose ps
```

## Step 3: Nginx Reverse Proxy + SSL

Install Nginx and Certbot:

```bash
apt install -y nginx certbot python3-certbot-nginx
```

Create Nginx config at `/etc/nginx/sites-available/litebase`:

```nginx
server {
    server_name base.yourdomain.com;

    # Studio
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

Enable and get SSL:

```bash
ln -s /etc/nginx/sites-available/litebase /etc/nginx/sites-enabled/
certbot --nginx -d base.yourdomain.com
```

## Step 4: Automated Backups

```bash
# Add to crontab
crontab -e

# Backup every 6 hours
0 */6 * * * /path/to/litebase/scripts/backup.sh /path/to/backups >> /var/log/litebase-backup.log 2>&1
```

## Step 5: Monitoring

Create a simple health check script:

```bash
#!/bin/bash
# Check all services
docker compose ps --format json | python3 -c "
import sys, json
for line in sys.stdin:
    svc = json.loads(line)
    if svc['State'] != 'running':
        # Send alert (customize with your notification method)
        echo 'ALERT: ' + svc['Service'] + ' is ' + svc['State']
"
```

## Updating

```bash
cd litebase
git pull
docker compose build studio
docker compose up -d
```

## Firewall

Only expose these ports:

| Port | Service |
|------|---------|
| 22 | SSH |
| 80 | HTTP (certbot) |
| 443 | HTTPS (Nginx) |
| 6432 | PgBouncer (if external DB access needed) |
