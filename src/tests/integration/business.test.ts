import request from 'supertest';
import { app } from '../../index';

describe('Business Endpoints', () => {
  let authToken: string;
  let businessId: string;
  let userId: string;

  const testUser = {
    email: 'business@example.com',
    password: 'TestPassword123!',
    name: 'Business Owner',
    business_name: 'Test Business Corp'
  };

  beforeEach(async () => {
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);
    console.log('REGISTER RESPONSE:', registerResponse.body);
    businessId = registerResponse.body.user?.businessId;
    userId = registerResponse.body.user?.id;

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authToken = loginResponse.body.session.access_token;
  });

  describe('GET /api/v1/business', () => {
    it('should get current user business', async () => {
      const response = await request(app)
        .get('/api/v1/business')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(testUser.business_name);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/business');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/business/:id', () => {
    it('should get business by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/business/${testUser.businessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(testUser.business_name);
    });

    it('should fail when accessing other business', async () => {
      const otherBusinessId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/v1/business/${otherBusinessId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/v1/business/:id', () => {
    it('should update business successfully', async () => {
      const updateData = {
        name: 'Updated Business Name',
        subscription: 'premium'
      };

      const response = await request(app)
        .put(`/api/v1/business/${testUser.businessId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.subscription).toBe(updateData.subscription);
    });

    it('should fail for non-admin users', async () => {
      // Create staff user
      const staffUser = {
        email: 'staff@example.com',
        password: 'StaffPassword123!'
      };

      await request(app)
        .post('/api/v1/auth/signup-staff')
        .set('Authorization', `Bearer ${authToken}`)
        .send(staffUser);

      const staffLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send(staffUser);

      const staffToken = staffLoginResponse.body.session.access_token;

      const response = await request(app)
        .put(`/api/v1/business/${testUser.businessId}`)
        .set('Authorization', `Bearer ${staffToken}`)
        .send({ name: 'Should Fail' });

      expect(response.status).toBe(403);
    });
  });
});