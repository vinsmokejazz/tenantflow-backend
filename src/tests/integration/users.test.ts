import request from 'supertest';
import { app } from '../../index';

describe('User Management Endpoints', () => {
  let adminToken: string;
  let staffToken: string;
  let businessId: string;
  let staffUserId: string;

  const adminUser = {
    email: 'admin@example.com',
    password: 'AdminPassword123!',
    name: 'Admin User',
    business_name: 'User Management Corp'
  };

  const staffUser = {
    email: 'staff@example.com',
    password: 'StaffPassword123!',
    name: 'Staff User',
    role: 'staff'
  };

  beforeEach(async () => {
    // Register and login admin user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(adminUser);

    businessId = registerResponse.body.user.businessId;

    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      });

    adminToken = loginResponse.body.session.access_token;
  });

  describe('POST /api/v1/user', () => {
    it('should create a new staff user successfully', async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(staffUser);

      expect(response.status).toBe(201);
      expect(response.body.email).toBe(staffUser.email);
      expect(response.body.name).toBe(staffUser.name);
      expect(response.body.role).toBe('staff');
      expect(response.body).toHaveProperty('id');

      staffUserId = response.body.id;
    });

    it('should fail without admin privileges', async () => {
      // First create a staff user
      await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(staffUser);

      // Login as staff
      const staffLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: staffUser.email,
          password: staffUser.password
        });

      staffToken = staffLoginResponse.body.session.access_token;

      // Try to create user as staff (should fail)
      const response = await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${staffToken}`)
        .send({
          email: 'newuser@example.com',
          password: 'NewPassword123!',
          name: 'New User'
        });

      expect(response.status).toBe(403);
    });

    it('should fail with invalid email', async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          ...staffUser,
          email: 'invalid-email'
        });

      expect(response.status).toBe(400);
    });
  });

  describe('GET /api/v1/user', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(staffUser);
      
      staffUserId = response.body.id;
    });

    it('should get all users for business', async () => {
      const response = await request(app)
        .get('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(2); // Admin + Staff
      
      const staffUserInResponse = response.body.find((u: any) => u.email === staffUser.email);
      expect(staffUserInResponse).toBeDefined();
      expect(staffUserInResponse.role).toBe('staff');
    });

    it('should filter users by role', async () => {
      const response = await request(app)
        .get('/api/v1/user?role=staff')
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.length).toBe(1);
      expect(response.body[0].role).toBe('staff');
    });

    it('should fail without admin privileges', async () => {
      const staffLoginResponse = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: staffUser.email,
          password: staffUser.password
        });

      staffToken = staffLoginResponse.body.session.access_token;

      const response = await request(app)
        .get('/api/v1/user')
        .set('Authorization', `Bearer ${staffToken}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/v1/user/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(staffUser);
      
      staffUserId = response.body.id;
    });

    it('should get user by ID', async () => {
      const response = await request(app)
        .get(`/api/v1/user/${staffUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(200);
      expect(response.body.id).toBe(staffUserId);
      expect(response.body.email).toBe(staffUser.email);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .get(`/api/v1/user/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });

  describe('PUT /api/v1/user/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(staffUser);
      
      staffUserId = response.body.id;
    });

    it('should update user successfully', async () => {
      const updateData = {
        name: 'Updated Staff Name',
        email: 'updated-staff@example.com'
      };

      const response = await request(app)
        .put(`/api/v1/user/${staffUserId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.name).toBe(updateData.name);
      expect(response.body.email).toBe(updateData.email);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .put(`/api/v1/user/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ name: 'Updated Name' });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/v1/user/:id', () => {
    beforeEach(async () => {
      const response = await request(app)
        .post('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`)
        .send(staffUser);
      
      staffUserId = response.body.id;
    });

    it('should delete user successfully', async () => {
      const response = await request(app)
        .delete(`/api/v1/user/${staffUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(204);
    });

    it('should prevent admin from deleting themselves', async () => {
      // Get admin user ID
      const usersResponse = await request(app)
        .get('/api/v1/user')
        .set('Authorization', `Bearer ${adminToken}`);

      const adminUserId = usersResponse.body.find((u: any) => u.email === adminUser.email).id;

      const response = await request(app)
        .delete(`/api/v1/user/${adminUserId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent user', async () => {
      const fakeId = '550e8400-e29b-41d4-a716-446655440000';
      const response = await request(app)
        .delete(`/api/v1/user/${fakeId}`)
        .set('Authorization', `Bearer ${adminToken}`);

      expect(response.status).toBe(404);
    });
  });
});