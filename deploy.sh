#!/bin/bash

# Financial Management Application - DigitalOcean Deployment Script
# This script automates the deployment process on DigitalOcean

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/opt/finapp/app"
BACKEND_DIR="$APP_DIR/backend"
FRONTEND_DIR="$APP_DIR/frontend"
DB_NAME="financial_management"
DB_USER="finapp_user"
PM2_APP_NAME="financial-api"

echo -e "${YELLOW}========================================${NC}"
echo -e "${YELLOW}Financial Management - Deployment Script${NC}"
echo -e "${YELLOW}========================================${NC}"

# Function to print status
print_status() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

# Step 1: Update system
echo -e "\n${YELLOW}Step 1: Updating system packages...${NC}"
sudo apt update && sudo apt upgrade -y
print_status "System packages updated"

# Step 2: Install dependencies
echo -e "\n${YELLOW}Step 2: Installing dependencies...${NC}"
sudo apt install -y nodejs npm postgresql postgresql-contrib nginx certbot python3-certbot-nginx git

# Check if PM2 is installed globally
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
    print_status "PM2 installed globally"
else
    print_status "PM2 already installed"
fi

# Step 3: Setup application directory
echo -e "\n${YELLOW}Step 3: Setting up application directory...${NC}"
sudo mkdir -p /opt/finapp
sudo chown deploy:deploy /opt/finapp 2>/dev/null || true

# Step 4: Clone repository (if not already cloned)
if [ ! -d "$APP_DIR" ]; then
    echo -e "\n${YELLOW}Step 4: Cloning repository...${NC}"
    cd /opt/finapp
    git clone https://github.com/ahtrr5371-ui/kbzweb-financial-management.git app
    print_status "Repository cloned"
else
    echo -e "\n${YELLOW}Step 4: Updating repository...${NC}"
    cd $APP_DIR
    git pull origin master
    print_status "Repository updated"
fi

# Step 5: Setup PostgreSQL
echo -e "\n${YELLOW}Step 5: Configuring PostgreSQL...${NC}"
sudo -u postgres psql <<EOF
SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';
EOF

if [ $? -ne 0 ]; then
    sudo -u postgres psql <<EOF
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH ENCRYPTED PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
\c $DB_NAME
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
EOF
    print_status "PostgreSQL database and user created"
else
    print_status "PostgreSQL database already exists"
fi

# Step 6: Setup Backend
echo -e "\n${YELLOW}Step 6: Setting up backend...${NC}"
cd $BACKEND_DIR

# Create .env file if it doesn't exist
if [ ! -f ".env" ]; then
    cp .env.example .env
    print_status ".env file created from template"
    echo -e "${YELLOW}Please edit $BACKEND_DIR/.env with your configuration${NC}"
else
    print_status ".env file already exists"
fi

# Install dependencies
npm install --production
print_status "Backend dependencies installed"

# Create uploads directory
mkdir -p uploads
print_status "Uploads directory created"

# Run Prisma migrations
npx prisma migrate deploy
npx prisma generate
print_status "Database migrations completed"

# Step 7: Setup Frontend
echo -e "\n${YELLOW}Step 7: Setting up frontend...${NC}"
cd $FRONTEND_DIR

npm install
npm run build
print_status "Frontend built successfully"

# Step 8: Setup PM2
echo -e "\n${YELLOW}Step 8: Setting up PM2 process manager...${NC}"
cd $BACKEND_DIR

# Stop existing process if running
pm2 delete $PM2_APP_NAME 2>/dev/null || true

# Start new process
pm2 start server.js --name $PM2_APP_NAME
pm2 save
print_status "PM2 process started and saved"

# Setup PM2 startup
sudo pm2 startup systemd -u deploy --hp /home/deploy
print_status "PM2 startup configured"

# Step 9: Configure Nginx
echo -e "\n${YELLOW}Step 9: Configuring Nginx...${NC}"
sudo tee /etc/nginx/sites-available/financial-app > /dev/null <<'EOF'
server {
    listen 80;
    server_name _;

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
EOF

# Enable site
sudo ln -sf /etc/nginx/sites-available/financial-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
if sudo nginx -t; then
    sudo systemctl restart nginx
    print_status "Nginx configured and restarted"
else
    print_error "Nginx configuration test failed"
    exit 1
fi

# Step 10: Setup Firewall
echo -e "\n${YELLOW}Step 10: Configuring firewall...${NC}"
sudo ufw allow 22/tcp 2>/dev/null || true
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw enable -y 2>/dev/null || true
print_status "Firewall configured"

# Step 11: Setup Backups
echo -e "\n${YELLOW}Step 11: Setting up database backups...${NC}"
mkdir -p /opt/finapp/backups

sudo tee /opt/finapp/backup.sh > /dev/null <<'EOF'
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

sudo chmod +x /opt/finapp/backup.sh
print_status "Backup script created"

# Add to crontab if not already there
if ! sudo crontab -l 2>/dev/null | grep -q "backup.sh"; then
    (sudo crontab -l 2>/dev/null; echo "0 2 * * * /opt/finapp/backup.sh") | sudo crontab -
    print_status "Backup cron job added"
else
    print_status "Backup cron job already exists"
fi

# Final Status
echo -e "\n${GREEN}========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${GREEN}========================================${NC}"

echo -e "\n${YELLOW}Next steps:${NC}"
echo "1. Edit $BACKEND_DIR/.env with your database password and domain"
echo "2. Configure your domain DNS to point to this server's IP"
echo "3. Setup SSL certificate: sudo certbot --nginx"
echo "4. Verify application: curl http://localhost:5000/api/transactions"
echo "5. View logs: pm2 logs $PM2_APP_NAME"
echo ""
echo -e "${YELLOW}Application Status:${NC}"
pm2 status
