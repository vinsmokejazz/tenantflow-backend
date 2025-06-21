import Stripe from 'stripe';
import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-12-18.acacia',
});

export interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  interval: 'month' | 'year';
  features: string[];
  limits: {
    clients: number;
    users: number;
    deals: number;
    leads: number;
    aiInsights: boolean;
    advancedReports: boolean;
    prioritySupport: boolean;
  };
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: [
      'Up to 10 clients',
      'Basic reporting',
      'Email support',
      'Core CRM features'
    ],
    limits: {
      clients: 10,
      users: 2,
      deals: 50,
      leads: 100,
      aiInsights: false,
      advancedReports: false,
      prioritySupport: false,
    }
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    price: 29,
    interval: 'month',
    features: [
      'Up to 100 clients',
      'Advanced reporting',
      'AI insights',
      'Priority support',
      'Team collaboration',
      'Custom integrations'
    ],
    limits: {
      clients: 100,
      users: 10,
      deals: 500,
      leads: 1000,
      aiInsights: true,
      advancedReports: true,
      prioritySupport: false,
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    features: [
      'Unlimited clients',
      'Unlimited users',
      'Advanced AI insights',
      'Priority support',
      'Custom integrations',
      'Dedicated account manager',
      'Advanced analytics',
      'White-label options'
    ],
    limits: {
      clients: 1000,
      users: 50,
      deals: 5000,
      leads: 10000,
      aiInsights: true,
      advancedReports: true,
      prioritySupport: true,
    }
  }
};

export class SubscriptionService {
  // Create Stripe customer
  static async createCustomer(businessId: string, email: string, name: string) {
    try {
      const customer = await stripe.customers.create({
        email,
        name,
        metadata: {
          businessId,
        },
      });

      await prisma.business.update({
        where: { id: businessId },
        data: {
          stripeCustomerId: customer.id,
          billingEmail: email,
        },
      });

      return customer;
    } catch (error) {
      logger.error('Error creating Stripe customer:', error);
      throw error;
    }
  }

