# DigitalOcean App Platform Deployment Guide

This guide explains how to deploy the Financial Management application using DigitalOcean's App Platform.

## 📋 Prerequisites

- DigitalOcean account
- GitHub repository (already set up)
- Domain name (optional but recommended)

---

## 🚀 Deployment Steps

### Step 1: Connect GitHub to DigitalOcean

1. Go to [DigitalOcean Console](https://cloud.digitalocean.com)
2. Click **Apps** in the left sidebar
3. Click **Create App**
4. Select **GitHub** as the source
5. Authorize DigitalOcean to access your GitHub account
6. Select the repository: `kbzweb-financial-management`
7. Select branch: `master`
8. Click **Next**

### Step 2: Configure Services

The app will auto-detect services from the repository. You should see:

- **Backend API Service** (Node.js)
- **Frontend Web Service** (React)
- **PostgreSQL Database**

#### Backend Configuration

1. **Name**: `api`
2. **Build Command**: `npm install --production`
3. **Run Command**: `node server.js`
4. **HTTP Port**: `5000`
5. **Environment Variables**:
   ```
   NODE_ENV=production
   DATABASE_URL=<auto-populated by DigitalOcean>
   PORT=5000
   ALLOWED_ORIGINS=https://<your-domain>
   MAX_FILE_SIZE=10485760
   ```

#### Frontend Configuration

1. **Name**: `web`
2. **Build Command**: `npm install && npm run build`
3. **Run Command**: `npm start` (or nginx for production)
4. **HTTP Port**: `80` (or `3000` for development)
5. **Environment Variables**:
   ```
   REACT_APP_API_URL=https://<api-domain>/api
   ```

#### Database Configuration

1. **Engine**: PostgreSQL
2. **Version**: 14
3. **Name**: `db`
4. **Note the connection string** for later use

### Step 3: Set Environment Variables

In the App Platform console, add these environment variables:

```
DATABASE_URL=postgresql://[user]:[password]@[host]:[port]/[database]
NODE_ENV=production
ALLOWED_ORIGINS=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

### Step 4: Configure Domains

1. In the App Platform console, go to **Settings** → **Domains**
2. Add your domain (e.g., `yourdomain.com`)
3. Update your DNS records:
   - Create an A record pointing to the DigitalOcean App Platform IP
   - Or use CNAME record pointing to the app's domain

### Step 5: Deploy

1. Review all configurations
2. Click **Create App**
3. DigitalOcean will:
   - Clone your repository
   - Build Docker images
   - Provision PostgreSQL database
   - Deploy services
   - Configure load balancing

The deployment typically takes 5-10 minutes.

### Step 6: Verify Deployment

Once deployed:

1. Visit your application URL
2. Check the backend API: `https://yourdomain.com/api/transactions`
3. View logs in the App Platform console
4. Monitor resource usage

---

## 🔄 Updating Your Application

To deploy updates:

1. Push changes to the `master` branch on GitHub
2. DigitalOcean will automatically detect the changes
3. Click **Deploy** in the App Platform console
4. Or enable auto-deployment in settings

### Manual Deployment

```bash
# Make changes to your code
git add .
git commit -m "Your changes"
git push origin master

# DigitalOcean will automatically trigger a new deployment
```

---

## 🔐 Security Considerations

### 1. Environment Variables

Store sensitive data in environment variables:
- Database credentials
- API keys
- CORS origins

### 2. Database Backups

Enable automated backups in DigitalOcean:
1. Go to **Databases** → Your Database
2. Enable **Automated Backups**
3. Set backup frequency (daily recommended)

### 3. SSL/TLS Certificates

DigitalOcean App Platform automatically provisions SSL certificates via Let's Encrypt.

### 4. Firewall Rules

Configure firewall rules to restrict access:
1. Go to **Networking** → **Firewalls**
2. Create rules for your app

---

## 📊 Monitoring

### View Logs

1. In App Platform console, click **Logs**
2. Select service (API or Web)
3. View real-time logs

### Monitor Resources

1. Click **Metrics** in the console
2. Monitor CPU, Memory, Disk usage
3. Set up alerts for resource thresholds

### Database Monitoring

1. Go to **Databases** → Your Database
2. View connection count, query performance
3. Monitor disk usage

---

## 🆘 Troubleshooting

### Application won't start

1. Check logs: **App Platform Console** → **Logs**
2. Verify environment variables are set correctly
3. Check database connection string
4. Ensure Node.js version compatibility

### Database connection error

```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution:**
- Verify DATABASE_URL is set correctly
- Check database is running
- Ensure database credentials are correct

### Frontend shows 404 errors

1. Verify build command completed successfully
2. Check that `npm run build` creates a `dist` folder
3. Verify nginx configuration (if using custom nginx)

### API requests fail

1. Check CORS configuration
2. Verify ALLOWED_ORIGINS environment variable
3. Check API service logs

---

## 💰 Cost Optimization

### Reduce Costs

1. **Use smaller instances** for low-traffic apps
2. **Enable auto-scaling** based on CPU/Memory
3. **Use shared databases** instead of dedicated
4. **Remove unused services**

### Monitor Costs

1. Go to **Billing** → **Invoices**
2. Review resource usage
3. Set up billing alerts

---

## 🔄 Scaling Your Application

### Horizontal Scaling

Increase instance count in App Platform:
1. Go to **Services** → Your Service
2. Increase **Instance Count**
3. DigitalOcean handles load balancing

### Vertical Scaling

Upgrade instance size:
1. Go to **Services** → Your Service
2. Change **Instance Size**
3. Service will restart with new resources

### Database Scaling

Upgrade database plan:
1. Go to **Databases** → Your Database
2. Click **Resize**
3. Choose new plan

---

## 📝 Best Practices

### 1. Use Environment Variables

Never hardcode sensitive data:
```javascript
// ❌ Bad
const dbUrl = "postgresql://user:pass@host/db";

// ✅ Good
const dbUrl = process.env.DATABASE_URL;
```

### 2. Implement Health Checks

Add health check endpoints:
```javascript
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});
```

### 3. Use Structured Logging

Log in JSON format for better analysis:
```javascript
console.log(JSON.stringify({
  timestamp: new Date(),
  level: 'info',
  message: 'Application started'
}));
```

### 4. Implement Rate Limiting

Protect API from abuse:
```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100
});

app.use('/api/', limiter);
```

### 5. Regular Updates

Keep dependencies updated:
```bash
npm update
npm audit fix
```

---

## ✅ Post-Deployment Checklist

- [ ] Application is accessible via domain
- [ ] API endpoints are responding
- [ ] Database is connected and working
- [ ] SSL certificate is installed
- [ ] Environment variables are set
- [ ] Logs are being generated
- [ ] Backups are configured
- [ ] Monitoring is enabled
- [ ] Domain DNS is configured
- [ ] Application is performant

---

## 📞 Support

For issues or questions:
1. Check DigitalOcean documentation
2. Review application logs
3. Check GitHub issues
4. Contact DigitalOcean support

---

**Your Financial Management application is now deployed on DigitalOcean App Platform!** 🚀
