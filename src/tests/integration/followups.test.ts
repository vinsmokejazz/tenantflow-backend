import request from 'supertest';
import { app } from '../../index';

describe('Follow-up Endpoints', () => {
  let authToken: string;
  let businessId: string;
  let clientId: string;
  let followUpId: string;

  const testUser = {
    email: 'followup-manager@example.com',
    password: 'TestPassword123!',
    name: 'Follow-up Manager',
    business_name: 'Follow-up Management Corp'
  };

  const testClient = {
    name: 'Follow-up Client',
    email: 'followupclient@example.com',
    phone: '+1234567890'
  };

  const testFollowUp = {
    notes: 'Follow up on proposal discussion',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    clientId: ''
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

    // Create test client
    const clientResponse = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testClient);

    clientId = clientResponse.body.id;
    testFollowUp.clientId = clientId;
  });

  describe('POST /api/v1/followUp', () => {
    it('should create a new follow-up successfully', async () => {
      const response = await request(app)
        .post('/api/v1/followUp')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testFollowUp);

      expect(response.status).toBe(201);
      expect(response.body.notes).toBe(testFollowUp.notes);
      expect(response.body.clientId).toBe(clientId);
      expect(response.body.completed).toBe(false);
      expect(response.body).toHaveProperty('id');

      followUpId = response.body.id;
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/followUp')
        .send(testFollowUp);

      expect(response.status).toBe(401);
    });

    it('should fail with invalid due date', async () => {
      const response = await request(app)
        .post('/api/v1/followUp')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          ...testFollowUp,
          dueDate: 'invalid-date'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/followUp', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/followUp')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testFollowUp);
      
      followUpId = response.body.id;
    });

    it('should get all follow-ups for business', async () => {
      const response = await request(app)
        .get('/api/v1/followUp')
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(1);
      expect(response.body[0].notes).toBe(testFollowUp.notes);
    });

    it('should fail without authentication', async () => {
      const response = await request(app)
        .get('/api/v1/followUp');

      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/v1/followUp/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/followUp')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testFollowUp);
      
      followUpId = response.body.id;
    });

    it('should get follow-up by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/followUp/${followUpId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(followUpId);
      expect(response.body.notes).toBe(testFollowUp.notes);
    });

    it('should return 404 for non-existent follow-up', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/v1/followUp/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/followUp/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/followUp')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testFollowUp);
      
      followUpId = response.body.id;
    });

    it('should update follow-up successfully', async () => {
      const updateData = {
        notes: 'Updated follow-up notes',
        completed: true,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString()
      };

      const response = await request(app)
        .put(`/api/v1/followUp/${followUpId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Follow-up updated successfully');
    });

    it('should return 404 for non-existent follow-up', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/api/v1/followUp/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ notes: 'Updated notes' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/followUp/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/followUp')
        .set('Authorization', `Bearer ${authToken}`)
        .send(testFollowUp);
      
      followUpId = response.body.id;
    });

    it('should delete follow-up successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/followUp/${followUpId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent follow-up', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/v1/followUp/${fakeId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(response.status).toBe(404);
    });
  });
});