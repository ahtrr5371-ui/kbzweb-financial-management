# DigitalOcean Deployment Guide

This guide provides step-by-step instructions to deploy the Financial Management application on DigitalOcean.

## 📋 Prerequisites

- DigitalOcean account
- GitHub repository with the project code
- Domain name (optional but recommended)
- SSH key pair for server access

---

## 🚀 Deployment Steps

### Step 1: Create a DigitalOcean Droplet

1. **Log in to DigitalOcean Console**
   - Go to https://cloud.digitalocean.com

2. **Create a New Droplet**
   - Click "Create" → "Droplets"
   - Choose an image: **Ubuntu 22.04 (LTS)**
   - Choose a plan: **Basic ($6/month or higher)**
   - Choose a datacenter region closest to your users
   - Add SSH keys (or use password authentication)
   - Hostname: `financial-app`
   - Click "Create Droplet"

3. **Note the Droplet IP Address**
   - You'll receive an IP address (e.g., 123.45.67.89)

### Step 2: Initial Server Setup

```bash
# SSH into your droplet
ssh root@YOUR_DROPLET_IP

# Update system packages
apt update && apt upgrade -y

# Create a non-root user
adduser deploy
usermod -aG sudo deploy

# Switch to deploy user
su - deploy

# Set up SSH keys for deploy user (optional but recommended)
mkdir -p ~/.ssh
# Copy your public key to ~/.ssh/authorized_keys
```

### Step 3: Install Required Software

```bash
# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install Nginx
sudo apt install -y nginx

# Install Certbot for SSL
sudo apt install -y certbot python3-certbot-nginx

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### Step 4: Configure PostgreSQL

```bash
# Switch to postgres user
sudo -u postgres psql

# Create database and user
CREATE DATABASE financial_management;
CREATE USER finapp_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE financial_management TO finapp_user;

# Enable UUID extension
\c financial_management
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

# Exit psql
\q
```

### Step 5: Clone and Setup Application

```bash
# Create app directory
sudo mkdir -p /opt/finapp
sudo chown deploy:deploy /opt/finapp

# Clone repository
cd /opt/finapp
git clone https://github.com/YOUR_USERNAME/kbzweb-financial-management.git app
cd app

# Backend setup
cd backend
npm install --production
mkdir -p uploads

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://finapp_user:your_strong_password_here@localhost:5432/financial_management?schema=public"
PORT=5000
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
MAX_FILE_SIZE=10485760
EOF

# Run Prisma migrations
npx prisma migrate deploy
npx prisma generate

# Frontend setup
cd ../frontend
npm install
npm run build
```

### Step 6: Setup PM2 Process Manager

```bash
# Start backend with PM2
cd /opt/finapp/app/backend
pm2 start server.js --name financial-api

# Save PM2 configuration
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command displayed

