import { Request, Response } from 'express';
import { AnalyticsModel, AnalyticsData, Metrics } from '../models/analytics.model';
import { AppError } from '../utils/error';
import { AIAnalyticsService } from '../services/aiAnalytics.service';
import { logger } from '../utils/logger';

interface DateRange {
  start: Date;
  end: Date;
}

export class AnalyticsController {
  private analyticsModel: AnalyticsModel;
  private aiService: AIAnalyticsService;

  constructor() {
    this.analyticsModel = new AnalyticsModel();
    this.aiService = new AIAnalyticsService();
  }

  private validateDateRange(startDate?: string, endDate?: string): DateRange {
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : new Date();

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new AppError(400, 'Invalid date format');
    }

    if (start > end) {
      throw new AppError(400, 'Start date must be before end date');
    }

    return { start, end };
  }

  private getDateRange(period: string): Date {
    const now = new Date();
    switch (period) {
      case 'week':
        return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      case 'month':
        return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      case 'quarter':
        return new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      case 'year':
        return new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      default:
        throw new AppError(400, 'Invalid period specified');
    }
  }

  async getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { startDate, endDate } = req.query;

      const { start, end } = this.validateDateRange(
        startDate as string | undefined,
        endDate as string | undefined
      );

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
      logger.error('Error in getDashboardMetrics:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Error fetching dashboard metrics');
    }
  }

  async getSalesPipeline(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { period } = req.query;

      const start = this.getDateRange(period as string);
      const end = new Date();

      const metrics = await this.analyticsModel.findByBusinessId(businessId, start, end);
      const pipelineData = this.processPipelineData(metrics);

      res.status(200).json({
        status: 'success',
        data: pipelineData
      });
    } catch (error) {
      logger.error('Error in getSalesPipeline:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Error fetching sales pipeline data');
    }
  }

  async getLeadConversion(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const { period } = req.query;

      const start = this.getDateRange(period as string);
      const end = new Date();

      const metrics = await this.analyticsModel.findByBusinessId(businessId, start, end);
      const conversionData = this.processConversionData(metrics);

      res.status(200).json({
        status: 'success',
        data: conversionData
      });
    } catch (error) {
      logger.error('Error in getLeadConversion:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Error fetching lead conversion data');
    }
  }

  async getPredictions(req: Request, res: Response): Promise<void> {
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
      logger.error('Error in getPredictions:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Error generating predictions');
    }
  }

  private processPipelineData(metrics: AnalyticsData[]): Array<{ stage: string; count: number; value: number }> {
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

  private processConversionData(metrics: AnalyticsData[]): { totalLeads: number; convertedLeads: number; conversionRate: number } {
    return metrics.reduce((acc, metric) => {
      acc.totalLeads += metric.metrics.total_leads;
      acc.convertedLeads += metric.metrics.converted_leads;
      acc.conversionRate = (acc.convertedLeads / acc.totalLeads) * 100;
      return acc;
    }, { totalLeads: 0, convertedLeads: 0, conversionRate: 0 });
  }
} 