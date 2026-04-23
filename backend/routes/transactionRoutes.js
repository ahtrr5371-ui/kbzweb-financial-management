const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// Get upload middleware from app.locals
const getUpload = (req) => req.app.locals.upload;

/**
 * POST /api/transactions/upload
 * Upload and parse transaction file (CSV or Excel)
 */
router.post('/upload', (req, res, next) => {
  const upload = getUpload(req);
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, transactionController.uploadTransactions);

/**
 * GET /api/transactions
 * Get all transactions with optional filtering
 * Query params: page, limit, category, isIncome, startDate, endDate, search
 */
router.get('/', transactionController.getTransactions);

/**
 * GET /api/transactions/summary
 * Get dashboard summary statistics
 * Query params: startDate, endDate
 */
router.get('/summary', transactionController.getSummary);

/**
 * GET /api/transactions/trends
 * Get daily/weekly/monthly trends for charts
 * Query params: period (daily/weekly/monthly), startDate, endDate
 */
router.get('/trends', transactionController.getTrends);

/**
 * DELETE /api/transactions/:id
 * Delete a specific transaction
 */
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;
