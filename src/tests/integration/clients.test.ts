import request from 'supertest';
import { app } from '../../index';

describe('Client Endpoints', () => {
  let authToken: string;
  let businessId: string;
  let clientId: string;

  const testUser = {
    email: 'client-manager@example.com',
    password: 'TestPassword123!',
    name: 'Client Manager',
    business_name: 'Client Management Corp'
  };

  const testClient = {
    name: 'John Doe',
    email: 'john@example.com',
    phone: '+1234567890'
  };

  beforeEach(async () => {
    // Register and login user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(testUser);

    businessId = registerResponse.body.user.businessId;

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password
      });

    authToken = loginResponse.body.session.access_token;
  });

  describe('POST /api/v1/clients', () => {
    it('should create a new client successfully', async () => {
      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testClient);

      expect(response.status).toBe(201);
      expect(response.body.name).toBe(testClient.name);
      expect(response.body.email).toBe(testClient.email);
      expect(response.body.phone).toBe(testClient.phone);
      expect(response.body).toHaveProperty('id');

      clientId = response.body.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/clients')
        .send(testClient);

      expect(response.status).toBe(401);
    });

    it('should fail with invalid data', async () => {
      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: '', // Empty name should fail
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/clients', () => {
    beforeEach(async () => {
      // Create test client
      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testClient);
      
      clientId = response.body.id;
    });

    it('should get all clients for business', async () => {
      const response = await request(app)
        .get('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].name).toBe(testClient.name);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/clients');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/clients/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testClient);
      
      clientId = response.body.id;
    });

    it('should get client by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(clientId);
      expect(response.body.name).toBe(testClient.name);
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/v1/clients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/clients/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testClient);
      
      clientId = response.body.id;
    });

    it('should update client successfully', async () => {
      const updateData = {
        name: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+0987654321'
      };

      const response = await request(app)
        .put(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Client updated successfully');
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/api/v1/clients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/clients/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/clients')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testClient);
      
      clientId = response.body.id;
    });

    it('should delete client successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/clients/${clientId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent client', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/v1/clients/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});