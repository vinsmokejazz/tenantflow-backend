import { PrismaClient, Prisma } from '@prisma/client';
import { AppError } from '../utils/error';

export interface Metrics {
  total_leads: number;
  active_leads: number;
  converted_leads: number;
  conversion_rate: number;
  total_revenue: number;
  average_deal_size: number;
  sales_by_stage: Record<string, number>;
  customer_acquisition_cost: number;
  customer_lifetime_value: number;
}

export interface AIInsights {
  predicted_revenue: number;
  lead_scoring: Record<string, number>;
  churn_risk: Record<string, number>;
  next_best_actions: string[];
  sentiment_analysis: Record<string, number>;
}

export interface AnalyticsData {
  businessId: string;
  date: Date;
  metrics: Metrics;
  aiInsights?: AIInsights;
}

export class AnalyticsModel {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  private serializeMetrics(metrics: Metrics): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(metrics)) as Prisma.InputJsonValue;
  }

  private serializeAIInsights(insights: AIInsights): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(insights)) as Prisma.InputJsonValue;
  }

  private deserializeMetrics(data: Prisma.JsonValue): Metrics {
    if (typeof data !== 'object' || data === null) {
      throw new Error('Invalid metrics data');
    }
    const parsed = data as unknown as Metrics;
    if (!this.isValidMetrics(parsed)) {
      throw new Error('Invalid metrics structure');
    }
    return parsed;
  }

  private deserializeAIInsights(data: Prisma.JsonValue): AIInsights | undefined {
    if (!data) return undefined;
    if (typeof data !== 'object') {
      throw new Error('Invalid AI insights data');
    }
    const parsed = data as unknown as AIInsights;
    if (!this.isValidAIInsights(parsed)) {
      throw new Error('Invalid AI insights structure');
    }
    return parsed;
  }

  private isValidMetrics(data: unknown): data is Metrics {
    if (typeof data !== 'object' || data === null) return false;
    const metrics = data as Metrics;
    return (
      typeof metrics.total_leads === 'number' &&
      typeof metrics.active_leads === 'number' &&
      typeof metrics.converted_leads === 'number' &&
      typeof metrics.conversion_rate === 'number' &&
      typeof metrics.total_revenue === 'number' &&
      typeof metrics.average_deal_size === 'number' &&
      typeof metrics.sales_by_stage === 'object' &&
      typeof metrics.customer_acquisition_cost === 'number' &&
      typeof metrics.customer_lifetime_value === 'number'
    );
  }

  private isValidAIInsights(data: unknown): data is AIInsights {
    if (typeof data !== 'object' || data === null) return false;
    const insights = data as AIInsights;
    return (
      typeof insights.predicted_revenue === 'number' &&
      typeof insights.lead_scoring === 'object' &&
      typeof insights.churn_risk === 'object' &&
      Array.isArray(insights.next_best_actions) &&
      typeof insights.sentiment_analysis === 'object'
    );
  }

  async create(data: AnalyticsData): Promise<AnalyticsData> {
    try {
      const result = await this.prisma.analytics.create({
        data: {
          businessId: data.businessId,
          date: data.date,
          metrics: this.serializeMetrics(data.metrics),
          aiInsights: data.aiInsights ? this.serializeAIInsights(data.aiInsights) : Prisma.JsonNull
        }
      });

      return {
        businessId: result.businessId,
        date: result.date,
        metrics: this.deserializeMetrics(result.metrics),
        aiInsights: this.deserializeAIInsights(result.aiInsights)
      };
    } catch (error) {
      throw new AppError(500, 'Failed to create analytics data');
    }
  }

  async findByBusinessId(businessId: string, startDate?: Date, endDate?: Date): Promise<AnalyticsData[]> {
    try {
      const results = await this.prisma.analytics.findMany({
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

      return results.map(result => ({
        businessId: result.businessId,
        date: result.date,
        metrics: this.deserializeMetrics(result.metrics),
        aiInsights: this.deserializeAIInsights(result.aiInsights)
      }));
    } catch (error) {
      throw new AppError(500, 'Failed to fetch analytics data');
    }
  }

  async updateAiInsights(businessId: string, date: Date, insights: AIInsights): Promise<void> {
    try {
      await this.prisma.analytics.updateMany({
        where: {
          businessId,
          date
        },
        data: {
          aiInsights: this.serializeAIInsights(insights)
        }
      });
    } catch (error) {
      throw new AppError(500, 'Failed to update AI insights');
    }
  }

  async getAggregatedMetrics(businessId: string, startDate: Date, endDate: Date): Promise<Metrics> {
    try {
      const result = await this.prisma.$queryRaw`
        SELECT get_aggregated_metrics(
          ${businessId}::uuid,
          ${startDate}::timestamp with time zone,
          ${endDate}::timestamp with time zone
        ) as metrics
      `;
      
      return this.deserializeMetrics((result as any)[0].metrics);
    } catch (error) {
      throw new AppError(500, 'Failed to get aggregated metrics');
    }
  }
} 