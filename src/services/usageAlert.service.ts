import { prisma } from '../config/prisma';
import { logger } from '../utils/logger';
import { sendUsageLimitWarning } from './email.service';
import { SUBSCRIPTION_PLANS } from './subscription.service';

interface UsageAlert {
  businessId: string;
  resourceType: 'clients' | 'users' | 'deals' | 'leads';
  currentUsage: number;
  limit: number;
  percentage: number;
  lastAlertSent?: Date;
}

export class UsageAlertService {
  private static instance: UsageAlertService;
  private alertThresholds = {
    warning: 80, // 80% usage
    critical: 95, // 95% usage
  };

  private constructor() {}

  public static getInstance(): UsageAlertService {
    if (!UsageAlertService.instance) {
      UsageAlertService.instance = new UsageAlertService();
    }
    return UsageAlertService.instance;
  }

  // Check usage for a specific business
  async checkBusinessUsage(businessId: string): Promise<void> {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          users: true,
          clients: true,
          deals: true,
          leads: true,
        },
      });

      if (!business) {
        logger.warn(`Business not found for usage check: ${businessId}`);
        return;
      }

      const plan = SUBSCRIPTION_PLANS[business.subscription];
      if (!plan) {
        logger.warn(`Invalid subscription plan for business: ${businessId}`);
        return;
      }

      const usageData = {
        clients: business.clients.length,
        users: business.users.length,
        deals: business.deals.length,
        leads: business.leads.length,
      };

      const limits = plan.limits;

      // Check each resource type
      await Promise.all([
        this.checkResourceUsage(businessId, 'clients', usageData.clients, limits.clients, business.billingEmail || undefined),
        this.checkResourceUsage(businessId, 'users', usageData.users, limits.users, business.billingEmail || undefined),
        this.checkResourceUsage(businessId, 'deals', usageData.deals, limits.deals, business.billingEmail || undefined),
        this.checkResourceUsage(businessId, 'leads', usageData.leads, limits.leads, business.billingEmail || undefined),
      ]);

    } catch (error) {
      logger.error(`Error checking usage for business ${businessId}:`, error);
    }
  }

  // Check usage for a specific resource
  private async checkResourceUsage(
    businessId: string,
    resourceType: 'clients' | 'users' | 'deals' | 'leads',
    currentUsage: number,
    limit: number,
    userEmail?: string
  ): Promise<void> {
    try {
      const percentage = Math.round((currentUsage / limit) * 100);

      // Check if we should send an alert
      if (percentage >= this.alertThresholds.warning) {
        await this.sendUsageAlert(businessId, resourceType, currentUsage, limit, percentage, userEmail);
      }

      // Log usage for monitoring
      logger.info(`Usage check for ${businessId} - ${resourceType}: ${currentUsage}/${limit} (${percentage}%)`);

    } catch (error) {
      logger.error(`Error checking ${resourceType} usage for business ${businessId}:`, error);
    }
  }

  // Send usage alert
  private async sendUsageAlert(
    businessId: string,
    resourceType: 'clients' | 'users' | 'deals' | 'leads',
    currentUsage: number,
    limit: number,
    percentage: number,
    userEmail?: string
  ): Promise<void> {
    try {
      // Check if we've sent an alert recently (within 24 hours)
      const lastAlert = await this.getLastAlertSent(businessId, resourceType);
      const now = new Date();
      const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      if (lastAlert && lastAlert > twentyFourHoursAgo) {
        logger.info(`Skipping alert for ${businessId} - ${resourceType}: Alert sent recently`);
        return;
      }

      // Get business admin email
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          users: {
            where: { role: 'admin' },
            take: 1,
          },
        },
      });

      const adminEmail = business?.users[0]?.email || userEmail;
      if (!adminEmail) {
        logger.warn(`No admin email found for business ${businessId}`);
        return;
      }

      // Send email alert
      await sendUsageLimitWarning(adminEmail, resourceType, currentUsage, limit);

      // Record alert sent
      await this.recordAlertSent(businessId, resourceType);

      logger.info(`Usage alert sent for ${businessId} - ${resourceType}: ${currentUsage}/${limit} (${percentage}%)`);

    } catch (error) {
      logger.error(`Error sending usage alert for ${businessId} - ${resourceType}:`, error);
    }
  }

  // Get last alert sent time
  private async getLastAlertSent(businessId: string, resourceType: string): Promise<Date | null> {
    try {
      // You could store this in a separate table, but for now we'll use a simple approach
      // In a production system, you'd want to store alert history in the database
      return null; // For now, always allow alerts
    } catch (error) {
      logger.error(`Error getting last alert sent for ${businessId} - ${resourceType}:`, error);
      return null;
    }
  }

  // Record alert sent
  private async recordAlertSent(businessId: string, resourceType: string): Promise<void> {
    try {
      // In a production system, you'd store this in a database table
      // For now, we'll just log it
      logger.info(`Alert recorded for ${businessId} - ${resourceType}`);
    } catch (error) {
      logger.error(`Error recording alert for ${businessId} - ${resourceType}:`, error);
    }
  }

  // Check all businesses (for scheduled job)
  async checkAllBusinesses(): Promise<void> {
    try {
      logger.info('Starting usage check for all businesses');

      const businesses = await prisma.business.findMany({
        select: { id: true },
      });

      for (const business of businesses) {
        await this.checkBusinessUsage(business.id);
      }

      logger.info(`Completed usage check for ${businesses.length} businesses`);

    } catch (error) {
      logger.error('Error checking usage for all businesses:', error);
    }
  }

  // Get usage summary for a business
  async getUsageSummary(businessId: string): Promise<any> {
    try {
      const business = await prisma.business.findUnique({
        where: { id: businessId },
        include: {
          users: true,
          clients: true,
          deals: true,
          leads: true,
        },
      });

      if (!business) {
        throw new Error('Business not found');
      }

      const plan = SUBSCRIPTION_PLANS[business.subscription];
      if (!plan) {
        throw new Error('Invalid subscription plan');
      }

      const usage = {
        clients: {
          current: business.clients.length,
          limit: plan.limits.clients,
          percentage: Math.round((business.clients.length / plan.limits.clients) * 100),
        },
        users: {
          current: business.users.length,
          limit: plan.limits.users,
          percentage: Math.round((business.users.length / plan.limits.users) * 100),
        },
        deals: {
          current: business.deals.length,
          limit: plan.limits.deals,
          percentage: Math.round((business.deals.length / plan.limits.deals) * 100),
        },
        leads: {
          current: business.leads.length,
          limit: plan.limits.leads,
          percentage: Math.round((business.leads.length / plan.limits.leads) * 100),
        },
      };

      return {
        business,
        plan,
        usage,
        alerts: {
          clients: usage.clients.percentage >= this.alertThresholds.warning,
          users: usage.users.percentage >= this.alertThresholds.warning,
          deals: usage.deals.percentage >= this.alertThresholds.warning,
          leads: usage.leads.percentage >= this.alertThresholds.warning,
        },
      };

    } catch (error) {
      logger.error(`Error getting usage summary for business ${businessId}:`, error);
      throw error;
    }
  }
}

export const usageAlertService = UsageAlertService.getInstance(); 