# 🚀 PRODUCTION DEPLOYMENT & PERSISTENCE GUIDE

## 📋 Table of Contents
1. [Quick Deployment Options](#quick-deployment-options)
2. [Database Persistence Strategy](#database-persistence-strategy)
3. [Low-Cost Hosting Recommendations](#low-cost-hosting-recommendations)
4. [24/7 Uptime Solutions](#24-7-uptime-solutions)
5. [Backup & Recovery](#backup--recovery)
6. [Monitoring & Logging](#monitoring--logging)
7. [Security Setup](#security-setup)

---

## Quick Deployment Options

### Option 1: DigitalOcean Droplet (Recommended for Starting Phase)
**Cost:** $5-7/month | **Uptime:** 99.9% | **Data:** On-server SQLite with backups

#### Setup Steps:
```bash
# 1. Create Droplet
# - Ubuntu 22.04 LTS
# - Basic ($5/month = 1GB RAM, 25GB SSD)
# - Choose region closest to you

# 2. SSH into droplet
ssh root@your_droplet_ip

# 3. Install dependencies
apt update && apt upgrade -y
apt install -y nodejs npm git sqlite3

# 4. Create trading bot user
useradd -m -s /bin/bash trading
usermod -aG sudo trading

# 5. Clone your repo
cd /opt
git clone https://github.com/yourusername/trading-bot.git
chown -R trading:trading trading-bot

# 6. Install PM2 globally
npm install -g pm2

# 7. Build and start
cd /opt/trading-bot
npm install
npm run build
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

# 8. Setup backup cron job
sudo cp auto-backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/auto-backup.sh
sudo crontab -e
# Add: 0 2 * * * /usr/local/bin/auto-backup.sh
```

**Persistence:**
- Database: SQLite stored at `/opt/trading-bot/trades.db`
- Logs: `/opt/trading-bot/logs/` (persistent)
- Droplet volume: Automatically backed up by DigitalOcean snapshots
- Manual backup: Run `./backup.sh` to create compressed archives

**Access Data Anytime:**
```bash
# SSH into server
ssh trading@your_droplet_ip

# Check database
sqlite3 /opt/trading-bot/trades.db
> SELECT * FROM trades WHERE status='EXECUTED';

# Download backup locally
scp trading@your_droplet_ip:/opt/trading-bot/backups/* ./local-backups/

# View logs
tail -f /opt/trading-bot/logs/*.log
```

---

### Option 2: Railway.app (Easiest, Free Starting Tier)
**Cost:** $5-15/month | **Uptime:** 99.9% | **Data:** PostgreSQL backup included

#### Setup Steps:
```bash
# 1. Sign up at https://railway.app (with GitHub)

# 2. Create new project from GitHub repo

# 3. Add services:
#    - Node.js app (your monorepo)
#    - PostgreSQL database (optional, for scaling)

# 4. Set environment variables in Railway dashboard:
NODE_ENV=production
GEMINI_API_KEY=your-key
ZERODHA_API_KEY=your-key
ZERODHA_ACCESS_TOKEN=your-token
USE_MOCK_BROKER=false
RISK_PROFILE=CONSERVATIVE

# 5. Deploy automatically on git push
git push origin main
```

**Persistence:**
- Database: PostgreSQL managed by Railway (daily automated backups)
- Logs: Accessible via Railway dashboard
- Data retention: 14 days of automatic backups

**Cost Breakdown:**
- Node.js runtime: Included in free tier ($5/month production)
- PostgreSQL database: $15/month (optional)
- Total: ~$5-20/month

---

### Option 3: AWS EC2 (Free Tier Eligible)
**Cost:** Free for 12 months | **Uptime:** 99.9% | **Data:** EBS + RDS snapshots

#### Setup Steps:
```bash
# 1. Launch EC2 instance
# - AMI: Ubuntu 22.04 LTS
# - Instance type: t2.micro (free tier)
# - Storage: 30GB EBS (free tier)
# - Security group: Allow HTTP (80), HTTPS (443), SSH (22)

# 2. Setup like DigitalOcean (same commands above)

# 3. Add RDS for production (optional)
# - MySQL or PostgreSQL
# - db.t3.micro (eligible for free tier)
# - Automated backups: 30 days retention

# 4. Use S3 for backup storage
# - Create bucket: trading-bot-backups
# - Enable versioning
# - Cost: ~$0.023 per GB/month
```

**Persistence:**
- Database: EBS volume (survives instance restart)
- Backups: Automated daily EBS snapshots
- Cross-region replication: Optional (for disaster recovery)

---

### Option 4: Docker Compose (Local Server / VPS)
**Cost:** $2-5/month VPS + your infrastructure | **Best for:** Full control

#### Setup:
```bash
# 1. Start containers
docker-compose -f docker-compose-prod.yml up -d

# 2. Verify all services running
docker ps

# 3. View logs
docker-compose -f docker-compose-prod.yml logs -f

# 4. Database persists to volume
# Check: docker volume ls | grep trading

# 5. Backup
docker exec trading-bot-gateway sqlite3 /app/trades.db ".backup /app/backup.db"
docker cp trading-bot-gateway:/app/backup.db ./backups/
```

---

## Database Persistence Strategy

### SQLite (Current - Best for Starting Phase)

**Pros:**
- Zero setup required
- Single file: `trades.db` (easy to backup)
- Suitable for <1 million trades (your first 1-2 years)
- No external dependencies
- Cost: FREE

**Cons:**
- Single-threaded writes
- Not suitable for high-frequency trading
- No built-in replication

**Setup Persistence:**
```bash
# 1. Create persistent directory
mkdir -p /opt/trading-bot/data

# 2. Configure in .env
DB_PATH=/opt/trading-bot/data/trades.db

# 3. Mount in docker-compose
volumes:
  - /opt/trading-bot/data:/app/data

# 4. Backup strategy
# Daily automated backup:
0 2 * * * /usr/local/bin/auto-backup.sh

# Monthly manual full backup:
0 2 1 * * cp /opt/trading-bot/data/trades.db /backups/monthly/trades-$(date +\%Y\%m\%d).db
```

**Data Doesn't Get Wiped:**
- SQLite writes to disk immediately
- WAL mode enabled (safe transactions)
- Backup on every deployment
- Version control: Keep backup history

---

### PostgreSQL (Migration Path for Growth)

When you grow to:
- Multiple traders (different strategies)
- Millions of trades
- Need real-time reporting

**Simple Migration:**
```sql
-- Already designed for easy migration
-- Just uncomment PostgreSQL service in docker-compose-prod.yml
-- Update .env: DATABASE_URL=postgresql://...
-- Run migration script
npm run migrate:postgres
```

---

## Low-Cost Hosting Recommendations

### Tier 1: Absolute Minimum ($5/month)
```
DigitalOcean $5/month droplet
├── 1GB RAM
├── 25GB SSD
├── Ubuntu 22.04
└── 5TB transfer
```
**Best for:** Single strategy, starting phase

### Tier 2: Recommended ($10-15/month)
```
DigitalOcean $10/month droplet
├── 2GB RAM
├── 50GB SSD
├── Automated backups +$10/month
└── Or: AWS EC2 t2.micro (free) + RDS PostgreSQL ($12/month)
```
**Best for:** Live trading, multiple signals

### Tier 3: Production Scale ($30-50/month)
```
DigitalOcean App Platform
├── PostgreSQL managed database ($15/month)
├── Node.js runtime ($10/month)
├── Automated daily backups (included)
└── Plus: DigitalOcean Spaces for logs ($5/month)
```
**Best for:** Professional operation, multiple strategies

---

## 24/7 Uptime Solutions

### Method 1: PM2 (Recommended for Starting Phase)
```bash
# Install globally
npm install -g pm2

# Start with config
pm2 start ecosystem.config.js --env production

# Enable auto-start on reboot
pm2 startup
pm2 save

# Monitor
pm2 monit
pm2 logs

# Restart on code changes
pm2 reload all
```

**Restart Policy:**
- Automatic restart on crash: ✅ (10 retries max)
- Automatic restart on reboot: ✅
- Manual restart: `pm2 restart all`

### Method 2: Systemd (Linux Native)

```bash
# Install service files
sudo cp trading-bot-*.service /etc/systemd/system/

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable trading-bot-gateway
sudo systemctl enable trading-bot-execution
sudo systemctl start trading-bot-gateway
sudo systemctl start trading-bot-execution

# Check status
sudo systemctl status trading-bot-gateway

# View logs
sudo journalctl -u trading-bot-gateway -f

# Restart
sudo systemctl restart trading-bot-gateway
```

### Method 3: Docker with Auto-Restart

```bash
# docker-compose-prod.yml already includes:
restart: unless-stopped  # Automatically restart on crash

# Manual restart
docker-compose -f docker-compose-prod.yml restart execution-service

# View logs
docker-compose -f docker-compose-prod.yml logs -f execution-service
```

### Method 4: Multiple Instance Redundancy

For mission-critical setup:
```yaml
# docker-compose-prod.yml
execution-service-1:
  # ... config ...
  restart: unless-stopped

execution-service-2:
  # ... config (different risk profile) ...
  restart: unless-stopped

# Load balancer selects one based on availability
# If one crashes, other takes over
```

---

## Backup & Recovery

### Automated Backup Strategy

**Daily Backups** (2 AM):
```bash
# Run backup.sh via cron
0 2 * * * /opt/trading-bot/backup.sh /opt/trading-bot/backups

# Creates: trading-bot-backup-20260316_020000.tar.gz
# Contains:
# ├── trades.db (SQLite database)
# ├── trades.db-shm / -wal (WAL files)
# ├── logs/ (all operation logs)
# └── .env.sanitized (config without secrets)
```

**Retention Policy:**
- Keep last 30 days of daily backups
- Keep last 12 months of weekly backups
- Automatically clean up older backups

**Upload to Cloud** (Optional):
```bash
# Edit auto-backup.sh to add:

# AWS S3
aws s3 cp backups/trading-bot-backup-*.tar.gz \
  s3://your-bucket/backups/ \
  --region us-east-1

# Google Cloud Storage
gsutil cp backups/trading-bot-backup-*.tar.gz \
  gs://your-bucket/backups/

# Digital Ocean Spaces
s3cmd put backups/trading-bot-backup-*.tar.gz \
  s3://trading-bot-backups/
```

### Disaster Recovery

**Restore from backup:**
```bash
# 1. Download backup
scp user@server:/opt/trading-bot/backups/trading-bot-backup-*.tar.gz .

# 2. Stop services
pm2 stop all

# 3. Extract backup
tar -xzf trading-bot-backup-*.tar.gz

# 4. Restore database
cp trading-bot-backup-*/trades.db /opt/trading-bot/

# 5. Restart services
pm2 restart all

# 6. Verify
pm2 logs
```

**Data Loss Prevention:**
- Backups stored in 3 locations (minimum):
  1. Server local filesystem
  2. Remote backup server (scp/rsync)
  3. Cloud storage (S3/GCS/DO Spaces)
- Backup encryption: `gpg --symmetric backup.tar.gz`
- Test recovery quarterly

---

## Monitoring & Logging

### Real-Time Monitoring

**PM2 Monitoring:**
```bash
# Built-in dashboard
pm2 monit

# Web dashboard
pm2 web
# Visit: http://localhost:9615
```

**Docker Monitoring:**
```bash
# Check resource usage
docker stats

# View combined logs
docker-compose -f docker-compose-prod.yml logs -f

# Specific service
docker-compose -f docker-compose-prod.yml logs -f execution-service --tail 100
```

### Log Aggregation

**Local Logs:**
```
logs/
├── strategy-service/
│   ├── out.log
│   ├── error.log
│   └── combined.log
├── orchestrator/
├── gateway/
└── execution/
```

**View Live Logs:**
```bash
# All logs
tail -f logs/*/*.log

# Execution service only
tail -f logs/execution-service/combined.log

# Search for errors
grep -r "ERROR\|❌\|failed" logs/
```

### Alerting (Optional Setup)

```bash
# Install uptime monitoring
npm install -g pm2-auto-pull

# Setup Datadog / New Relic / Sentry
# Each service can log to external monitoring

# Configure in packages/*/src/index.ts:
import Sentry from "@sentry/node";
Sentry.init({ dsn: process.env.SENTRY_DSN });
```

---

## Security Setup

### 1. Environment Variables (NEVER hardcoded)

```bash
# Create .env file (NOT in git)
cat > .env << EOF
NODE_ENV=production
GEMINI_API_KEY=your-key-here
ZERODHA_API_KEY=your-key-here
ZERODHA_ACCESS_TOKEN=your-token-here
DB_PATH=/opt/trading-bot/data/trades.db
EOF

# Permissions: Owner read-only
chmod 600 .env
```

### 2. Firewall Configuration

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 3000/tcp  # Gateway API
sudo ufw enable

# Block unnecessary ports
sudo ufw deny 3001:3002/tcp  # Internal services
```

### 3. API Key Management

```bash
# Rotation strategy
# Every 90 days:
# 1. Generate new API keys in Zerodha dashboard
# 2. Update .env file
# 3. Restart services
# 4. Delete old keys

# For secrets, use Vault
# Docker Secrets (production)
# AWS Secrets Manager
# HashiCorp Vault
```

### 4. Database Encryption

```bash
# Enable SQLite encryption (optional)
# Use: sqlcipher instead of sqlite3
# npm install sqlcipher

# Or: Encrypt backup files
gpg --symmetric backup.tar.gz
# Requires password to restore
```

### 5. SSL/TLS for API

```bash
# Use Nginx as reverse proxy
# Enable HTTPS with Let's Encrypt

# Nginx config:
server {
    listen 443 ssl http2;
    server_name api.tradingbot.example.com;
    
    ssl_certificate /etc/letsencrypt/live/api.tradingbot.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.tradingbot.example.com/privkey.pem;
    
    location / {
        proxy_pass http://localhost:3000;
    }
}
```

---

## Complete Production Deployment Script

**Run this once for full setup:**

```bash
#!/bin/bash

# trading-bot-deploy.sh
# Complete production setup for DigitalOcean/VPS

set -e

echo "🚀 Trading Bot Production Deployment"

# Update system
sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm git sqlite3 build-essential

# Create user
sudo useradd -m -s /bin/bash trading || true
sudo usermod -aG sudo trading

# Clone repo
cd /opt
sudo rm -rf trading-bot || true
sudo git clone https://github.com/yourusername/trading-bot.git
sudo chown -R trading:trading trading-bot

# Build
cd /opt/trading-bot
npm install
npm run build

# Create directories
mkdir -p data backups logs
chmod 755 data backups logs

# Copy environment file
sudo cp .env.example .env
echo "⚠️ Edit .env with your API keys: sudo nano .env"

# Setup PM2
sudo npm install -g pm2
pm2 start ecosystem.config.js --env production
pm2 startup
pm2 save

# Setup cron backup
sudo cp auto-backup.sh /usr/local/bin/
sudo chmod +x /usr/local/bin/auto-backup.sh
(crontab -l 2>/dev/null; echo "0 2 * * * /usr/local/bin/auto-backup.sh") | crontab -

# Firewall
sudo ufw allow 22/tcp
sudo ufw allow 3000/tcp
sudo ufw enable

echo "✅ Deployment complete!"
echo "📝 Next steps:"
echo "   1. Edit .env with your API keys"
echo "   2. pm2 logs (view running services)"
echo "   3. curl http://localhost:3000/trades (test API)"
echo "   4. Check backups: ls -la backups/"
```

---

## Startup Summary

### What You Get:
- ✅ 24/7 uptime (auto-restart on crash)
- ✅ Database persists (never loses data)
- ✅ Daily automated backups
- ✅ Access anytime via SSH/API
- ✅ Low cost ($5-15/month starting)
- ✅ Manual approval required before any trade
- ✅ Full audit trail in database

### Monthly Maintenance:
1. Check backup status (5 min)
2. Review logs for errors (5 min)
3. Update API keys if needed (5 min)
4. Test manual approval workflow (10 min)
5. Monthly backup verification (5 min)

**Total: ~30 min/month**

---

**Questions?** Check logs:
```bash
pm2 logs              # Real-time
pm2 logs --lines 100  # Last 100 lines
tail -f logs/*/*.log  # All logs
```

**Ready to deploy?** Start with DigitalOcean $5/month droplet + PM2.
