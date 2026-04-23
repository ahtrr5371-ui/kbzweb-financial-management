# 🚀 DigitalOcean App Platform Deployment Guide

## အမြန်ဆုံး Deploy လုပ်နည်း (3 Steps)

### Step 1: GitHub Repository Setup

```bash
# 1. GitHub မှာ repository အသစ်ဆောက်ပါ
# 2. Source code တွေကို push လုပ်ပါ

cd financial-management-complete

# Initialize Git
git init
git add .
git commit -m "Initial commit: Financial Management App"

# Add remote and push
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

### Step 2: DigitalOcean App Platform Setup

#### Option A: အလွယ်ဆုံး နည်း (UI မှတဆင့်)

1. **DigitalOcean Dashboard ကိုသွားပါ**
   - https://cloud.digitalocean.com/apps

2. **"Create App" ကို နှိပ်ပါ**

3. **GitHub Repository ကို ချိတ်ပါ**
   - Service Provider: GitHub ရွေးပါ
   - Repository: သင့် repo ကိုရွေးပါ
   - Branch: `main` ရွေးပါ
   - Autodeploy: ✅ အမှန်ခြစ်ပါ

4. **Resources ကို Configure လုပ်ပါ**

   **Backend Service:**
   - Name: `api`
   - Source Directory: `backend`
   - Build Command: `npm install && npx prisma generate`
   - Run Command: `node server.js`
   - HTTP Port: `5000`
   - HTTP Routes: `/api`
   - Environment Variables:
     ```
     NODE_ENV=production
     PORT=5000
     ```

   **Frontend Service:**
   - Name: `web`
   - Source Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Run Command: `npx serve -s dist -l 8080`
   - HTTP Port: `8080`
   - HTTP Routes: `/`

5. **Database ထည့်ပါ**
   - Add Resource → Database
   - Engine: PostgreSQL 14
   - Name: `financial-db`

6. **Environment Variables ချိတ်ပါ (Backend Service)**
   ```
   DATABASE_URL=${financial-db.DATABASE_URL}
   ```

7. **Deploy လုပ်ပါ!**
   - Review → "Create Resources"

---

#### Option B: App Spec YAML သုံးပြီး Deploy (Advanced)

1. **DigitalOcean Dashboard မှာ "Create App"**

2. **"Edit Your App Spec" ကို နှိပ်ပါ**

3. **အောက်က YAML code ကို ကူးထည့်ပါ:**

```yaml
name: financial-management-app
region: sgp1

databases:
  - name: financial-db
    engine: PG
    production: false
    version: "14"

services:
  - name: api
    source_dir: /backend
    build_command: npm install && npx prisma generate
    run_command: node server.js
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 5000
    routes:
      - path: /api
    envs:
      - key: DATABASE_URL
        scope: RUN_AND_BUILD_TIME
        type: SECRET
        value: ${financial-db.DATABASE_URL}
      - key: NODE_ENV
        scope: RUN_AND_BUILD_TIME
        value: production
      - key: PORT
        scope: RUN_AND_BUILD_TIME
        value: "5000"
    health_check:
      http_path: /health

  - name: web
    source_dir: /frontend
    build_command: npm install && npm run build
    run_command: npx serve -s dist -l 8080
    environment_slug: node-js
    instance_count: 1
    instance_size_slug: basic-xxs
    http_port: 8080
    routes:
      - path: /

jobs:
  - name: db-migrate
    source_dir: /backend
    kind: PRE_DEPLOY
    run_command: npx prisma migrate deploy
    environment_slug: node-js
    envs:
      - key: DATABASE_URL
        scope: RUN_TIME
        type: SECRET
        value: ${financial-db.DATABASE_URL}
```

4. **Save → Create Resources**

---

### Step 3: Database Migration

Deploy ပြီးရင် database migrations run ဖို့:

1. **Console/Terminal ဖွင့်ပါ (DigitalOcean Dashboard)**
   - Apps → Your App → Components → api → Console

2. **Migration Run လုပ်ပါ:**
   ```bash
   npx prisma migrate deploy
   ```

---

## 🔧 Frontend API URL Configuration

Frontend က Backend ကို ခေါ်ဖို့ URL လိုပါတယ်:

### နည်း 1: Build Time Environment Variable

`frontend/vite.config.js` ကို ပြင်ပါ:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify(
      process.env.VITE_API_URL || 'http://localhost:5000'
    )
  },
  server: {
    port: 5173,
    host: true
  }
})
```

