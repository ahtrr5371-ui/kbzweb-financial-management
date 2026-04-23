import { useState } from 'react';

const TransactionTable = ({ transactions, onDelete, onRefresh }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [filterType, setFilterType] = useState('all');

  // Get unique categories
  const categories = ['all', ...new Set(transactions.map(t => t.category).filter(Boolean))];

  // Filter transactions
  const filteredTransactions = transactions.filter(txn => {
    const matchesSearch = txn.detailedDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         txn.tmRefNo.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || txn.category === filterCategory;
    const matchesType = filterType === 'all' || 
                       (filterType === 'income' && txn.isIncome) ||
                       (filterType === 'expense' && !txn.isIncome);
    
    return matchesSearch && matchesCategory && matchesType;
  });

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this transaction?')) {
      await onDelete(id);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-xl p-6 hover:border-cyan-500/20 transition-all duration-300">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
          </svg>
        </div>
        <div>
          <h3 className="text-lg font-bold text-white">Recent Transactions</h3>
          <p className="text-slate-400 text-sm font-mono">{filteredTransactions.length} records</p>
        </div>
        <button
          onClick={onRefresh}
          className="ml-auto p-2 hover:bg-slate-800 rounded-lg transition-colors"
          title="Refresh"
        >
          <svg className="w-5 h-5 text-slate-400 hover:text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {/* Search */}
        <div className="relative">
          <input
            type="text"
            placeholder="Search transactions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
          <svg className="w-5 h-5 text-slate-500 absolute left-3 top-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>

        {/* Category Filter */}
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
        >
          {categories.map(cat => (
            <option key={cat} value={cat}>
              {cat === 'all' ? 'All Categories' : cat}
            </option>
          ))}
        </select>

        {/* Type Filter */}
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="bg-slate-800/50 border border-slate-700 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-cyan-500/50 transition-colors"
        >
          <option value="all">All Types</option>
          <option value="income">Income</option>
          <option value="expense">Expense</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700">
              <th className="text-left py-3 px-4 text-slate-400 font-mono text-xs uppercase tracking-wider">Date</th>
              <th className="text-left py-3 px-4 text-slate-400 font-mono text-xs uppercase tracking-wider">Description</th>
              <th className="text-left py-3 px-4 text-slate-400 font-mono text-xs uppercase tracking-wider">Category</th>
              <th className="text-right py-3 px-4 text-slate-400 font-mono text-xs uppercase tracking-wider">Income</th>
              <th className="text-right py-3 px-4 text-slate-400 font-mono text-xs uppercase tracking-wider">Expense</th>
              <th className="text-right py-3 px-4 text-slate-400 font-mono text-xs uppercase tracking-wider">Balance</th>
              <th className="text-center py-3 px-4 text-slate-400 font-mono text-xs uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTransactions.length > 0 ? (
              filteredTransactions.map((txn) => (
                <tr 
                  key={txn.id} 
                  className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                >
                  <td className="py-3 px-4 text-slate-300 text-sm font-mono whitespace-nowrap">
                    {formatDate(txn.transactionDateTime)}
                  </td>
                  <td className="py-3 px-4 text-white text-sm max-w-xs truncate">
                    {txn.detailedDescription}
                    <div className="text-slate-500 text-xs font-mono">{txn.tmRefNo}</div>
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      txn.isIncome 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}>
                      {txn.category || 'Uncategorized'}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-emerald-400 font-semibold">
                    {txn.credit > 0 ? `+${parseFloat(txn.credit).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-rose-400 font-semibold">
                    {txn.debit > 0 ? `-${parseFloat(txn.debit).toLocaleString()}` : '-'}
                  </td>
                  <td className="py-3 px-4 text-right font-mono text-white font-semibold">
                    {parseFloat(txn.balance).toLocaleString()}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <button
                      onClick={() => handleDelete(txn.id)}
                      className="p-1 hover:bg-rose-500/10 rounded transition-colors group"
                      title="Delete"
                    >
                      <svg className="w-4 h-4 text-slate-500 group-hover:text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7" className="py-12 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <svg className="w-12 h-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-slate-500 font-mono">No transactions found</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TransactionTable;
