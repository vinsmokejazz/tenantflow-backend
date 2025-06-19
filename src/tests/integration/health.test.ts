import request from 'supertest';
import { app } from '../../index';

describe('Health Check Endpoint', () => {
  describe('GET /health', () => {
    it('should return health status successfully', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status', 'ok');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('environment');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should not require authentication', async () => {
      const response = await request(app)
        .get('/health');

      expect(response.status).toBe(200);
    });
  });

  describe('404 Handler', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/non-existent-route');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('status', 'error');
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toContain('Route /non-existent-route not found');
    });
  });
});