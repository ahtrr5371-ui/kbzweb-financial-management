const { PrismaClient } = require('@prisma/client');
const fileParserService = require('../services/fileParserService');
const categorizationService = require('../services/categorizationService');
const fs = require('fs');

const prisma = new PrismaClient();

/**
 * Upload and parse transaction file
 * POST /api/transactions/upload
 */
const uploadTransactions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }
    
    const filePath = req.file.path;
    
    // Parse the file
    const transactions = await fileParserService.parseTransactionFile(filePath);
    
    // Save transactions to database
    const result = await fileParserService.saveTransactions(
      transactions,
      categorizationService
    );
    
    // Clean up uploaded file
    fs.unlinkSync(filePath);
    
    res.json({
      message: 'Transactions processed successfully',
      summary: {
        total: transactions.length,
        saved: result.success,
        failed: result.failed,
        duplicates: transactions.length - result.success - result.failed
      },
      ...(result.errors.length > 0 && { errors: result.errors })
    });
    
  } catch (error) {
    console.error('Upload error:', error);
    
    // Clean up file if exists
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {}
    }
    
    res.status(500).json({
      error: 'Failed to process transactions',
      details: error.message
    });
  }
};

/**
 * Get all transactions with filtering and pagination
 * GET /api/transactions
 */
const getTransactions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      category,
      isIncome,
      startDate,
      endDate,
      search
    } = req.query;
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    // Build where clause
    const where = {};
    
    if (category) {
      where.category = category;
    }
    
    if (isIncome !== undefined) {
      where.isIncome = isIncome === 'true';
    }
    
    if (startDate || endDate) {
      where.transactionDateTime = {};
      if (startDate) {
        where.transactionDateTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDateTime.lte = new Date(endDate);
      }
    }
    
    if (search) {
      where.detailedDescription = {
        contains: search,
        mode: 'insensitive'
      };
    }
    
    // Get transactions
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        transactionDateTime: 'desc'
      },
      skip,
      take: parseInt(limit)
    });
    
    // Get total count
    const total = await prisma.transaction.count({ where });
    
    res.json({
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
    
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({
      error: 'Failed to fetch transactions',
      details: error.message
    });
  }
};

/**
 * Get dashboard summary statistics
 * GET /api/transactions/summary
 */
const getSummary = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.transactionDateTime = {};
      if (startDate) {
        where.transactionDateTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDateTime.lte = new Date(endDate);
      }
    }
    
    // Get all transactions for the period
    const transactions = await prisma.transaction.findMany({ where });
    
    // Calculate totals
    const totalIncome = transactions
      .filter(t => t.isIncome)
      .reduce((sum, t) => sum + parseFloat(t.credit), 0);
    
    const totalExpense = transactions
      .filter(t => !t.isIncome)
      .reduce((sum, t) => sum + parseFloat(t.debit), 0);
    
    // Get latest balance
    const latestTransaction = await prisma.transaction.findFirst({
      orderBy: { transactionDateTime: 'desc' }
    });
    
    const currentBalance = latestTransaction ? parseFloat(latestTransaction.balance) : 0;
    
    // Category breakdown
    const categoryStats = categorizationService.getCategoryStats(transactions);
    
    res.json({
      totalIncome,
      totalExpense,
      netFlow: totalIncome - totalExpense,
      currentBalance,
      transactionCount: transactions.length,
      categoryBreakdown: categoryStats
    });
    
  } catch (error) {
    console.error('Summary error:', error);
    res.status(500).json({
      error: 'Failed to generate summary',
      details: error.message
    });
  }
};

/**
 * Get daily/weekly trends for charts
 * GET /api/transactions/trends
 */
const getTrends = async (req, res) => {
  try {
    const { period = 'daily', startDate, endDate } = req.query;
    
    const where = {};
    if (startDate || endDate) {
      where.transactionDateTime = {};
      if (startDate) {
        where.transactionDateTime.gte = new Date(startDate);
      }
      if (endDate) {
        where.transactionDateTime.lte = new Date(endDate);
      }
    }
    
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: { transactionDateTime: 'asc' }
    });
    
    // Group by date
    const trends = {};
    
    transactions.forEach(txn => {
      const date = new Date(txn.transactionDateTime);
      let key;
      
      if (period === 'daily') {
        key = date.toISOString().split('T')[0];
      } else if (period === 'weekly') {
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - date.getDay());
        key = weekStart.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      
      if (!trends[key]) {
        trends[key] = { date: key, income: 0, expense: 0, count: 0 };
      }
      
      if (txn.isIncome) {
        trends[key].income += parseFloat(txn.credit);
      } else {
        trends[key].expense += parseFloat(txn.debit);
      }
      trends[key].count++;
    });
    
    res.json({
      period,
      data: Object.values(trends)
    });
    
  } catch (error) {
    console.error('Trends error:', error);
    res.status(500).json({
      error: 'Failed to generate trends',
      details: error.message
    });
  }
};

/**
 * Delete a transaction
 * DELETE /api/transactions/:id
 */
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;
    
    await prisma.transaction.delete({
      where: { id }
    });
    
    res.json({ message: 'Transaction deleted successfully' });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({
      error: 'Failed to delete transaction',
      details: error.message
    });
  }
};

module.exports = {
  uploadTransactions,
  getTransactions,
  getSummary,
  getTrends,
  deleteTransaction
};
