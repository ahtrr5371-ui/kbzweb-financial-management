const express = require('express');
const router = express.Router();
const integrationController = require('../controllers/integrationController');

/**
 * GET /api/integration/satellite-billing/sync
 * Sync satellite billing data - Get user payment status for subscription renewal
 * Query params: phoneNumber, satelliteAccount, startDate, endDate
 */
router.get('/satellite-billing/sync', integrationController.syncSatelliteBilling);

/**
 * POST /api/integration/satellite-billing/payment
 * Record a payment from CRM system
 * Body: { phoneNumber, amount, paymentDate, paymentMethod, transactionRef, billingPeriod }
 */
router.post('/satellite-billing/payment', integrationController.recordPayment);

/**
 * GET /api/integration/satellite-billing/alerts
 * Get subscription renewal alerts
 * Query params: daysThreshold (default: 7)
 */
router.get('/satellite-billing/alerts', integrationController.getRenewalAlerts);

/**
 * PUT /api/integration/users/:id
 * Update user information
 * Body: { name, email, satelliteAccount, subscriptionTier, isActive }
 */
router.put('/users/:id', integrationController.updateUser);

module.exports = router;
