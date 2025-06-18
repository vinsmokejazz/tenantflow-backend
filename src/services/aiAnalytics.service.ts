import { OpenAI } from 'openai';
import { AnalyticsModel } from '../models/analytics.model';

interface AIInsights {
  predicted_revenue: number;
  lead_scoring: Record<string, number>;
  churn_risk: Record<string, number>;
  next_best_actions: string[];
  sentiment_analysis: Record<string, number>;
}

export class AIAnalyticsService {
  private openai: OpenAI;
  private analyticsModel: AnalyticsModel;

  constructor() {
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
    this.analyticsModel = new AnalyticsModel();
  }

  async generateInsights(metrics: any) {
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
      console.error('Error generating AI insights:', error);
      throw error;
    }
  }

  async generatePredictions(historicalData: any[]) {
    try {
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
      if (historicalData.length > 0) {
        const insights: AIInsights = {
          predicted_revenue: predictions.revenuePredictions[0]?.value || 0,
          lead_scoring: predictions.conversionPredictions.reduce((acc: Record<string, number>, pred: any) => {
            acc[pred.leadId] = pred.score;
            return acc;
          }, {}),
          churn_risk: predictions.valuePredictions.reduce((acc: Record<string, number>, pred: any) => {
            acc[pred.customerId] = pred.risk;
            return acc;
          }, {}),
          next_best_actions: predictions.recommendations || [],
          sentiment_analysis: predictions.sentiment || {}
        };

        await this.analyticsModel.updateAiInsights(
          historicalData[0].businessId,
          new Date(),
          insights
        );
      }

      return predictions;
    } catch (error) {
      console.error('Error generating predictions:', error);
      throw error;
    }
  }

  private prepareDataForAnalysis(metrics: any) {
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

  private prepareDataForPrediction(historicalData: any[]) {
    return historicalData.map(data => ({
      date: data.date,
      metrics: data.metrics
    }));
  }

  private createInsightPrompt(data: any) {
    return `Analyze the following CRM metrics and provide insights:
    ${JSON.stringify(data, null, 2)}
    
    Please provide insights on:
    1. Key trends and patterns
    2. Areas of concern
    3. Opportunities for improvement
    4. Recommended actions`;
  }

  private createPredictionPrompt(data: any) {
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
      const parsed = JSON.parse(response);
      return {
        predicted_revenue: parsed.predicted_revenue || 0,
        lead_scoring: parsed.lead_scoring || {},
        churn_risk: parsed.churn_risk || {},
        next_best_actions: parsed.next_best_actions || [],
        sentiment_analysis: parsed.sentiment_analysis || {}
      };
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return {
        predicted_revenue: 0,
        lead_scoring: {},
        churn_risk: {},
        next_best_actions: [],
        sentiment_analysis: {}
      };
    }
  }

  private parsePredictionResponse(response: string) {
    try {
      const parsed = JSON.parse(response);
      return {
        revenuePredictions: parsed.revenuePredictions || [],
        conversionPredictions: parsed.conversionPredictions || [],
        costPredictions: parsed.costPredictions || [],
        valuePredictions: parsed.valuePredictions || [],
        recommendations: parsed.recommendations || [],
        sentiment: parsed.sentiment || {}
      };
    } catch (error) {
      console.error('Error parsing prediction response:', error);
      return {
        revenuePredictions: [],
        conversionPredictions: [],
        costPredictions: [],
        valuePredictions: [],
        recommendations: [],
        sentiment: {}
      };
    }
  }
} 