import request from 'supertest';
import { app } from '../../index';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  business_name: string;
}

export interface AuthenticatedUser {
  token: string;
  businessId: string;
  userId: string;
  user: any;
}

export class TestHelpers {
  static async createAndAuthenticateUser(userData: TestUser): Promise<AuthenticatedUser> {
    // Register user
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(userData);

    if (registerResponse.status !== 201) {
      throw new Error(`Registration failed: ${registerResponse.body.message}`);
    }

    const { user } = registerResponse.body;

    // Login user
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: userData.email,
        password: userData.password
      });

    if (loginResponse.status !== 200) {
      throw new Error(`Login failed: ${loginResponse.body.message}`);
    }

    return {
      token: loginResponse.body.session.access_token,
      businessId: user.businessId,
      userId: user.id,
      user: loginResponse.body.user
    };
  }

  static async createTestClient(token: string, clientData: any) {
    const response = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${token}`)
      .send(clientData);

    if (response.status !== 201) {
      throw new Error(`Client creation failed: ${response.body.message}`);
    }

    return response.body;
  }

  static async createTestLead(token: string, leadData: any) {
    const response = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${token}`)
      .send(leadData);

    if (response.status !== 201) {
      throw new Error(`Lead creation failed: ${response.body.message}`);
    }

    return response.body;
  }

  static async createTestFollowUp(token: string, followUpData: any) {
    const response = await request(app)
      .post('/api/v1/followUp')
      .set('Authorization', `Bearer ${token}`)
      .send(followUpData);

    if (response.status !== 201) {
      throw new Error(`Follow-up creation failed: ${response.body.message}`);
    }

    return response.body;
  }

  static generateTestEmail(): string {
    return `test-${Date.now()}-${Math.random().toString(36).substr(2, 9)}@example.com`;
  }

  static generateTestUser(overrides: Partial<TestUser> = {}): TestUser {
    return {
      email: this.generateTestEmail(),
      password: 'TestPassword123!',
      name: 'Test User',
      business_name: 'Test Business',
      ...overrides
    };
  }

  static async waitForCondition(
    condition: () => Promise<boolean>,
    timeout: number = 5000,
    interval: number = 100
  ): Promise<void> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    throw new Error(`Condition not met within ${timeout}ms`);
  }
}

export const testData = {
  validUser: {
    email: 'valid@example.com',
    password: 'ValidPassword123!',
    name: 'Valid User',
    business_name: 'Valid Business'
  },
  
  validClient: {
    name: 'Test Client',
    email: 'client@example.com',
    phone: '+1234567890'
  },
  
  validLead: {
    status: 'new' as const,
    notes: 'Test lead notes',
    clientId: '' // Will be set dynamically
  },
  
  validFollowUp: {
    notes: 'Test follow-up notes',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: '' // Will be set dynamically
  }
};