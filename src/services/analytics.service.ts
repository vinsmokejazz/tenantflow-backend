import { PrismaClient } from '@prisma/client';
import { AnalyticsModel, Metrics, AIInsights } from '../models/analytics.model';
import { logger } from '../utils/logger';

export class AnalyticsService {
  private prisma: PrismaClient;
  private analyticsModel: AnalyticsModel;

  constructor() {
    this.prisma = new PrismaClient();
    this.analyticsModel = new AnalyticsModel();
  }

  async generateAnalyticsForBusiness(businessId: string, date: Date = new Date()): Promise<void> {
    try {
      logger.info(`Generating analytics for business ${businessId} on ${date.toISOString()}`);

      // Get all business data
      const [leads, clients, deals, followUps] = await Promise.all([
        this.prisma.lead.findMany({
          where: { businessId },
          include: { client: true, assignedUser: true }
        }),
        this.prisma.client.findMany({
          where: { businessId },
          include: { leads: true, deals: true, followUps: true }
        }),
        this.prisma.deal.findMany({
          where: { businessId },
          include: { client: true, lead: true, assignedUser: true }
        }),
        this.prisma.followUp.findMany({
          where: { businessId },
          include: { client: true, assignedUser: true }
        })
      ]);

      // Calculate metrics
      const metrics = this.calculateMetrics(leads, clients, deals, followUps, date);
      
      // Generate AI insights
      const aiInsights = this.generateAIInsights(leads, clients, deals, followUps, metrics);

      // Use upsert to prevent duplicates - update if exists, create if not
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      
      // Check if analytics record already exists for this business and date
      const existingAnalytics = await this.prisma.analytics.findFirst({
        where: {
          businessId,
          date: {
            gte: dateOnly,
            lt: new Date(dateOnly.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      if (existingAnalytics) {
        // Update existing record
        await this.prisma.analytics.update({
          where: { id: existingAnalytics.id },
          data: {
            metrics: JSON.parse(JSON.stringify(metrics)),
            aiInsights: JSON.parse(JSON.stringify(aiInsights)),
            updatedAt: new Date()
          }
        });
      } else {
        // Create new record
        await this.prisma.analytics.create({
          data: {
            businessId,
            date: dateOnly,
            metrics: JSON.parse(JSON.stringify(metrics)),
            aiInsights: JSON.parse(JSON.stringify(aiInsights))
          }
        });
      }

      logger.info(`Analytics generated successfully for business ${businessId}`);
    } catch (error) {
      logger.error(`Error generating analytics for business ${businessId}:`, error);
      throw error;
    }
  }

  // New method to get real-time dashboard data directly from database
  async getRealTimeDashboardData(businessId: string): Promise<any> {
    try {
      // Get real-time data directly from database
      const [leads, clients, deals, followUps] = await Promise.all([
        this.prisma.lead.findMany({
          where: { businessId },
          include: { client: true, assignedUser: true }
        }),
        this.prisma.client.findMany({
          where: { businessId },
          include: { leads: true, deals: true, followUps: true }
        }),
        this.prisma.deal.findMany({
          where: { businessId },
          include: { client: true, lead: true, assignedUser: true }
        }),
        this.prisma.followUp.findMany({
          where: { businessId },
          include: { client: true, assignedUser: true }
        })
      ]);

      // Calculate real-time metrics
      const metrics = this.calculateMetrics(leads, clients, deals, followUps, new Date());
      const aiInsights = this.generateAIInsights(leads, clients, deals, followUps, metrics);
      const monthlyRevenueData = this.generateMonthlyRevenueData(deals);

      // Format for frontend
      const kpi = {
        totalRevenue: `$${metrics.total_revenue.toLocaleString()}`,
        activeClients: metrics.active_leads,
        openDeals: metrics.total_leads - metrics.converted_leads,
        conversionRate: `${metrics.conversion_rate.toFixed(1)}%`,
        revenueDescription: `Total revenue from closed deals`,
        clientsDescription: `Active leads in pipeline`,
        dealsDescription: `Open leads in progress`,
        conversionDescription: `Lead to customer conversion rate`,
        revenueTrend: '+12%',
        clientsTrend: '+5%',
        dealsTrend: '+8%',
        conversionTrend: '+2%',
        revenueTrendDirection: 'up',
        clientsTrendDirection: 'up',
        dealsTrendDirection: 'up',
        conversionTrendDirection: 'up'
      };

      const chartData = [
        { name: 'Leads', value: metrics.total_leads },
        { name: 'Converted', value: metrics.converted_leads },
        { name: 'Active', value: metrics.active_leads }
      ];

      return {
        kpi,
        chartData,
        monthlyRevenueData,
        aiInsights,
        rawData: {
          totalLeads: metrics.total_leads,
          activeLeads: metrics.active_leads,
          convertedLeads: metrics.converted_leads,
          totalRevenue: metrics.total_revenue,
          totalDeals: deals.length,
          totalClients: clients.length
        }
      };
    } catch (error) {
      logger.error(`Error getting real-time dashboard data for business ${businessId}:`, error);
      throw error;
    }
  }

  // Generate monthly revenue data for charts
  private generateMonthlyRevenueData(deals: any[]): any[] {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDate = new Date();
    const currentYear = currentDate.getFullYear();
    const currentMonth = currentDate.getMonth();
    const monthlyData: any[] = [];

    // Initialize data for last 12 months (including current month)
    for (let i = 11; i >= 0; i--) {
      const targetMonth = currentMonth - i;
      const targetYear = currentYear + Math.floor(targetMonth / 12);
      const adjustedMonth = ((targetMonth % 12) + 12) % 12; // Handle negative months
      const monthKey = months[adjustedMonth];
      
      monthlyData.push({
        month: monthKey,
        revenue: 0,
        deals: 0,
        conversionRate: 0
      });
    }

    // Calculate revenue and deals for each month
    deals.forEach(deal => {
      const dealDate = new Date(deal.createdAt);
      const dealYear = dealDate.getFullYear();
      const dealMonth = dealDate.getMonth();
      
      // Find the corresponding month in our data
      const monthIndex = monthlyData.findIndex((item, index) => {
        const targetMonth = currentMonth - (11 - index);
        const targetYear = currentYear + Math.floor(targetMonth / 12);
        const adjustedMonth = ((targetMonth % 12) + 12) % 12;
        
        return dealYear === targetYear && dealMonth === adjustedMonth;
      });

      if (monthIndex !== -1) {
        // Count all deals
        monthlyData[monthIndex].deals += 1;
        
        // Add revenue for closed deals
        if (deal.stage === 'closed_won' || deal.stage === 'closed' || deal.stage === 'won' || deal.stage === 'completed') {
          monthlyData[monthIndex].revenue += deal.value || 0;
        }
      }
    });

    // Calculate conversion rates (simplified - using deals as proxy for leads)
    monthlyData.forEach((month, index) => {
      if (index > 0) {
        const previousMonth = monthlyData[index - 1];
        const totalDeals = month.deals + previousMonth.deals;
        month.conversionRate = totalDeals > 0 ? Math.round((month.deals / totalDeals) * 100) : 0;
      } else {
        month.conversionRate = month.deals > 0 ? 100 : 0;
      }
    });

    return monthlyData;
  }

  private calculateMetrics(leads: any[], clients: any[], deals: any[], followUps: any[], date: Date): Metrics {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Filter data for last 30 days
    const recentLeads = leads.filter(lead => new Date(lead.createdAt) >= thirtyDaysAgo);
    const recentDeals = deals.filter(deal => new Date(deal.createdAt) >= thirtyDaysAgo);
    const recentFollowUps = followUps.filter(followUp => new Date(followUp.createdAt) >= thirtyDaysAgo);

    // Calculate basic metrics
    const totalLeads = leads.length;
    const activeLeads = leads.filter(lead => lead.status !== 'converted' && lead.status !== 'lost').length;
    const convertedLeads = leads.filter(lead => lead.status === 'converted').length;
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    // Calculate revenue from deals - look for various closed stages
    const closedDeals = deals.filter(deal => 
      deal.stage === 'closed_won' || 
      deal.stage === 'closed' || 
      deal.stage === 'won' ||
      deal.stage === 'completed'
    );
    
    const totalRevenue = closedDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);

    // Log for debugging
    console.log('Revenue calculation debug:', {
      totalDeals: deals.length,
      closedDeals: closedDeals.length,
      dealStages: deals.map(d => ({ id: d.id, stage: d.stage, value: d.value })),
      closedDealStages: closedDeals.map(d => ({ id: d.id, stage: d.stage, value: d.value })),
      totalRevenue
    });

    const averageDealSize = deals.length > 0 
      ? deals.reduce((sum, deal) => sum + (deal.value || 0), 0) / deals.length 
      : 0;

    // Calculate sales by stage
    const salesByStage: Record<string, number> = {};
    deals.forEach(deal => {
      const stage = deal.stage || 'unknown';
      salesByStage[stage] = (salesByStage[stage] || 0) + (deal.value || 0);
    });

    // Calculate customer acquisition cost (simplified)
    const customerAcquisitionCost = convertedLeads > 0 ? 1000 / convertedLeads : 0;

    // Calculate customer lifetime value (simplified)
    const customerLifetimeValue = convertedLeads > 0 ? totalRevenue / convertedLeads : 0;

    // Log metrics for debugging
    console.log('Metrics calculation debug:', {
      totalLeads,
      activeLeads,
      convertedLeads,
      conversionRate,
      totalRevenue,
      dealStages: Object.keys(salesByStage),
      salesByStage
    });

    return {
      total_leads: totalLeads,
      active_leads: activeLeads,
      converted_leads: convertedLeads,
      conversion_rate: conversionRate,
      total_revenue: totalRevenue,
      average_deal_size: averageDealSize,
      sales_by_stage: salesByStage,
      customer_acquisition_cost: customerAcquisitionCost,
      customer_lifetime_value: customerLifetimeValue
    };
  }

  private generateAIInsights(leads: any[], clients: any[], deals: any[], followUps: any[], metrics: Metrics): AIInsights {
    // Calculate lead scoring based on various factors
    const leadScoring: Record<string, number> = {};
    leads.forEach(lead => {
      let score = 50; // Base score
      
      // Add points for recent activity
      const daysSinceCreated = Math.floor((new Date().getTime() - new Date(lead.createdAt).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSinceCreated <= 7) score += 20;
      else if (daysSinceCreated <= 30) score += 10;
      
      // Add points for client value
      const clientDeals = deals.filter(deal => deal.clientId === lead.clientId);
      const clientValue = clientDeals.reduce((sum, deal) => sum + (deal.value || 0), 0);
      if (clientValue > 10000) score += 20;
      else if (clientValue > 5000) score += 10;
      
      // Add points for follow-up activity
      const clientFollowUps = followUps.filter(followUp => followUp.clientId === lead.clientId);
      score += Math.min(clientFollowUps.length * 5, 20);
      
      leadScoring[lead.id] = Math.min(score, 100);
    });

    // Calculate churn risk
    const churnRisk: Record<string, number> = {};
    clients.forEach(client => {
      let risk = 20; // Base risk
      
      // Increase risk for inactive clients
      const lastActivity = Math.max(
        ...client.leads.map((lead: any) => new Date(lead.updatedAt).getTime()),
        ...client.deals.map((deal: any) => new Date(deal.updatedAt).getTime()),
        ...client.followUps.map((followUp: any) => new Date(followUp.updatedAt).getTime())
      );
      
      const daysSinceActivity = Math.floor((new Date().getTime() - lastActivity) / (1000 * 60 * 60 * 24));
      if (daysSinceActivity > 90) risk += 40;
      else if (daysSinceActivity > 60) risk += 20;
      else if (daysSinceActivity > 30) risk += 10;
      
      churnRisk[client.id] = Math.min(risk, 100);
    });

    // Generate next best actions
    const nextBestActions: string[] = [];
    
    if (metrics.conversion_rate < 10) {
      nextBestActions.push('Improve lead qualification process');
    }
    if (metrics.active_leads > 20) {
      nextBestActions.push('Focus on converting existing leads');
    }
    if (Object.keys(churnRisk).length > 0) {
      const highRiskClients = Object.values(churnRisk).filter(risk => risk > 50).length;
      if (highRiskClients > 0) {
        nextBestActions.push(`Re-engage ${highRiskClients} high-risk clients`);
      }
    }
    if (nextBestActions.length === 0) {
      nextBestActions.push('Continue current successful strategies');
    }

    // Sentiment analysis (simplified)
    const sentimentAnalysis: Record<string, number> = {};
    clients.forEach(client => {
      // Simple sentiment based on activity level
      const activityLevel = client.leads.length + client.deals.length + client.followUps.length;
      sentimentAnalysis[client.id] = Math.min(activityLevel * 10, 100);
    });

    return {
      predicted_revenue: metrics.total_revenue * 1.15, // 15% growth prediction
      lead_scoring: leadScoring,
      churn_risk: churnRisk,
      next_best_actions: nextBestActions,
      sentiment_analysis: sentimentAnalysis
    };
  }

  async updateAnalyticsOnDataChange(businessId: string): Promise<void> {
    try {
      // Only update analytics once per day to prevent excessive updates
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      
      // Check if we already have analytics for today
      const existingAnalytics = await this.prisma.analytics.findFirst({
        where: {
          businessId,
          date: {
            gte: todayStart,
            lt: new Date(todayStart.getTime() + 24 * 60 * 60 * 1000)
          }
        }
      });

      // Only generate if we don't have analytics for today or if it's been more than 1 hour
      if (!existingAnalytics || 
          (existingAnalytics.updatedAt && 
           new Date().getTime() - existingAnalytics.updatedAt.getTime() > 60 * 60 * 1000)) {
        await this.generateAnalyticsForBusiness(businessId, new Date());
        logger.info(`Analytics updated for business ${businessId} due to data change`);
      } else {
        logger.info(`Analytics already up to date for business ${businessId}`);
      }
    } catch (error) {
      logger.error(`Error updating analytics for business ${businessId}:`, error);
    }
  }

  async generateHistoricalAnalytics(businessId: string, days: number = 30): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);
      
      // Generate analytics for each day
      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        await this.generateAnalyticsForBusiness(businessId, new Date(d));
      }
      
      logger.info(`Historical analytics generated for business ${businessId} for ${days} days`);
    } catch (error) {
      logger.error(`Error generating historical analytics for business ${businessId}:`, error);
      throw error;
    }
  }
} 