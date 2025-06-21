import express from 'express';
import { authenticate } from '../middleware/auth.middleware';
import {
  getPlans,
  getCurrentSubscription,
  createSubscription,
  updateSubscription,
  cancelSubscription,
  reactivateSubscription,
  getUsageLimits,
  createPaymentIntent,
  createCheckoutSession,
  handleWebhook,
  getSubscriptionHistory,
  downgradeToFree,
} from '../controllers/subscription.controller';

const subscriptionRouter = express.Router();

// Public routes
subscriptionRouter.get('/plans', getPlans);
subscriptionRouter.post('/webhook', express.raw({ type: 'application/json' }), handleWebhook);

// Protected routes
subscriptionRouter.use(authenticate);

// Get current subscription and usage
subscriptionRouter.get('/current', getCurrentSubscription);
subscriptionRouter.get('/usage', getUsageLimits);
subscriptionRouter.get('/history', getSubscriptionHistory);

// Subscription management
subscriptionRouter.post('/create', createSubscription);
subscriptionRouter.put('/update', updateSubscription);
subscriptionRouter.post('/cancel', cancelSubscription);
subscriptionRouter.post('/reactivate', reactivateSubscription);
subscriptionRouter.post('/downgrade', downgradeToFree);

// Payment
subscriptionRouter.post('/payment-intent', createPaymentIntent);
subscriptionRouter.post('/create-checkout-session', createCheckoutSession);

export default subscriptionRouter; 