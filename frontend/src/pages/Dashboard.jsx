import { useState, useEffect } from 'react';
import axios from 'axios';
import FileUploadCard from '../components/FileUploadCard';
import DashboardCharts from '../components/DashboardCharts';
import TransactionTable from '../components/TransactionTable';

const API_BASE_URL = 'http://localhost:5000/api';

const Dashboard = () => {
  const [summary, setSummary] = useState(null);
  const [trends, setTrends] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Fetch dashboard data
  useEffect(() => {
    fetchDashboardData();
  }, [refreshTrigger]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch summary
      const summaryRes = await axios.get(`${API_BASE_URL}/transactions/summary`);
      setSummary(summaryRes.data);

      // Fetch trends (last 30 days)
      const trendsRes = await axios.get(`${API_BASE_URL}/transactions/trends`, {
        params: {
          period: 'daily',
          startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
        }
      });
      setTrends(trendsRes.data.data);

      // Fetch recent transactions
      const transactionsRes = await axios.get(`${API_BASE_URL}/transactions`, {
        params: { limit: 20 }
      });
      setTransactions(transactionsRes.data.transactions);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUploadSuccess = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleDeleteTransaction = async (id) => {
    try {
      await axios.delete(`${API_BASE_URL}/transactions/${id}`);
      setRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting transaction:', error);
    }
  };

  if (loading && !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin"></div>
          <p className="text-slate-400 font-mono text-sm">Loading financial data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight">
              Financial Command
            </h1>
            <p className="text-slate-400 font-mono text-sm">Smart Business Ecosystem</p>
          </div>
        </div>
      </header>

      {/* File Upload Card */}
      <div className="mb-8">
        <FileUploadCard onUploadSuccess={handleUploadSuccess} />
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Income */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-emerald-500/20 rounded-xl p-6 hover:border-emerald-500/40 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">Total Income</span>
              <div className="w-8 h-8 bg-emerald-500/10 rounded-lg flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                <svg className="w-4 h-4 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-white mb-1">
              {summary.totalIncome.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-lg text-slate-500 ml-1">MMK</span>
            </p>
          </div>

          {/* Total Expense */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-rose-500/20 rounded-xl p-6 hover:border-rose-500/40 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">Total Expense</span>
              <div className="w-8 h-8 bg-rose-500/10 rounded-lg flex items-center justify-center group-hover:bg-rose-500/20 transition-colors">
                <svg className="w-4 h-4 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 17h8m0 0V9m0 8l-8-8-4 4-6-6" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-white mb-1">
              {summary.totalExpense.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-lg text-slate-500 ml-1">MMK</span>
            </p>
          </div>

          {/* Net Flow */}
          <div className={`bg-slate-900/50 backdrop-blur-sm border ${summary.netFlow >= 0 ? 'border-cyan-500/20 hover:border-cyan-500/40' : 'border-amber-500/20 hover:border-amber-500/40'} rounded-xl p-6 transition-all duration-300 group`}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">Net Flow</span>
              <div className={`w-8 h-8 ${summary.netFlow >= 0 ? 'bg-cyan-500/10 group-hover:bg-cyan-500/20' : 'bg-amber-500/10 group-hover:bg-amber-500/20'} rounded-lg flex items-center justify-center transition-colors`}>
                <svg className={`w-4 h-4 ${summary.netFlow >= 0 ? 'text-cyan-400' : 'text-amber-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-white mb-1">
              {summary.netFlow.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-lg text-slate-500 ml-1">MMK</span>
            </p>
          </div>

          {/* Current Balance */}
          <div className="bg-slate-900/50 backdrop-blur-sm border border-violet-500/20 rounded-xl p-6 hover:border-violet-500/40 transition-all duration-300 group">
            <div className="flex items-center justify-between mb-2">
              <span className="text-slate-400 font-mono text-xs uppercase tracking-wider">Current Balance</span>
              <div className="w-8 h-8 bg-violet-500/10 rounded-lg flex items-center justify-center group-hover:bg-violet-500/20 transition-colors">
                <svg className="w-4 h-4 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <p className="text-3xl font-black text-white mb-1">
              {summary.currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              <span className="text-lg text-slate-500 ml-1">MMK</span>
            </p>
          </div>
        </div>
      )}

      {/* Charts */}
      {summary && (
        <DashboardCharts 
          trends={trends} 
          categoryBreakdown={summary.categoryBreakdown}
        />
      )}

      {/* Transactions Table */}
      <div className="mt-8">
        <TransactionTable 
          transactions={transactions}
          onDelete={handleDeleteTransaction}
          onRefresh={() => setRefreshTrigger(prev => prev + 1)}
        />
      </div>
    </div>
  );
};

export default Dashboard;
