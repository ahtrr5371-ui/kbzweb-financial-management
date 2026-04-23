const fs = require('fs');
const csv = require('csv-parser');
const xlsx = require('xlsx');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Clean amount string by removing commas and converting to number
 * Example: "1,234.56" -> 1234.56
 */
const cleanAmount = (amountStr) => {
  if (!amountStr || amountStr === '' || amountStr === '-') return 0;
  // Remove commas and convert to float
  const cleaned = String(amountStr).replace(/,/g, '');
  return parseFloat(cleaned) || 0;
};

/**
 * Parse date string in various formats
 * Handles formats like: "2024-01-15 14:30:00", "15/01/2024 14:30", etc.
 */
const parseDateTime = (dateStr) => {
  if (!dateStr) return new Date();
  
  // Try parsing as-is first
  const parsed = new Date(dateStr);
  if (!isNaN(parsed.getTime())) return parsed;
  
  // Handle DD/MM/YYYY HH:MM:SS format
  const ddmmyyyyMatch = dateStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?/);
  if (ddmmyyyyMatch) {
    const [, day, month, year, hour, minute, second = 0] = ddmmyyyyMatch;
    return new Date(year, month - 1, day, hour, minute, second);
  }
  
  return new Date();
};

/**
 * Parse CSV file and extract transactions
 */
const parseCSV = (filePath) => {
  return new Promise((resolve, reject) => {
    const transactions = [];
    
    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        // Map CSV columns to our schema
        // Adjust these column names based on your actual CSV headers
        const transaction = {
          transactionDateTime: parseDateTime(row['Transaction Date & Time'] || row['Date'] || row['DateTime']),
          tmRefNo: row['Tm_Ref_No'] || row['Reference'] || row['Ref No'] || `TXN-${Date.now()}-${Math.random()}`,
          detailedDescription: row['Detailed Description'] || row['Description'] || '',
          credit: cleanAmount(row['Credit'] || row['Income'] || 0),
          debit: cleanAmount(row['Debit'] || row['Expense'] || 0),
          balance: cleanAmount(row['Balance'] || 0)
        };
        
        transactions.push(transaction);
      })
      .on('end', () => {
        resolve(transactions);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
};

/**
 * Parse Excel file and extract transactions
 */
const parseExcel = (filePath) => {
  try {
    const workbook = xlsx.readFile(filePath);
    const sheetName = workbook.SheetNames[0]; // Get first sheet
    const worksheet = workbook.Sheets[sheetName];
    const jsonData = xlsx.utils.sheet_to_json(worksheet);
    
    const transactions = jsonData.map((row) => ({
      transactionDateTime: parseDateTime(row['Transaction Date & Time'] || row['Date'] || row['DateTime']),
      tmRefNo: row['Tm_Ref_No'] || row['Reference'] || row['Ref No'] || `TXN-${Date.now()}-${Math.random()}`,
      detailedDescription: row['Detailed Description'] || row['Description'] || '',
      credit: cleanAmount(row['Credit'] || row['Income'] || 0),
      debit: cleanAmount(row['Debit'] || row['Expense'] || 0),
      balance: cleanAmount(row['Balance'] || 0)
    }));
    
    return transactions;
  } catch (error) {
    throw new Error(`Excel parsing failed: ${error.message}`);
  }
};

/**
 * Main function to parse file based on extension
 */
const parseTransactionFile = async (filePath) => {
  const extension = filePath.split('.').pop().toLowerCase();
  
  let transactions;
  if (extension === 'csv') {
    transactions = await parseCSV(filePath);
  } else if (extension === 'xlsx' || extension === 'xls') {
    transactions = await parseExcel(filePath);
  } else {
    throw new Error('Unsupported file format. Please upload CSV or Excel file.');
  }
  
  return transactions;
};

/**
 * Save parsed transactions to database with categorization
 */
const saveTransactions = async (transactions, categorizationService) => {
  const savedTransactions = [];
  const errors = [];
  
  for (const txn of transactions) {
    try {
      // Auto-categorize the transaction
      const { category, isIncome } = categorizationService.categorizeTransaction(txn);
      
      // Check if transaction already exists
      const existing = await prisma.transaction.findUnique({
        where: { tmRefNo: txn.tmRefNo }
      });
      
      if (existing) {
        // Skip duplicate transactions
        continue;
      }
      
      // Create new transaction
      const saved = await prisma.transaction.create({
        data: {
          ...txn,
          category,
          isIncome
        }
      });
      
      savedTransactions.push(saved);
    } catch (error) {
      errors.push({
        transaction: txn,
        error: error.message
      });
    }
  }
  
  return {
    success: savedTransactions.length,
    failed: errors.length,
    savedTransactions,
    errors
  };
};

module.exports = {
  parseTransactionFile,
  saveTransactions,
  cleanAmount,
  parseDateTime
};
