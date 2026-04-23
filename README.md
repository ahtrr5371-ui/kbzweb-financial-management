# Financial Management & Dashboard Web Application

A comprehensive full-stack application for tracking income and expenses by parsing transaction history files (KBZPay, mobile money CSV/Excel files). Features smart categorization, interactive dashboards, and API endpoints for satellite internet billing system integration.

## 🚀 Features

### Core Functionality
- **Smart Data Parsing Engine**: Upload CSV/Excel files with automatic parsing and cleaning
- **Intelligent Categorization**: Auto-assigns categories based on transaction descriptions
- **Interactive Dashboard**: Real-time financial insights with charts and analytics
- **Transaction Management**: Filter, search, and manage all transactions
- **API Integration**: REST endpoints for CRM and billing system integration

### Dashboard Components
- **Summary Cards**: Total Income, Total Expense, Net Flow, Current Balance
- **Bar Chart**: Daily/Weekly income vs expense trends
- **Pie Chart**: Expense breakdown by category
- **Transaction Table**: Searchable and filterable transaction list

### Integration API
- **Billing Sync**: `/api/integration/satellite-billing/sync` - Fetch user payment status
- **Payment Recording**: `/api/integration/satellite-billing/payment` - Record payments from CRM
- **Renewal Alerts**: `/api/integration/satellite-billing/alerts` - Get subscription renewal alerts
- **User Management**: `/api/integration/users/:id` - Update user information

## 🛠 Tech Stack

### Backend
- **Node.js** + **Express.js** - REST API server
- **PostgreSQL** - Relational database
- **Prisma ORM** - Type-safe database access
- **Multer** - File upload handling
- **csv-parser** - CSV file parsing
- **xlsx** - Excel file parsing

### Frontend
- **React 18** (Vite) - UI framework
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **Axios** - HTTP client

## 📁 Project Structure

```
financial-management/
├── backend/
│   ├── controllers/
│   │   ├── transactionController.js    # Transaction CRUD operations
│   │   └── integrationController.js    # Satellite billing API
│   ├── services/
│   │   ├── fileParserService.js        # CSV/Excel parsing
│   │   └── categorizationService.js    # Smart categorization
│   ├── routes/
│   │   ├── transactionRoutes.js        # Transaction endpoints
│   │   └── apiRoutes.js                # Integration endpoints
│   ├── prisma/
│   │   └── schema.prisma               # Database schema
│   ├── uploads/                        # Temporary file storage
│   ├── server.js                       # Express server
│   ├── package.json
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── DashboardCharts.jsx     # Bar & Pie charts
    │   │   ├── FileUploadCard.jsx      # File upload UI
    │   │   └── TransactionTable.jsx    # Transaction list
    │   ├── pages/
    │   │   └── Dashboard.jsx           # Main dashboard
    │   ├── App.jsx                     # Root component
    │   ├── main.jsx                    # React entry point
    │   └── App.css                     # Styles
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── tailwind.config.js
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- PostgreSQL 14+
- Git

### Backend Setup

1. **Navigate to backend directory**
```bash
cd backend
```

2. **Install dependencies**
```bash
npm install
```

3. **Configure environment variables**
```bash
cp .env.example .env
```

Edit `.env` and update the database connection:
```env
DATABASE_URL="postgresql://username:password@localhost:5432/financial_management?schema=public"
PORT=5000
NODE_ENV=development
```

4. **Create uploads directory**
```bash
mkdir uploads
```

5. **Run Prisma migrations**
```bash
npx prisma migrate dev --name init
npx prisma generate
```

6. **Start the backend server**
```bash
npm run dev
```

The API will be running at `http://localhost:5000`

### Frontend Setup

1. **Navigate to frontend directory**
```bash
cd frontend
```

2. **Install dependencies**
```bash
npm install
```

3. **Start the development server**
```bash
npm run dev
```

The frontend will be running at `http://localhost:5173`

### Database Schema

The application uses the following main tables:

**Transactions Table:**
- `id` (UUID, Primary Key)
- `transactionDateTime` (DateTime)
- `tmRefNo` (String, Unique)
- `detailedDescription` (String)
- `credit` (Decimal)
- `debit` (Decimal)
- `balance` (Decimal)
- `category` (String, nullable)
- `isIncome` (Boolean)

**Users Table:**
- `id` (UUID, Primary Key)
- `phoneNumber` (String, Unique)
- `name` (String, nullable)
- `email` (String, nullable)
- `satelliteAccount` (String, nullable)
- `isActive` (Boolean)
- `lastPaymentDate` (DateTime, nullable)
- `subscriptionTier` (String)