# Verify PM2 is running
pm2 status
```

### Step 7: Configure Nginx

```bash
# Create Nginx configuration
sudo nano /etc/nginx/sites-available/financial-app
```

Add the following configuration:

```nginx
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    # API Backend
    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # File upload size limit
        client_max_body_size 10M;
    }

    # Frontend
    location / {
        root /opt/finapp/app/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Cache static assets
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
```

```bash
# Enable the site
sudo ln -s /etc/nginx/sites-available/financial-app /etc/nginx/sites-enabled/

# Remove default site
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 8: Setup SSL Certificate (Let's Encrypt)

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Verify auto-renewal
sudo certbot renew --dry-run

# Enable auto-renewal
sudo systemctl enable certbot.timer
```

### Step 9: Configure Firewall

```bash
# Enable UFW firewall
sudo ufw enable

# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP
sudo ufw allow 80/tcp

# Allow HTTPS
sudo ufw allow 443/tcp

# Verify firewall rules
sudo ufw status
```

### Step 10: Setup Database Backups

```bash
# Create backup directory
mkdir -p /opt/finapp/backups

# Create backup script
cat > /opt/finapp/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/finapp/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DB_NAME="financial_management"

mkdir -p $BACKUP_DIR

# Backup database
sudo -u postgres pg_dump $DB_NAME > $BACKUP_DIR/db_backup_$TIMESTAMP.sql

# Keep only last 7 days of backups
find $BACKUP_DIR -name "db_backup_*.sql" -mtime +7 -delete

echo "Backup completed: db_backup_$TIMESTAMP.sql"
EOF

# Make executable
chmod +x /opt/finapp/backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /opt/finapp/backup.sh
```

---

## 🔄 Post-Deployment

### Verify Application is Running

```bash
# Check PM2 status
pm2 status

# Check Nginx status
sudo systemctl status nginx

# Check PostgreSQL status
sudo systemctl status postgresql

# Test API endpoint
curl http://localhost:5000/api/transactions
```

### Configure Domain DNS

1. Go to your domain registrar
2. Add an A record pointing to your DigitalOcean Droplet IP
3. Wait for DNS propagation (usually 24-48 hours)

### Monitor Application

```bash
# View PM2 logs
pm2 logs financial-api

# Monitor in real-time
pm2 monit

# Check system resources
free -h
df -h
```

---

## 🔐 Security Best Practices

### 1. Update Environment Variables

Edit `/opt/finapp/app/backend/.env`:
- Change default database password
- Set appropriate ALLOWED_ORIGINS
- Add any API keys needed

### 2. Secure File Permissions

```bash
# Restrict .env file access
sudo chmod 600 /opt/finapp/app/backend/.env
sudo chown deploy:deploy /opt/finapp/app/backend/.env
```

### 3. Setup Fail2Ban (Optional)

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Start service
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Updates

```bash
# Update system packages weekly
sudo apt update && sudo apt upgrade -y

# Update Node.js dependencies
cd /opt/finapp/app
git pull origin master
cd backend && npm update
cd ../frontend && npm update
```

---

## 🆘 Troubleshooting

### Application not accessible

```bash
# Check if PM2 process is running
pm2 status

# Check PM2 logs
pm2 logs financial-api

# Check if Nginx is running
sudo systemctl status nginx

# Check Nginx error logs
sudo tail -f /var/log/nginx/error.log
```

### Database connection error

```bash
# Test database connection
sudo -u postgres psql -U finapp_user -d financial_management

# Check PostgreSQL status
sudo systemctl status postgresql

# Check PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql.log
```

### SSL certificate issues

```bash
# Check certificate status
sudo certbot certificates

# Renew certificate manually
sudo certbot renew --force-renewal

# Check certificate expiration
openssl x509 -enddate -noout -in /etc/letsencrypt/live/yourdomain.com/cert.pem
```

---

## 📊 Monitoring and Maintenance

### Enable DigitalOcean Monitoring

1. In DigitalOcean Console, go to your Droplet
2. Click "Monitoring" tab
3. Enable monitoring for CPU, Memory, Disk I/O, Bandwidth

### Setup Automated Backups

1. In DigitalOcean Console, go to your Droplet
2. Click "Backups" tab
3. Enable automatic backups (weekly recommended)

### Scale Your Application

When you need more resources:
1. Create a larger Droplet
2. Clone the current Droplet's data
3. Update DNS to point to new Droplet
4. Or use DigitalOcean's App Platform for auto-scaling

---

## ✅ Deployment Checklist

- [ ] Droplet created and SSH access verified
- [ ] All required software installed
- [ ] PostgreSQL database created and configured
- [ ] Application code cloned from GitHub
- [ ] Environment variables configured
- [ ] Database migrations completed
- [ ] Frontend built successfully
- [ ] PM2 process manager running
- [ ] Nginx configured and running
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] Domain DNS configured
- [ ] Backups configured
- [ ] Application tested and accessible

---

## 📞 Support

For issues or questions:
1. Check the troubleshooting section
2. Review PM2 and Nginx logs
3. Check DigitalOcean documentation
4. Create an issue in the GitHub repository

---

**Your Financial Management application is now live on DigitalOcean!** 🚀