`frontend/src/components/*.jsx` files မှာ:

```javascript
const API_BASE_URL = import.meta.env.VITE_API_URL + '/api' || 'http://localhost:5000/api';
```

### နည်း 2: Relative URLs (အကောင်းဆုံး)

DigitalOcean App Platform က automatic routing လုပ်ပေးတဲ့အတွက် relative URLs သုံးနိုင်ပါတယ်:

အားလုံး component files မှာ:
```javascript
const API_BASE_URL = '/api';  // localhost:5000/api အစား
```

---

## 📁 Required File Structure for DigitalOcean

```
your-repo/
├── package.json          # Root package.json (detection)
├── backend/
│   ├── package.json
│   ├── server.js
│   ├── prisma/
│   │   └── schema.prisma
│   └── ...
├── frontend/
│   ├── package.json
│   ├── vite.config.js
│   └── ...
└── .do/
    └── app.yaml         # Optional: App spec
```

---

## 🐛 Common Issues & Solutions

### Issue 1: "No components detected"

**Solution:** Root မှာ `package.json` ထည့်ပါ (ဒီ guide မှာ ပါပြီးသား)

### Issue 2: Build Failed

**Solution:** 
```bash
# Backend build command မှာ
npm install && npx prisma generate

# Frontend build command မှာ  
npm install && npm run build
```

### Issue 3: Database Connection Failed

**Solution:** Environment variable မှာ
```
DATABASE_URL=${financial-db.DATABASE_URL}
```
ဒါကို အသုံးပြုပါ။

### Issue 4: Prisma Migrations

**Solution:** Pre-deploy job ထည့်ပါ:
```yaml
jobs:
  - name: db-migrate
    kind: PRE_DEPLOY
    run_command: npx prisma migrate deploy
```

### Issue 5: Frontend can't reach Backend

**Solution:** API_BASE_URL ကို relative path သုံးပါ:
```javascript
const API_BASE_URL = '/api';
```

---

## 💰 Cost Estimate (Monthly)

- **Basic Plan:**
  - Backend (Basic - $5/month)
  - Frontend (Basic - $5/month)
  - PostgreSQL DB (Dev Database - $7/month)
  - **Total: ~$17/month**

- **Professional Plan:**
  - Backend (Professional - $12/month)
  - Frontend (Professional - $12/month)
  - PostgreSQL DB (Basic - $15/month)
  - **Total: ~$39/month**

---

## 🔒 Security Settings

### 1. Environment Variables (Backend)

```
DATABASE_URL=${financial-db.DATABASE_URL}
NODE_ENV=production
PORT=5000
ALLOWED_ORIGINS=${web.PUBLIC_URL}
```

### 2. CORS Configuration

`backend/server.js` မှာ:

```javascript
const cors = require('cors');

app.use(cors({
  origin: process.env.ALLOWED_ORIGINS || '*',
  credentials: true
}));
```

---

## 📊 Monitoring & Logs

### View Logs:
1. DigitalOcean Dashboard
2. Apps → Your App
3. Runtime Logs

### Health Checks:
- Backend: `https://your-app.ondigitalocean.app/api/health`
- Frontend: `https://your-app.ondigitalocean.app/`

---

## 🔄 Continuous Deployment

Git push လုပ်တိုင်း automatic deploy ဖြစ်ပါတယ်:

```bash
git add .
git commit -m "Update features"
git push origin main
```

5-10 minutes အတွင်း live ရောက်ပါမယ်!

---

## ✅ Deployment Checklist

- [ ] GitHub repository created
- [ ] Code pushed to GitHub
- [ ] DigitalOcean App created
- [ ] Backend service configured
- [ ] Frontend service configured
- [ ] Database added
- [ ] Environment variables set
- [ ] Migrations run successfully
- [ ] Health check passing
- [ ] Frontend can access backend API
- [ ] Test upload CSV file
- [ ] Verify charts display correctly

---

## 🆘 Need Help?

1. **Check Runtime Logs** - Most errors show here
2. **Verify Environment Variables** - DATABASE_URL အရေးကြီးဆုံး
3. **Test Health Endpoint** - `/api/health` 
4. **Check Build Logs** - Build failures ကြည့်ပါ

---

**Deploy လုပ်ပြီးရင် https://your-app-name.ondigitalocean.app မှာ live ရောက်သွားပါမယ်! 🚀**
