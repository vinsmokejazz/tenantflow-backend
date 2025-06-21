import { Request, Response, NextFunction } from 'express';
import { SubscriptionService, SUBSCRIPTION_PLANS } from '../services/subscription.service';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-05-28.basil',
});

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
    businessId: string;
  };
}

// Get available plans
export const getPlans = async (req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({
      plans: Object.values(SUBSCRIPTION_PLANS)
    });
  } catch (error) {
    next(error);
  }
};

// Get current subscription
export const getCurrentSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = req.user?.businessId;
    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    const subscription = await SubscriptionService.getSubscription(businessId);
    const usage = await SubscriptionService.checkUsageLimits(businessId);

    res.json({
      subscription: subscription.business,
      plan: subscription.plan,
      usage,
      history: subscription.history,
      stripeSubscription: subscription.stripeSubscription
    });
  } catch (error) {
    next(error);
  }
};

// Create checkout session
export const createCheckoutSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId, successUrl, cancelUrl } = req.body;
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (plan.id === 'free') {
      return res.status(400).json({ error: 'Cannot create checkout for free plan' });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Create customer if doesn't exist
    let customerId = business.stripeCustomerId;
    if (!customerId) {
      const customer = await SubscriptionService.createCustomer(businessId, business.billingEmail || '', business.name);
      customerId = customer.id;
    }

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: SubscriptionService['getStripePriceId'](planId),
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl || `${process.env.FRONTEND_URL}/subscription?success=true`,
      cancel_url: cancelUrl || `${process.env.FRONTEND_URL}/subscription?canceled=true`,
      metadata: {
        businessId,
        planId,
      },
      subscription_data: {
        metadata: {
          businessId,
          planId,
        },
      },
    });

    res.json({ sessionId: session.id });
  } catch (error) {
    next(error);
  }
};

// Create subscription
export const createSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId, paymentMethodId } = req.body;
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const subscription = await SubscriptionService.createSubscription(businessId, planId, paymentMethodId);

    res.status(201).json({
      message: 'Subscription created successfully',
      subscription,
      clientSecret: (subscription.latest_invoice as any)?.payment_intent?.client_secret
    });
  } catch (error) {
    next(error);
  }
};

// Update subscription
export const updateSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.body;
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    if (!planId || !SUBSCRIPTION_PLANS[planId]) {
      return res.status(400).json({ error: 'Invalid plan ID' });
    }

    const subscription = await SubscriptionService.updateSubscription(businessId, planId);

    res.json({
      message: 'Subscription updated successfully',
      subscription
    });
  } catch (error) {
    next(error);
  }
};

// Cancel subscription
export const cancelSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    const subscription = await SubscriptionService.cancelSubscription(businessId);

    res.json({
      message: 'Subscription cancelled successfully',
      subscription
    });
  } catch (error) {
    next(error);
  }
};

// Reactivate subscription
export const reactivateSubscription = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    const subscription = await SubscriptionService.reactivateSubscription(businessId);

    res.json({
      message: 'Subscription reactivated successfully',
      subscription
    });
  } catch (error) {
    next(error);
  }
};

// Get usage limits
export const getUsageLimits = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    const usage = await SubscriptionService.checkUsageLimits(businessId);

    res.json(usage);
  } catch (error) {
    next(error);
  }
};

// Create payment intent for subscription
export const createPaymentIntent = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { planId } = req.body;
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    const plan = SUBSCRIPTION_PLANS[planId];
    if (!plan || plan.id === 'free') {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Create customer if doesn't exist
    let customerId = business.stripeCustomerId;
    if (!customerId) {
      const customer = await SubscriptionService.createCustomer(businessId, business.billingEmail || '', business.name);
      customerId = customer.id;
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: plan.price * 100, // Convert to cents
      currency: 'usd',
      customer: customerId,
      metadata: {
        businessId,
        planId,
      },
    });

    res.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntent
    });
  } catch (error) {
    next(error);
  }
};

// Handle Stripe webhook
export const handleWebhook = async (req: Request, res: Response, next: NextFunction) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!sig || !endpointSecret) {
    return res.status(400).json({ error: 'Missing signature or webhook secret' });
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  } catch (err: any) {
    logger.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  try {
    await SubscriptionService.handleWebhook(event);
    res.json({ received: true });
  } catch (error) {
    logger.error('Webhook handling error:', error);
    res.status(500).json({ error: 'Webhook handling failed' });
  }
};

// Get subscription history
export const getSubscriptionHistory = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    const history = await prisma.subscriptionHistory.findMany({
      where: { businessId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(history);
  } catch (error) {
    next(error);
  }
};

// Downgrade to free plan
export const downgradeToFree = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const businessId = req.user?.businessId;

    if (!businessId) {
      return res.status(401).json({ error: 'Business ID not found' });
    }

    const business = await prisma.business.findUnique({
      where: { id: businessId },
    });

    if (!business) {
      return res.status(404).json({ error: 'Business not found' });
    }

    // Cancel current subscription if exists
    if (business.stripeSubscriptionId) {
      await SubscriptionService.cancelSubscription(businessId);
    }

    // Update to free plan
    await prisma.business.update({
      where: { id: businessId },
      data: {
        subscription: 'free',
        subscriptionStatus: 'active',
        stripeSubscriptionId: null,
      },
    });

    // Record in history
    await prisma.subscriptionHistory.create({
      data: {
        businessId,
        subscription: 'free',
        eventType: 'downgraded',
        amount: 0,
        status: 'active',
        metadata: { reason: 'user_downgrade' },
      },
    });

    res.json({
      message: 'Successfully downgraded to free plan',
      subscription: 'free'
    });
  } catch (error) {
    next(error);
  }
}; 