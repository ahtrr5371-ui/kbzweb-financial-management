# API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
Currently, no authentication is required. For production, implement JWT-based authentication.

---

## Transaction Endpoints

### 1. Upload Transactions File

Parse and import transactions from CSV or Excel file.

**Endpoint:** `POST /transactions/upload`

**Request:**
- Content-Type: `multipart/form-data`
- Body: Form data with `file` field containing CSV/XLSX file

**Response:**
```json
{
  "message": "Transactions processed successfully",
  "summary": {
    "total": 50,
    "saved": 45,
    "failed": 0,
    "duplicates": 5
  },
  "errors": []
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/transactions/upload \
  -F "file=@transactions.csv"
```

---

### 2. Get Transactions

Retrieve transactions with optional filtering and pagination.

**Endpoint:** `GET /transactions`

**Query Parameters:**
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 50)
- `category` (string): Filter by category
- `isIncome` (boolean): Filter by income/expense
- `startDate` (ISO date): Filter from date
- `endDate` (ISO date): Filter to date
- `search` (string): Search in description

**Response:**
```json
{
  "transactions": [
    {
      "id": "uuid",
      "transactionDateTime": "2024-01-15T09:30:00Z",
      "tmRefNo": "TXN001",
      "detailedDescription": "Salary Payment from ABC Company",
      "credit": 5000000,
      "debit": 0,
      "balance": 5000000,
      "category": "Salary/Income",
      "isIncome": true,
      "createdAt": "2024-01-15T10:00:00Z",
      "updatedAt": "2024-01-15T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total": 150,
    "pages": 3
  }
}
```

**Example:**
```bash
curl "http://localhost:5000/api/transactions?page=1&limit=20&category=Purchases&isIncome=false"
```

---

### 3. Get Summary Statistics

Get high-level financial summary for dashboard.

**Endpoint:** `GET /transactions/summary`

**Query Parameters:**
- `startDate` (ISO date): Optional start date
- `endDate` (ISO date): Optional end date

**Response:**
```json
{
  "totalIncome": 10500000,
  "totalExpense": 1250000,
  "netFlow": 9250000,
  "currentBalance": 7718000,
  "transactionCount": 150,
  "categoryBreakdown": {
    "Purchases": {
      "count": 25,
      "totalAmount": 450000,
      "isIncome": false
    },
    "Bill Payment": {
      "count": 8,
      "totalAmount": 320000,
      "isIncome": false
    }
  }
}
```

**Example:**
```bash
curl "http://localhost:5000/api/transactions/summary?startDate=2024-01-01&endDate=2024-01-31"
```

---

### 4. Get Trends

Get daily/weekly/monthly trends for charts.

**Endpoint:** `GET /transactions/trends`

**Query Parameters:**
- `period` (string): 'daily', 'weekly', or 'monthly' (default: 'daily')
- `startDate` (ISO date): Optional start date
- `endDate` (ISO date): Optional end date

**Response:**
```json
{
  "period": "daily",
  "data": [
    {
      "date": "2024-01-15",
      "income": 5000000,
      "expense": 125000,
      "count": 8
    },
    {
      "date": "2024-01-16",
      "income": 150000,
      "expense": 85500,
      "count": 5
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:5000/api/transactions/trends?period=daily&startDate=2024-01-01"
```

---

### 5. Delete Transaction

Delete a specific transaction.

**Endpoint:** `DELETE /transactions/:id`

**Response:**
```json
{
  "message": "Transaction deleted successfully"
}
```

**Example:**
```bash
curl -X DELETE http://localhost:5000/api/transactions/uuid-here
```

---

## Integration Endpoints

### 6. Sync Satellite Billing

Get user payment status for subscription renewal.

**Endpoint:** `GET /integration/satellite-billing/sync`

**Query Parameters:**
- `phoneNumber` (string): Filter by phone number
- `satelliteAccount` (string): Filter by satellite account
- `startDate` (ISO date): Filter payments from date
- `endDate` (ISO date): Filter payments to date

**Response:**
```json
{
  "timestamp": "2024-01-22T10:00:00Z",
  "userCount": 150,
  "activeSubscriptions": 142,
  "users": [
    {
      "userId": "uuid",
      "phoneNumber": "09123456789",
      "name": "John Doe",
      "email": "john@example.com",
      "satelliteAccount": "SAT-001",
      "subscriptionTier": "premium",
      "isActive": true,
      "lastPaymentDate": "2024-01-15T10:00:00Z",
      "lastPaymentAmount": 50000,
      "totalPaid": 150000,
      "paymentCount": 3,
      "nextRenewalDate": "2024-02-15T10:00:00Z",
      "daysUntilRenewal": 24
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:5000/api/integration/satellite-billing/sync?phoneNumber=09123456789"
```

