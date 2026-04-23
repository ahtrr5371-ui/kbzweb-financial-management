/**
 * Smart Categorization Service
 * Analyzes transaction descriptions and assigns appropriate categories
 */

const categoryRules = [
  {
    category: 'Crypto/Binance P2P',
    keywords: ['binance', 'p2p', 'crypto', 'btc', 'eth', 'usdt', 'cryptocurrency', 'bitcoin', 'ethereum'],
    priority: 10
  },
  {
    category: 'P2P Transfer',
    keywords: ['transfer to', 'transfer from', 'sent to', 'received from', 'p2p transfer', 'peer to peer'],
    priority: 8
  },
  {
    category: 'Bill Payment',
    keywords: ['bill payment', 'utility', 'electricity', 'water', 'internet', 'satellite', 'subscription', 'broadband'],
    priority: 9
  },
  {
    category: 'Mobile Top-up',
    keywords: ['top up', 'topup', 'mobile recharge', 'airtime', 'prepaid', 'reload'],
    priority: 7
  },
  {
    category: 'Purchases',
    keywords: ['purchase', 'payment for', 'buy', 'shopping', 'store', 'mart', 'shop'],
    priority: 6
  },
  {
    category: 'Salary/Income',
    keywords: ['salary', 'income', 'wages', 'payment received', 'earnings', 'bonus', 'commission'],
    priority: 9
  },
  {
    category: 'Bank Transfer',
    keywords: ['bank transfer', 'atm withdrawal', 'cash withdrawal', 'deposit'],
    priority: 5
  },
  {
    category: 'Food & Dining',
    keywords: ['restaurant', 'cafe', 'food', 'dining', 'meal', 'grab food', 'delivery'],
    priority: 4
  },
  {
    category: 'Transportation',
    keywords: ['taxi', 'grab', 'uber', 'transport', 'fuel', 'petrol', 'parking'],
    priority: 4
  },
  {
    category: 'Entertainment',
    keywords: ['movie', 'cinema', 'game', 'entertainment', 'netflix', 'spotify', 'streaming'],
    priority: 3
  },
  {
    category: 'Healthcare',
    keywords: ['hospital', 'clinic', 'medical', 'pharmacy', 'doctor', 'healthcare'],
    priority: 5
  },
  {
    category: 'Cash Withdrawal',
    keywords: ['cash out', 'withdrawal', 'atm', 'cash withdrawal'],
    priority: 6
  }
];

/**
 * Categorize a transaction based on description keywords
 */
const categorizeTransaction = (transaction) => {
  const description = (transaction.detailedDescription || '').toLowerCase();
  
  // Determine if it's income or expense based on credit/debit
  const isIncome = transaction.credit > 0;
  
  // Find matching category with highest priority
  let matchedCategory = null;
  let highestPriority = -1;
  
  for (const rule of categoryRules) {
    const hasMatch = rule.keywords.some(keyword => description.includes(keyword.toLowerCase()));
    
    if (hasMatch && rule.priority > highestPriority) {
      matchedCategory = rule.category;
      highestPriority = rule.priority;
    }
  }
  
  // Default categories if no match found
  if (!matchedCategory) {
    if (isIncome) {
      matchedCategory = 'Other Income';
    } else {
      matchedCategory = 'Other Expense';
    }
  }
  
  return {
    category: matchedCategory,
    isIncome
  };
};

/**
 * Get all available categories
 */
const getCategories = () => {
  return [...new Set(categoryRules.map(rule => rule.category)), 'Other Income', 'Other Expense'];
};

/**
 * Add custom category rule
 */
const addCategoryRule = (category, keywords, priority = 5) => {
  categoryRules.push({
    category,
    keywords,
    priority
  });
};

/**
 * Get category statistics from transactions
 */
const getCategoryStats = (transactions) => {
  const stats = {};
  
  transactions.forEach(txn => {
    const category = txn.category || 'Uncategorized';
    
    if (!stats[category]) {
      stats[category] = {
        count: 0,
        totalAmount: 0,
        isIncome: txn.isIncome
      };
    }
    
    stats[category].count++;
    stats[category].totalAmount += txn.isIncome ? 
      parseFloat(txn.credit) : 
      parseFloat(txn.debit);
  });
  
  return stats;
};

module.exports = {
  categorizeTransaction,
  getCategories,
  addCategoryRule,
  getCategoryStats
};
