import { OpenAI } from 'openai';
import { AnalyticsModel, Metrics, AIInsights } from '../models/analytics.model';
import { AppError } from '../utils/error';
import { logger } from '../utils/logger';

interface AIResponse {
  predicted_revenue: number;
  lead_scoring: Record<string, number>;
  churn_risk: Record<string, number>;
  next_best_actions: string[];
  sentiment_analysis: Record<string, number>;
}

interface PredictionResponse {
  revenuePredictions: Array<{ date: string; value: number }>;
  conversionPredictions: Array<{ leadId: string; score: number }>;
  costPredictions: Array<{ date: string; value: number }>;
  valuePredictions: Array<{ customerId: string; risk: number }>;
  recommendations: string[];
  sentiment: Record<string, number>;
}

interface AnalyticsDataPoint {
  businessId: string;
  metrics: Metrics;
  date: Date;
}

export class AIAnalyticsService {
  private openai: OpenAI;
  private analyticsModel: AnalyticsModel;

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new AppError(500, 'OpenAI API key is not configured');
    }

    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.analyticsModel = new AnalyticsModel();
  }

  async generateInsights(metrics: Metrics & { businessId: string }): Promise<AIInsights> {
    try {
      // Prepare data for AI analysis
      const dataForAnalysis = this.prepareDataForAnalysis(metrics);

      // Generate insights using OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an AI analytics assistant that provides insights on CRM metrics."
          },
          {
            role: "user",
            content: this.createInsightPrompt(dataForAnalysis)
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      // Parse and structure the AI response
      const insights = this.parseAIResponse(response.choices[0].message.content || '');

      // Store insights in database
      await this.analyticsModel.updateAiInsights(
        metrics.businessId,
        new Date(),
        insights
      );

      return insights;
    } catch (error) {
      logger.error('Error generating AI insights:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Error generating AI insights');
    }
  }

  async generatePredictions(historicalData: AnalyticsDataPoint[]): Promise<PredictionResponse> {
    try {
      if (historicalData.length === 0) {
        throw new AppError(400, 'No historical data available for predictions');
      }

      // Prepare historical data for prediction
      const preparedData = this.prepareDataForPrediction(historicalData);

      // Generate predictions using OpenAI
      const response = await this.openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an AI analytics assistant that predicts future trends based on historical data."
          },
          {
            role: "user",
            content: this.createPredictionPrompt(preparedData)
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      });

      // Parse and structure the predictions
      const predictions = this.parsePredictionResponse(response.choices[0].message.content || '');

      // Store predictions in database
      const insights: AIInsights = {
        predicted_revenue: predictions.revenuePredictions[0]?.value || 0,
        lead_scoring: predictions.conversionPredictions.reduce((acc: Record<string, number>, pred) => {
          acc[pred.leadId] = pred.score;
          return acc;
        }, {}),
        churn_risk: predictions.valuePredictions.reduce((acc: Record<string, number>, pred) => {
          acc[pred.customerId] = pred.risk;
          return acc;
        }, {}),
        next_best_actions: predictions.recommendations,
        sentiment_analysis: predictions.sentiment
      };

      await this.analyticsModel.updateAiInsights(
        historicalData[0].businessId,
        new Date(),
        insights
      );

      return predictions;
    } catch (error) {
      logger.error('Error generating predictions:', error);
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(500, 'Error generating predictions');
    }
  }

  private prepareDataForAnalysis(metrics: Metrics): Record<string, any> {
    return {
      metrics: {
        total_leads: metrics.total_leads,
        active_leads: metrics.active_leads,
        converted_leads: metrics.converted_leads,
        total_revenue: metrics.total_revenue,
        average_deal_size: metrics.average_deal_size,
        sales_by_stage: metrics.sales_by_stage,
        customer_acquisition_cost: metrics.customer_acquisition_cost,
        customer_lifetime_value: metrics.customer_lifetime_value
      }
    };
  }

  private prepareDataForPrediction(historicalData: AnalyticsDataPoint[]): Array<{ date: string; metrics: Metrics }> {
    return historicalData.map(data => ({
      date: data.date.toISOString(),
      metrics: data.metrics
    }));
  }

  private createInsightPrompt(data: Record<string, any>): string {
    return `Analyze the following CRM metrics and provide insights:
    ${JSON.stringify(data, null, 2)}
    
    Please provide insights on:
    1. Key trends and patterns
    2. Areas of concern
    3. Opportunities for improvement
    4. Recommended actions`;
  }

  private createPredictionPrompt(data: Array<{ date: string; metrics: Metrics }>): string {
    return `Based on the following historical CRM data, predict future trends:
    ${JSON.stringify(data, null, 2)}
    
    Please provide predictions for:
    1. Revenue trends
    2. Lead conversion rates
    3. Customer acquisition costs
    4. Customer lifetime value`;
  }

  private parseAIResponse(response: string): AIInsights {
    try {
      const parsed = JSON.parse(response) as AIResponse;
      return {
        predicted_revenue: parsed.predicted_revenue || 0,
        lead_scoring: parsed.lead_scoring || {},
        churn_risk: parsed.churn_risk || {},
        next_best_actions: parsed.next_best_actions || [],
        sentiment_analysis: parsed.sentiment_analysis || {}
      };
    } catch (error) {
      logger.error('Error parsing AI response:', error);
      throw new AppError(500, 'Failed to parse AI response');
    }
  }

  private parsePredictionResponse(response: string): PredictionResponse {
    try {
      const parsed = JSON.parse(response) as PredictionResponse;
      return {
        revenuePredictions: parsed.revenuePredictions || [],
        conversionPredictions: parsed.conversionPredictions || [],
        costPredictions: parsed.costPredictions || [],
        valuePredictions: parsed.valuePredictions || [],
        recommendations: parsed.recommendations || [],
        sentiment: parsed.sentiment || {}
      };
    } catch (error) {
      logger.error('Error parsing prediction response:', error);
      throw new AppError(500, 'Failed to parse prediction response');
    }
  }
} 