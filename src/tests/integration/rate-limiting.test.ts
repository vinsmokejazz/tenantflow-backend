import request from 'supertest';
import { app } from '../../index';

describe('Rate Limiting', () => {
  it('should enforce rate limits', async () => {
    const requests = [];
    const endpoint = '/health';
    
    // Make multiple requests quickly
    for (let i = 0; i < 105; i++) { // Exceed the default limit of 100
      requests.push(request(app).get(endpoint));
    }

    const responses = await Promise.all(requests);
    
    // Check that some requests were rate limited
    const rateLimitedResponses = responses.filter(res => res.status === 429);
    expect(rateLimitedResponses.length).toBeGreaterThan(0);
    
    // Check rate limit response format
    if (rateLimitedResponses.length > 0) {
      const rateLimitResponse = rateLimitedResponses[0];
      expect(rateLimitResponse.body).toHaveProperty('error');
      expect(rateLimitResponse.body.error).toContain('Too many requests');
    }
  }, 10000); // Increase timeout for this test
});