---

### 7. Record Payment

Record a payment from CRM system.

**Endpoint:** `POST /integration/satellite-billing/payment`

**Request Body:**
```json
{
  "phoneNumber": "09123456789",
  "amount": 50000,
  "paymentDate": "2024-01-22T10:00:00Z",
  "paymentMethod": "KBZPay",
  "transactionRef": "TXN123456789",
  "billingPeriod": "2024-01"
}
```

**Response:**
```json
{
  "message": "Payment recorded successfully",
  "payment": {
    "id": "uuid",
    "userId": "uuid",
    "amount": 50000,
    "paymentDate": "2024-01-22T10:00:00Z",
    "paymentMethod": "KBZPay",
    "transactionRef": "TXN123456789",
    "status": "completed",
    "billingPeriod": "2024-01",
    "createdAt": "2024-01-22T10:00:00Z"
  },
  "user": {
    "id": "uuid",
    "phoneNumber": "09123456789",
    "isActive": true
  }
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/api/integration/satellite-billing/payment \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "09123456789",
    "amount": 50000,
    "paymentMethod": "KBZPay"
  }'
```

---

### 8. Get Renewal Alerts

Get users who need subscription renewal.

**Endpoint:** `GET /integration/satellite-billing/alerts`

**Query Parameters:**
- `daysThreshold` (number): Days before renewal to alert (default: 7)

**Response:**
```json
{
  "timestamp": "2024-01-22T10:00:00Z",
  "alertCount": 15,
  "critical": 3,
  "high": 5,
  "medium": 7,
  "alerts": [
    {
      "userId": "uuid",
      "phoneNumber": "09123456789",
      "name": "John Doe",
      "satelliteAccount": "SAT-001",
      "lastPaymentDate": "2023-12-25T10:00:00Z",
      "nextRenewalDate": "2024-01-25T10:00:00Z",
      "daysUntilRenewal": -2,
      "status": "overdue",
      "urgency": "critical"
    },
    {
      "userId": "uuid",
      "phoneNumber": "09987654321",
      "name": "Jane Smith",
      "satelliteAccount": "SAT-002",
      "lastPaymentDate": "2024-01-18T10:00:00Z",
      "nextRenewalDate": "2024-02-18T10:00:00Z",
      "daysUntilRenewal": 2,
      "status": "upcoming",
      "urgency": "high"
    }
  ]
}
```

**Example:**
```bash
curl "http://localhost:5000/api/integration/satellite-billing/alerts?daysThreshold=7"
```

---

### 9. Update User

Update user information.

**Endpoint:** `PUT /integration/users/:id`

**Request Body:**
```json
{
  "name": "John Doe Updated",
  "email": "newemail@example.com",
  "satelliteAccount": "SAT-001-NEW",
  "subscriptionTier": "premium",
  "isActive": true
}
```

**Response:**
```json
{
  "message": "User updated successfully",
  "user": {
    "id": "uuid",
    "phoneNumber": "09123456789",
    "name": "John Doe Updated",
    "email": "newemail@example.com",
    "satelliteAccount": "SAT-001-NEW",
    "isActive": true,
    "lastPaymentDate": "2024-01-15T10:00:00Z",
    "subscriptionTier": "premium",
    "createdAt": "2024-01-01T10:00:00Z",
    "updatedAt": "2024-01-22T10:00:00Z"
  }
}
```

**Example:**
```bash
curl -X PUT http://localhost:5000/api/integration/users/uuid-here \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Name",
    "subscriptionTier": "premium"
  }'
```

---

## Error Responses

All endpoints may return the following error responses:

**400 Bad Request**
```json
{
  "error": "Missing required fields: phoneNumber and amount"
}
```

**404 Not Found**
```json
{
  "error": "Route not found"
}
```

**500 Internal Server Error**
```json
{
  "error": "Failed to process transactions",
  "details": "Detailed error message here"
}
```

---

## Rate Limiting

For production, implement rate limiting:
- 100 requests per minute per IP for general endpoints
- 10 requests per minute for upload endpoint
- 1000 requests per hour for integration endpoints

---

## Notes

1. All dates should be in ISO 8601 format
2. Amounts are in the smallest currency unit (e.g., Kyats for MMK)
3. File uploads limited to 10MB
4. Supported file formats: CSV, XLSX, XLS
5. Duplicate transactions (same tmRefNo) are automatically skipped
6. All responses include appropriate HTTP status codes