  // Create subscription
  static async createSubscription(businessId: string, planId: string, paymentMethodId?: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const plan = SUBSCRIPTION_PLANS[planId];
      if (!plan || plan.id === 'free') {
        throw new Error('Invalid plan');
      }

      // Create customer if doesn't exist
      let customerId = business.stripeCustomerId;
      if (!customerId) {
        const customer = await this.createCustomer(businessId, business.billingEmail || '', business.name);
        customerId = customer.id;
      }

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: this.getStripePriceId(planId) }],
        payment_behavior: 'default_incomplete',
        payment_settings: { save_default_payment_method: 'on_subscription' },
        expand: ['latest_invoice.payment_intent'],
        metadata: {
          businessId,
        },
      });

      // Update business
      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscription: planId,
          stripeSubscriptionId: subscription.id,
          subscriptionStatus: subscription.status,
          subscriptionStartDate: new Date(subscription.current_period_start * 1000),
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        },
      });

      // Record subscription history
      await prisma.subscriptionHistory.create({
        data: {
          businessId,
          subscription: planId,
          stripeEventId: subscription.id,
          eventType: 'created',
          amount: plan.price,
          status: subscription.status,
          metadata: subscription,
        },
      });

      return subscription;
    } catch (error) {
      logger.error('Error creating subscription:', error);
      throw error;
    }
  }

  // Update subscription
  static async updateSubscription(businessId: string, newPlanId: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business?.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      const plan = SUBSCRIPTION_PLANS[newPlanId];
      if (!plan) {
        throw new Error('Invalid plan');
      }

      // Update subscription in Stripe
      const subscription = await stripe.subscriptions.update(business.stripeSubscriptionId, {
        items: [{
          id: (await stripe.subscriptions.retrieve(business.stripeSubscriptionId)).items.data[0].id,
          price: this.getStripePriceId(newPlanId),
        }],
        proration_behavior: 'create_prorations',
      });

      // Update business
      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscription: newPlanId,
          subscriptionStatus: subscription.status,
          subscriptionEndDate: new Date(subscription.current_period_end * 1000),
        },
      });

      // Record subscription history
      await prisma.subscriptionHistory.create({
        data: {
          businessId,
          subscription: newPlanId,
          stripeEventId: subscription.id,
          eventType: 'updated',
          amount: plan.price,
          status: subscription.status,
          metadata: subscription,
        },
      });

      return subscription;
    } catch (error) {
      logger.error('Error updating subscription:', error);
      throw error;
    }
  }

  // Cancel subscription
  static async cancelSubscription(businessId: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business?.stripeSubscriptionId) {
        throw new Error('No active subscription found');
      }

      // Cancel subscription in Stripe
      const subscription = await stripe.subscriptions.update(business.stripeSubscriptionId, {
        cancel_at_period_end: true,
      });

      // Update business
      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: 'canceling',
        },
      });

      // Record subscription history
      await prisma.subscriptionHistory.create({
        data: {
          businessId,
          subscription: business.subscription,
          stripeEventId: subscription.id,
          eventType: 'cancelled',
          amount: 0,
          status: subscription.status,
          metadata: subscription,
        },
      });

      return subscription;
    } catch (error) {
      logger.error('Error canceling subscription:', error);
      throw error;
    }
  }

  // Reactivate subscription
  static async reactivateSubscription(businessId: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business?.stripeSubscriptionId) {
        throw new Error('No subscription found');
      }

      // Reactivate subscription in Stripe
      const subscription = await stripe.subscriptions.update(business.stripeSubscriptionId, {
        cancel_at_period_end: false,
      });

      // Update business
      await prisma.business.update({
        where: { id: businessId },
        data: {
          subscriptionStatus: 'active',
        },
      });

      // Record subscription history
      await prisma.subscriptionHistory.create({
        data: {
          businessId,
          subscription: business.subscription,
          stripeEventId: subscription.id,
          eventType: 'reactivated',
          amount: 0,
          status: subscription.status,
          metadata: subscription,
        },
      });

      return subscription;
    } catch (error) {
      logger.error('Error reactivating subscription:', error);
      throw error;
    }
  }

  // Get subscription details
  static async getSubscription(businessId: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          subscriptionHistory: {
            orderBy: { createdAt: 'desc' },
            take: 10,
          },
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const plan = SUBSCRIPTION_PLANS[business.subscription];
      let stripeSubscription = null;

      if (business.stripeSubscriptionId) {
        try {
          stripeSubscription = await stripe.subscriptions.retrieve(business.stripeSubscriptionId);
        } catch (error) {
          logger.warn('Could not retrieve Stripe subscription:', error);
        }
      }

      return {
        business,
        plan,
        stripeSubscription,
        history: business.subscriptionHistory,
      };
    } catch (error) {
      logger.error('Error getting subscription:', error);
      throw error;
    }
  }

  // Check usage limits
  static async checkUsageLimits(businessId: string) {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const plan = SUBSCRIPTION_PLANS[business.subscription];
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      // Get current usage
      const [clientCount, userCount, dealCount, leadCount] = await Promise.all([
        prisma.client.count({ where: { businessId } }),
        prisma.user.count({ where: { businessId } }),
        prisma.deal.count({ where: { businessId } }),
        prisma.lead.count({ where: { businessId } }),
      ]);

      return {
        plan,
        usage: {
          clients: { current: clientCount, limit: plan.limits.clients },
          users: { current: userCount, limit: plan.limits.users },
          deals: { current: dealCount, limit: plan.limits.deals },
          leads: { current: leadCount, limit: plan.limits.leads },
        },
        features: {
          aiInsights: plan.limits.aiInsights,
          advancedReports: plan.limits.advancedReports,
          prioritySupport: plan.limits.prioritySupport,
        },
      };
    } catch (error) {
      logger.error('Error checking usage limits:', error);
      throw error;
    }
  }

  // Get Stripe price ID for plan
  private static getStripePriceId(planId: string): string {
    const priceIds: Record<string, string> = {
      pro: process.env.STRIPE_PRO_PRICE_ID!,
      enterprise: process.env.STRIPE_ENTERPRISE_PRICE_ID!,
    };

    const priceId = priceIds[planId];
    if (!priceId) {
      throw new Error(`No Stripe price ID found for plan: ${planId}`);
    }

    return priceId;
  }

  // Handle webhook events
  static async handleWebhook(event: Stripe.Event) {
    try {
      switch (event.type) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionEvent(event.data.object as Stripe.Subscription);
          break;
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          await this.handleInvoiceEvent(event.data.object as Stripe.Invoice);
          break;
        default:
          logger.info(`Unhandled webhook event: ${event.type}`);
      }
    } catch (error) {
      logger.error('Error handling webhook:', error);
      throw error;
    }
  }

  private static async handleSubscriptionEvent(subscription: Stripe.Subscription) {
    const businessId = subscription.metadata.businessId;
    if (!businessId) {
      logger.warn('No business ID in subscription metadata');
      return;
    }

    await prisma.business.update({
      where: { id: businessId },
      data: {
        subscriptionStatus: subscription.status,
        subscriptionEndDate: new Date(subscription.current_period_end * 1000),
      },
    });

    await prisma.subscriptionHistory.create({
      data: {
        businessId,
        subscription: subscription.metadata.plan || 'unknown',
        stripeEventId: subscription.id,
        eventType: subscription.status,
        amount: subscription.items.data[0]?.price.unit_amount ? subscription.items.data[0].price.unit_amount / 100 : 0,
        status: subscription.status,
        metadata: subscription,
      },
    });
  }

  private static async handleInvoiceEvent(invoice: Stripe.Invoice) {
    if (!invoice.subscription) return;

    const subscription = await stripe.subscriptions.retrieve(invoice.subscription as string);
    const businessId = subscription.metadata.businessId;
    
    if (!businessId) {
      logger.warn('No business ID in subscription metadata');
      return;
    }

    await prisma.subscriptionHistory.create({
      data: {
        businessId,
        subscription: subscription.metadata.plan || 'unknown',
        stripeEventId: invoice.id,
        eventType: `invoice.${invoice.status}`,
        amount: invoice.amount_paid / 100,
        status: invoice.status,
        metadata: invoice,
      },
    });
  }
} 