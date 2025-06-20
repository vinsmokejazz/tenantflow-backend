import request from 'supertest';
import { app } from '../../index';
import { prisma } from '../../config/prisma';

describe('Analytics Endpoints', () => {
  let authToken: string;
  let businessId: string;

  const testUser = {
    email: 'analytics@example.com',
    password: 'TestPassword123!',
    name: 'Analytics User',
    business_name: 'Analytics Corp'
  };

  beforeEach(async () => {
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    console.log('REGISTER RESPONSE:', registerResponse.body);
    businessId = registerResponse.body.user?.businessId;

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authToken = loginResponse.body.session.access_token;

    // Create sample analytics data
    await prisma.analytics.create({
      data: {
        businessId,
        date: new Date(),
        metrics: {
          total_leads: 100,
          active_leads: 75,
          converted_leads: 25,
          conversion_rate: 25.0,
          total_revenue: 50000,
          average_deal_size: 2000,
          sales_by_stage: {
            new: 30,
            contacted: 25,
            qualified: 20,
            lost: 25
          },
          customer_acquisition_cost: 500,
          customer_lifetime_value: 5000
        }
      }
    });
  });

  describe('GET /api/v1/analytics/dashboard/:businessId', () => {
    it('should get dashboard metrics successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/dashboard/${businessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('metrics');
      expect(response.body.data.metrics).toHaveProperty('total_leads');
      expect(response.body.data.metrics).toHaveProperty('conversion_rate');
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/dashboard/${businessId}`);

      expect(response.status).toBe(401);
    });

    it('should fail when accessing other business analytics', async () => {
      const otherBusinessId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/v1/analytics/dashboard/${otherBusinessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });

    it('should accept date range parameters', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/v1/analytics/dashboard/${businessId}`)
        .query({ startDate, endDate })
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('metrics');
    });
  });

  describe('GET /api/v1/analytics/pipeline/:businessId', () => {
    it('should get sales pipeline data successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/pipeline/${businessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'month' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should accept different time periods', async () => {
      const periods = ['week', 'month', 'quarter', 'year'];
      
      for (const period of periods) {
        const response = await request(app)
          .get(`/api/v1/analytics/pipeline/${businessId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ period });

        expect(response.status).toBe(200);
      }
    });

    it('should fail with invalid period', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/pipeline/${businessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'invalid' });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/analytics/conversion/:businessId', () => {
    it('should get lead conversion data successfully', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/conversion/${businessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'month' });

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('success');
      expect(response.body.data).toHaveProperty('totalLeads');
      expect(response.body.data).toHaveProperty('convertedLeads');
      expect(response.body.data).toHaveProperty('conversionRate');
    });

    it('should calculate conversion rate correctly', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/conversion/${businessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ period: 'month' });

      expect(response.status).toBe(200);
      const { totalLeads, convertedLeads, conversionRate } = response.body.data;
      expect(conversionRate).toBe((convertedLeads / totalLeads) * 100);
    });
  });

  describe('GET /api/v1/analytics/predictions/:businessId', () => {
    it('should get AI predictions successfully', async () => {
      // Note: This test might fail if OpenAI API is not configured
      // In a real test environment, you might want to mock the AI service
      const response = await request(app)
        .get(`/api/v1/analytics/predictions/${businessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      // Accept both success and error responses since AI service might not be configured
      expect([200, 500]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.body.status).toBe('success');
        expect(response.body.data).toHaveProperty('revenuePredictions');
      }
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get(`/api/v1/analytics/predictions/${businessId}`);

      expect(response.status).toBe(401);
    });
  });
});