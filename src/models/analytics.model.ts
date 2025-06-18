import { PrismaClient } from '@prisma/client';

export interface AnalyticsData {
  businessId: string;
  date: Date;
  metrics: {
    total_leads: number;
    active_leads: number;
    converted_leads: number;
    conversion_rate: number;
    total_revenue: number;
    average_deal_size: number;
    sales_by_stage: Record<string, number>;
    customer_acquisition_cost: number;
    customer_lifetime_value: number;
  };
  aiInsights?: {
    predicted_revenue: number;
    lead_scoring: Record<string, number>;
    churn_risk: Record<string, number>;
    next_best_actions: string[];
    sentiment_analysis: Record<string, number>;
  };
}

export class AnalyticsModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: AnalyticsData) {
    return this.prisma.analytics.create({
      data: {
        businessId: data.businessId,
        date: data.date,
        metrics: data.metrics,
        aiInsights: data.aiInsights
      }
    });
  }

  async findByBusinessId(businessId: string, startDate?: Date, endDate?: Date) {
    return this.prisma.analytics.findMany({
      where: {
        businessId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: {
        date: 'desc'
      }
    });
  }

  async updateAiInsights(businessId: string, date: Date, insights: AnalyticsData['aiInsights']) {
    return this.prisma.analytics.updateMany({
      where: {
        businessId,
        date
      },
      data: {
        aiInsights: insights
      }
    });
  }

  async getAggregatedMetrics(businessId: string, startDate: Date, endDate: Date) {
    // Use Prisma's raw query to call the PostgreSQL function
    const result = await this.prisma.$queryRaw`
      SELECT get_aggregated_metrics(
        ${businessId}::uuid,
        ${startDate}::timestamp with time zone,
        ${endDate}::timestamp with time zone
      ) as metrics
    `;
    
    return (result as any)[0].metrics;
  }
} 