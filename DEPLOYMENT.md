# Deployment Guide

This guide covers deploying the Financial Management application to production.

## 🔧 Prerequisites

- Ubuntu/Debian server with root access
- Domain name (optional but recommended)
- PostgreSQL 14+ installed
- Node.js 18+ installed
- Nginx (for reverse proxy)
- SSL certificate (Let's Encrypt recommended)

---

## 📦 Production Deployment Steps

### 1. Server Setup

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx certbot python3-certbot-nginx

# Create application user
sudo adduser --system --group --home /opt/finapp finapp
```

### 2. Database Configuration

```bash
# Login to PostgreSQL
sudo -u postgres psql

# Create database and user
CREATE DATABASE financial_management;
CREATE USER finapp_user WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE financial_management TO finapp_user;

# Enable UUID extension
\c financial_management
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\q
```

### 3. Application Deployment

```bash
# Switch to application user
sudo su - finapp

# Clone repository
cd /opt/finapp
git clone <your-repo-url> app
cd app

# Backend setup
cd backend
npm install --production
mkdir uploads

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

# Exit finapp user
exit
```

### 4. PM2 Process Manager

```bash
# Install PM2 globally
sudo npm install -g pm2

# Switch to finapp user
sudo su - finapp
cd /opt/finapp/app/backend

# Start backend with PM2
pm2 start server.js --name financial-api
pm2 save
pm2 startup

# Exit and run the startup command shown
exit
# Run the command PM2 displayed (will be something like):
# sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u finapp --hp /opt/finapp
```

### 5. Nginx Configuration

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/financial-app

# Add the following configuration:
```

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
# Enable site
sudo ln -s /etc/nginx/sites-available/financial-app /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### 6. SSL Configuration (Let's Encrypt)

```bash
# Get SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will automatically update your Nginx config with SSL
# Auto-renewal is enabled by default

# Test auto-renewal
sudo certbot renew --dry-run
```

### 7. Firewall Configuration

```bash
# Allow required ports
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS

# Enable firewall
sudo ufw enable
```

---

## 🔐 Security Hardening

### 1. PostgreSQL Security

```bash
# Edit PostgreSQL config
sudo nano /etc/postgresql/14/main/postgresql.conf

# Set these values:
listen_addresses = 'localhost'
ssl = on

# Edit pg_hba.conf
sudo nano /etc/postgresql/14/main/pg_hba.conf

# Change to use md5 authentication
local   all             all                                     md5
host    all             all             127.0.0.1/32            md5

# Restart PostgreSQL
sudo systemctl restart postgresql
```

### 2. Environment Variables

```bash
# Secure .env file
sudo chmod 600 /opt/finapp/app/backend/.env
sudo chown finapp:finapp /opt/finapp/app/backend/.env
```

### 3. Fail2Ban (Optional)

```bash
# Install Fail2Ban
sudo apt install fail2ban

# Configure for Nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true

[nginx-noscript]
enabled = true

[nginx-badbots]
enabled = true
```

---

## 📊 Monitoring

### 1. PM2 Monitoring

```bash
# View logs
pm2 logs financial-api

# Monitor processes
pm2 monit

# View status
pm2 status
```

### 2. Database Backup

```bash
# Create backup script
sudo nano /opt/finapp/backup.sh
```

```bash
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
```

```bash
# Make executable
sudo chmod +x /opt/finapp/backup.sh

# Add to crontab (daily at 2 AM)
sudo crontab -e
# Add: 0 2 * * * /opt/finapp/backup.sh
```

---

## 🔄 Updates and Maintenance

### Deploying Updates

```bash
# Switch to finapp user
sudo su - finapp
cd /opt/finapp/app

# Pull latest code
git pull origin main

# Backend updates
cd backend
npm install --production
npx prisma migrate deploy
npx prisma generate

# Frontend updates
cd ../frontend
npm install
npm run build

# Restart backend
pm2 restart financial-api

# Exit
exit
```

### Database Migration

```bash
# Create migration (development)
npx prisma migrate dev --name migration_name

# Apply in production
npx prisma migrate deploy
```

---

## 🐳 Docker Deployment (Alternative)

### 1. Create Dockerfile for Backend

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .
RUN npx prisma generate

EXPOSE 5000

CMD ["node", "server.js"]
```

### 2. Create Dockerfile for Frontend

```dockerfile
FROM node:18-alpine as build

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
```

### 3. Docker Compose

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:14-alpine
    environment:
      POSTGRES_DB: financial_management
      POSTGRES_USER: finapp_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - finapp-network

  backend:
    build: ./backend
    environment:
      DATABASE_URL: postgresql://finapp_user:${DB_PASSWORD}@postgres:5432/financial_management
      NODE_ENV: production
    ports:
      - "5000:5000"
    depends_on:
      - postgres
    networks:
      - finapp-network

  frontend:
    build: ./frontend
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - finapp-network

volumes:
  postgres_data:

networks:
  finapp-network:
```

---

## 📈 Performance Optimization

### 1. Database Indexing

Already included in Prisma schema:
- `transactionDateTime` index
- `category` index
- `isIncome` index
- `userId` index for payments

### 2. Nginx Caching

```nginx
# Add to http block in /etc/nginx/nginx.conf
proxy_cache_path /var/cache/nginx levels=1:2 keys_zone=api_cache:10m max_size=100m;

# In server block
location /api/transactions/summary {
    proxy_cache api_cache;
    proxy_cache_valid 200 5m;
    proxy_pass http://localhost:5000;
}
```

### 3. Database Connection Pooling

Prisma already handles connection pooling. Adjust if needed:

```env
DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public&connection_limit=10&pool_timeout=20"
```

---

## 🆘 Troubleshooting

### Backend won't start
```bash
# Check logs
pm2 logs financial-api

# Check if port is in use
sudo lsof -i :5000

# Check database connection
sudo -u finapp psql -U finapp_user -d financial_management
```

### Frontend 404 errors
```bash
# Ensure Nginx config has try_files
# Rebuild frontend
cd /opt/finapp/app/frontend
npm run build
```

### Database migration errors
```bash
# Reset and re-run migrations (WARNING: destroys data)
npx prisma migrate reset
npx prisma migrate deploy
```

---

## ✅ Post-Deployment Checklist

- [ ] Database backups configured
- [ ] SSL certificate installed
- [ ] Firewall configured
- [ ] PM2 startup configured
- [ ] Environment variables secured
- [ ] Monitoring configured
- [ ] Domain DNS configured
- [ ] Test all API endpoints
- [ ] Test file upload functionality
- [ ] Verify charts and dashboard
- [ ] Check mobile responsiveness
- [ ] Review server logs
- [ ] Document admin credentials

---

**For production support, ensure you have monitoring, logging, and alerting systems in place.**
