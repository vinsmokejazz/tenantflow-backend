import { Request, Response } from 'express';
import { AnalyticsModel } from '../models/analytics.model';
import { AppError } from '../middleware/errorHandler';
import { AIAnalyticsService } from '../services/aiAnalytics.service';

export class AnalyticsController {
  private analyticsModel: AnalyticsModel;
  private aiService: AIAnalyticsService;

  constructor() {
    this.analyticsModel = new AnalyticsModel();
    this.aiService = new AIAnalyticsService();
  }

  // Get dashboard metrics
  async getDashboardMetrics(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;

      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      // Get aggregated metrics
      const metrics = await this.analyticsModel.getAggregatedMetrics(businessId, start, end);

      // Get AI insights
      const aiInsights = await this.aiService.generateInsights(metrics);

      res.status(200).json({
        status: 'success',
        data: {
          metrics,
          aiInsights
        }
      });
    } catch (error) {
      throw new AppError(500, 'Error fetching dashboard metrics');
    }
  }

  // Get sales pipeline analytics
  async getSalesPipeline(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { period } = req.query;

      const start = this.getDateRange(period as string);
      const end = new Date();

      const metrics = await this.analyticsModel.findByBusinessId(businessId, start, end);
      
      // Process sales pipeline data
      const pipelineData = this.processPipelineData(metrics);

      res.status(200).json({
        status: 'success',
        data: pipelineData
      });
    } catch (error) {
      throw new AppError(500, 'Error fetching sales pipeline data');
    }
  }

  // Get lead conversion analytics
  async getLeadConversion(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const { period } = req.query;

      const start = this.getDateRange(period as string);
      const end = new Date();

      const metrics = await this.analyticsModel.findByBusinessId(businessId, start, end);
      
      // Process conversion data
      const conversionData = this.processConversionData(metrics);

      res.status(200).json({
        status: 'success',
        data: conversionData
      });
    } catch (error) {
      throw new AppError(500, 'Error fetching lead conversion data');
    }
  }

  // Get AI-powered predictions
  async getPredictions(req: Request, res: Response) {
    try {
      const { businessId } = req.params;
      const start = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const end = new Date();

      const historicalData = await this.analyticsModel.findByBusinessId(businessId, start, end);
      const predictions = await this.aiService.generatePredictions(historicalData);

      res.status(200).json({
        status: 'success',
        data: predictions
      });
    } catch (error) {
      throw new AppError(500, 'Error generating predictions');
    }
  }

  private processPipelineData(metrics: any[]) {
    const pipelineData = new Map<string, { count: number; value: number }>();

    metrics.forEach(metric => {
      const salesByStage = metric.metrics.sales_by_stage;
      Object.entries(salesByStage).forEach(([stage, value]) => {
        const current = pipelineData.get(stage) || { count: 0, value: 0 };
        pipelineData.set(stage, {
          count: current.count + 1,
          value: current.value + (value as number)
        });
      });
    });

    return Array.from(pipelineData.entries()).map(([stage, data]) => ({
      stage,
      count: data.count,
      value: data.value
    }));
  }

  private processConversionData(metrics: any[]) {
    return metrics.reduce((acc, metric) => {
      acc.totalLeads += metric.metrics.total_leads;
      acc.convertedLeads += metric.metrics.converted_leads;
      acc.conversionRate = (acc.convertedLeads / acc.totalLeads) * 100;
      return acc;
    }, { totalLeads: 0, convertedLeads: 0, conversionRate: 0 });
  }

  private getDateRange(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        now.setDate(now.getDate() - 7);
        return now;
      case 'month':
        now.setMonth(now.getMonth() - 1);
        return now;
      case 'quarter':
        now.setMonth(now.getMonth() - 3);
        return now;
      case 'year':
        now.setFullYear(now.getFullYear() - 1);
        return now;
      default:
        now.setMonth(now.getMonth() - 1);
        return now;
    }
  }
} 