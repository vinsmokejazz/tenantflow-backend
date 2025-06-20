import request from 'supertest';
import { app } from '../../index';

describe('Lead Endpoints', () => {
  let authToken: string;
  let clientId: string;
  let leadId: string;
  let businessId: string;

  const testUser = {
    email: 'lead-manager@example.com',
    password: 'TestPassword123!',
    name: 'Lead Manager',
    business_name: 'Lead Management Corp'
  };

  const testClient = {
    name: 'Lead Client',
    email: 'leadclient@example.com',
    phone: '+1234567890'
  };

  const testLead = {
    status: 'new',
    notes: 'Initial contact made',
    clientId: ''
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

    // Create test client
    const clientResponse = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testClient);

    clientId = clientResponse.body.id;
    testLead.clientId = clientId;
  });

  describe('POST /api/v1/leads', () => {
    it('should create a new lead successfully', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);

      expect(response.status).toBe(201);
      expect(response.body.status).toBe(testLead.status);
      expect(response.body.notes).toBe(testLead.notes);
      expect(response.body.clientId).toBe(clientId);
      expect(response.body).toHaveProperty('id');

      leadId = response.body.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .send(testLead);

      expect(response.status).toBe(401);
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testLead,
          status: 'invalid-status'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/leads', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);
      
      leadId = response.body.id;
    });

    it('should get all leads for business', async () => {
      const response = await request(app)
        .get('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe(testLead.status);
    });

    it('should filter leads by status', async () => {
      const response = await request(app)
        .get('/api/v1/leads?status=new')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].status).toBe('new');
    });
  });

  describe('GET /api/v1/leads/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);
      
      leadId = response.body.id;
    });

    it('should get lead by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(leadId);
      expect(response.body.status).toBe(testLead.status);
    });

    it('should return 404 for non-existent lead', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/v1/leads/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/leads/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);
      
      leadId = response.body.id;
    });

    it('should update lead successfully', async () => {
      const updateData = {
        status: 'qualified',
        notes: 'Lead qualified for next stage'
      };

      const response = await request(app)
        .put(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Lead updated successfully');
    });

    it('should fail with invalid status', async () => {
      const response = await request(app)
        .put(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ status: 'invalid-status' });

      expect(response.status).toBe(400);
    });
  });

  describe('DELETE /api/v1/leads/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/leads')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testLead);
      
      leadId = response.body.id;
    });

    it('should delete lead successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/leads/${leadId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent lead', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/v1/leads/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});