**Payments Table:**
- `id` (UUID, Primary Key)
- `userId` (UUID, Foreign Key)
- `amount` (Decimal)
- `paymentDate` (DateTime)
- `paymentMethod` (String)
- `transactionRef` (String, nullable)
- `status` (String)
- `billingPeriod` (String, nullable)

## 📊 CSV File Format

The application expects CSV/Excel files with the following columns:

```csv
Transaction Date & Time,Tm_Ref_No,Detailed Description,Credit,Debit,Balance
2024-01-15 14:30:00,TXN123456789,Transfer to User A,0,"1,000.00","50,000.00"
2024-01-15 15:45:00,TXN123456790,Payment from Company B,"5,000.00",0,"55,000.00"
```

The parser will:
- Clean commas from amount strings
- Parse dates in multiple formats
- Auto-categorize based on description
- Handle duplicates (skip existing transactions)

## 🔌 API Endpoints

### Transaction Endpoints

**Upload Transactions**
```http
POST /api/transactions/upload
Content-Type: multipart/form-data

file: <CSV or Excel file>
```

**Get Transactions**
```http
GET /api/transactions?page=1&limit=50&category=Purchases&isIncome=false&search=keyword
```

**Get Summary**
```http
GET /api/transactions/summary?startDate=2024-01-01&endDate=2024-12-31
```

**Get Trends**
```http
GET /api/transactions/trends?period=daily&startDate=2024-01-01
```

**Delete Transaction**
```http
DELETE /api/transactions/:id
```

### Integration Endpoints

**Sync Billing Data**
```http
GET /api/integration/satellite-billing/sync?phoneNumber=09123456789
```

**Record Payment**
```http
POST /api/integration/satellite-billing/payment
Content-Type: application/json

{
  "phoneNumber": "09123456789",
  "amount": 50000,
  "paymentDate": "2024-01-15T10:00:00Z",
  "paymentMethod": "KBZPay",
  "transactionRef": "TXN123456789",
  "billingPeriod": "2024-01"
}
```

**Get Renewal Alerts**
```http
GET /api/integration/satellite-billing/alerts?daysThreshold=7
```

**Update User**
```http
PUT /api/integration/users/:id
Content-Type: application/json

{
  "name": "John Doe",
  "email": "john@example.com",
  "satelliteAccount": "SAT-001",
  "subscriptionTier": "premium",
  "isActive": true
}
```

## 🎨 Smart Categorization

The system automatically categorizes transactions based on keywords:

- **Crypto/Binance P2P**: binance, p2p, crypto, btc, eth, usdt
- **P2P Transfer**: transfer to, transfer from, sent to, received from
- **Bill Payment**: bill payment, utility, electricity, water, internet, satellite
- **Mobile Top-up**: top up, mobile recharge, airtime
- **Purchases**: purchase, payment for, buy, shopping
- **Salary/Income**: salary, income, wages, payment received
- **Bank Transfer**: bank transfer, atm withdrawal, deposit
- **Food & Dining**: restaurant, cafe, food, dining
- **Transportation**: taxi, grab, uber, fuel
- **Entertainment**: movie, cinema, game, netflix, spotify
- **Healthcare**: hospital, clinic, medical, pharmacy

You can extend categories by modifying `backend/services/categorizationService.js`

## 🔒 Security Considerations

For production deployment:
- Enable HTTPS
- Set up CORS whitelist
- Implement authentication (JWT)
- Add rate limiting
- Sanitize file uploads
- Use environment variables for secrets
- Enable PostgreSQL SSL
- Deploy in DMZ architecture

## 📈 Future Enhancements

- [ ] User authentication and authorization
- [ ] Multi-currency support
- [ ] Budget planning and alerts
- [ ] Recurring transaction detection
- [ ] Export reports (PDF, Excel)
- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] AI-powered insights and predictions

## 🤝 Integration with CRM

The satellite billing endpoints allow seamless integration with CRM systems:

1. **Automatic Renewal Detection**: CRM can query `/alerts` to find users needing renewal
2. **Payment Synchronization**: Record payments from multiple channels via `/payment` endpoint
3. **User Status Updates**: Keep user subscription status in sync
4. **Custom Billing Periods**: Track monthly, quarterly, or annual subscriptions

## 📝 License

MIT License - Feel free to use this project for your business needs.

## 🆘 Support

For issues or questions, please create an issue in the repository or contact the development team.

---

**Built with ❤️ for smart financial management**
