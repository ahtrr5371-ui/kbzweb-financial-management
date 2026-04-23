const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/**
 * Sync satellite billing - Get user payment status for subscription renewal
 * GET /api/integration/satellite-billing/sync
 */
const syncSatelliteBilling = async (req, res) => {
  try {
    const { phoneNumber, satelliteAccount, startDate, endDate } = req.query;
    
    // Build filter
    const userWhere = {};
    if (phoneNumber) {
      userWhere.phoneNumber = phoneNumber;
    }
    if (satelliteAccount) {
      userWhere.satelliteAccount = satelliteAccount;
    }
    
    // Get users with their payment history
    const users = await prisma.user.findMany({
      where: userWhere,
      include: {
        payments: {
          where: {
            ...(startDate && { paymentDate: { gte: new Date(startDate) } }),
            ...(endDate && { paymentDate: { lte: new Date(endDate) } })
          },
          orderBy: {
            paymentDate: 'desc'
          }
        }
      }
    });
    
    // Calculate subscription status for each user
    const billingStatus = users.map(user => {
      const totalPaid = user.payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);
      const lastPayment = user.payments[0];
      
      // Check if subscription is active (last payment within 30 days)
      const isActive = lastPayment && 
        (new Date() - new Date(lastPayment.paymentDate)) / (1000 * 60 * 60 * 24) <= 30;
      
      // Calculate next renewal date (30 days from last payment)
      const nextRenewal = lastPayment ? 
        new Date(new Date(lastPayment.paymentDate).getTime() + 30 * 24 * 60 * 60 * 1000) : 
        null;
      
      return {
        userId: user.id,
        phoneNumber: user.phoneNumber,
        name: user.name,
        email: user.email,
        satelliteAccount: user.satelliteAccount,
        subscriptionTier: user.subscriptionTier,
        isActive,
        lastPaymentDate: lastPayment?.paymentDate || null,
        lastPaymentAmount: lastPayment?.amount || 0,
        totalPaid,
        paymentCount: user.payments.length,
        nextRenewalDate: nextRenewal,
        daysUntilRenewal: nextRenewal ? 
          Math.ceil((nextRenewal - new Date()) / (1000 * 60 * 60 * 24)) : 
          null
      };
    });
    
    res.json({
      timestamp: new Date().toISOString(),
      userCount: billingStatus.length,
      activeSubscriptions: billingStatus.filter(u => u.isActive).length,
      users: billingStatus
    });
    
  } catch (error) {
    console.error('Billing sync error:', error);
    res.status(500).json({
      error: 'Failed to sync billing data',
      details: error.message
    });
  }
};

/**
 * Record a payment from CRM system
 * POST /api/integration/satellite-billing/payment
 */
const recordPayment = async (req, res) => {
  try {
    const {
      phoneNumber,
      amount,
      paymentDate,
      paymentMethod = 'KBZPay',
      transactionRef,
      billingPeriod
    } = req.body;
    
    // Validate required fields
    if (!phoneNumber || !amount) {
      return res.status(400).json({
        error: 'Missing required fields: phoneNumber and amount'
      });
    }
    
    // Find or create user
    let user = await prisma.user.findUnique({
      where: { phoneNumber }
    });
    
    if (!user) {
      user = await prisma.user.create({
        data: {
          phoneNumber,
          isActive: true
        }
      });
    }
    
    // Create payment record
    const payment = await prisma.payment.create({
      data: {
        userId: user.id,
        amount: parseFloat(amount),
        paymentDate: paymentDate ? new Date(paymentDate) : new Date(),
        paymentMethod,
        transactionRef,
        billingPeriod,
        status: 'completed'
      }
    });
    
    // Update user's last payment date
    await prisma.user.update({
      where: { id: user.id },
      data: {
        lastPaymentDate: payment.paymentDate,
        isActive: true
      }
    });
    
    res.json({
      message: 'Payment recorded successfully',
      payment,
      user: {
        id: user.id,
        phoneNumber: user.phoneNumber,
        isActive: user.isActive
      }
    });
    
  } catch (error) {
    console.error('Payment record error:', error);
    res.status(500).json({
      error: 'Failed to record payment',
      details: error.message
    });
  }
};

/**
 * Get subscription renewal alerts
 * GET /api/integration/satellite-billing/alerts
 */
const getRenewalAlerts = async (req, res) => {
  try {
    const { daysThreshold = 7 } = req.query;
    
    // Get all active users
    const users = await prisma.user.findMany({
      where: { isActive: true },
      include: {
        payments: {
          orderBy: { paymentDate: 'desc' },
          take: 1
        }
      }
    });
    
    const alerts = [];
    const now = new Date();
    
    users.forEach(user => {
      if (user.payments.length > 0) {
        const lastPayment = user.payments[0];
        const nextRenewal = new Date(lastPayment.paymentDate);
        nextRenewal.setDate(nextRenewal.getDate() + 30);
        
        const daysUntilRenewal = Math.ceil((nextRenewal - now) / (1000 * 60 * 60 * 24));
        
        // Alert if renewal is within threshold or overdue
        if (daysUntilRenewal <= parseInt(daysThreshold)) {
          alerts.push({
            userId: user.id,
            phoneNumber: user.phoneNumber,
            name: user.name,
            satelliteAccount: user.satelliteAccount,
            lastPaymentDate: lastPayment.paymentDate,
            nextRenewalDate: nextRenewal,
            daysUntilRenewal,
            status: daysUntilRenewal < 0 ? 'overdue' : 'upcoming',
            urgency: daysUntilRenewal < 0 ? 'critical' : 
                     daysUntilRenewal <= 3 ? 'high' : 'medium'
          });
        }
      } else {
        // User has no payments - critical alert
        alerts.push({
          userId: user.id,
          phoneNumber: user.phoneNumber,
          name: user.name,
          satelliteAccount: user.satelliteAccount,
          lastPaymentDate: null,
          nextRenewalDate: null,
          daysUntilRenewal: null,
          status: 'no_payment',
          urgency: 'critical'
        });
      }
    });
    
    // Sort by urgency
    alerts.sort((a, b) => {
      const urgencyOrder = { critical: 0, high: 1, medium: 2 };
      return urgencyOrder[a.urgency] - urgencyOrder[b.urgency];
    });
    
    res.json({
      timestamp: new Date().toISOString(),
      alertCount: alerts.length,
      critical: alerts.filter(a => a.urgency === 'critical').length,
      high: alerts.filter(a => a.urgency === 'high').length,
      medium: alerts.filter(a => a.urgency === 'medium').length,
      alerts
    });
    
  } catch (error) {
    console.error('Alerts error:', error);
    res.status(500).json({
      error: 'Failed to fetch renewal alerts',
      details: error.message
    });
  }
};

/**
 * Update user information
 * PUT /api/integration/users/:id
 */
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, satelliteAccount, subscriptionTier, isActive } = req.body;
    
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(satelliteAccount && { satelliteAccount }),
        ...(subscriptionTier && { subscriptionTier }),
        ...(isActive !== undefined && { isActive })
      }
    });
    
    res.json({
      message: 'User updated successfully',
      user
    });
    
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      error: 'Failed to update user',
      details: error.message
    });
  }
};

module.exports = {
  syncSatelliteBilling,
  recordPayment,
  getRenewalAlerts,
  updateUser
};
