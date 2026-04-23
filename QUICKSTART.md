# 🚀 Quick Start Guide

Get your Financial Management application running in 5 minutes!

## Prerequisites
- Node.js 18+ installed
- PostgreSQL 14+ installed and running
- Terminal/Command Prompt

---

## Step 1: Database Setup

Open PostgreSQL and run:

```sql
CREATE DATABASE financial_management;
CREATE USER finapp WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE financial_management TO finapp;
```

---

## Step 2: Backend Setup

```bash
# Navigate to backend
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Edit .env and update DATABASE_URL
# DATABASE_URL="postgresql://finapp:your_password@localhost:5432/financial_management?schema=public"

# Run database migrations
npx prisma migrate dev --name init
npx prisma generate

# Create uploads directory
mkdir -p uploads

# Start backend server
npm run dev
```

Backend will run on **http://localhost:5000**

---

## Step 3: Frontend Setup

Open a new terminal:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

Frontend will run on **http://localhost:5173**

---

## Step 4: Test the Application

1. Open browser: **http://localhost:5173**
2. Click "Upload Transactions"
3. Upload the included `sample-transactions.csv`
4. Watch the dashboard populate with charts and data!

---

## 🎯 What's Next?

### Test the API Endpoints

```bash
# Get summary
curl http://localhost:5000/api/transactions/summary

# Get transactions
curl http://localhost:5000/api/transactions?limit=10

# Get trends
curl http://localhost:5000/api/transactions/trends?period=daily
```

### Explore Integration APIs

```bash
# Sync billing (after uploading transactions)
curl http://localhost:5000/api/integration/satellite-billing/sync

# Record a payment
curl -X POST http://localhost:5000/api/integration/satellite-billing/payment \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "09123456789",
    "amount": 50000,
    "paymentMethod": "KBZPay"
  }'

# Get renewal alerts
curl http://localhost:5000/api/integration/satellite-billing/alerts
```

---

## 📊 Understanding the Data Flow

1. **Upload CSV/Excel** → File Parser Service → Database
2. **Smart Categorization** → Auto-assigns categories based on keywords
3. **Dashboard** → Fetches summary, trends, transactions
4. **Integration API** → CRM systems sync payment data

---

## 🔧 Troubleshooting

### "Port 5000 already in use"
```bash
# Change PORT in backend/.env
PORT=5001
```

### "Database connection failed"
- Verify PostgreSQL is running: `sudo systemctl status postgresql`
- Check DATABASE_URL in `.env`
- Ensure database and user exist

### "Module not found"
```bash
# Reinstall dependencies
npm install
```

### "Prisma Client not found"
```bash
npx prisma generate
```

---

## 📚 Next Steps

- Read [README.md](./README.md) for full documentation
- Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md) for API details
- Review [DEPLOYMENT.md](./DEPLOYMENT.md) for production deployment
- Customize categories in `backend/services/categorizationService.js`
- Add authentication for production use

---

## 🎨 Customize

### Change Dashboard Colors
Edit `frontend/src/pages/Dashboard.jsx` and component files

### Add New Categories
Edit `backend/services/categorizationService.js`

### Modify CSV Columns
Edit `backend/services/fileParserService.js`

---

## 💡 Features to Try

✅ Upload different transaction files  
✅ Filter transactions by category  
✅ Search transactions  
✅ View income vs expense trends  
✅ Check category breakdown pie chart  
✅ Delete unwanted transactions  
✅ Test integration API endpoints  

---

**Happy Financial Tracking! 💰📊**
