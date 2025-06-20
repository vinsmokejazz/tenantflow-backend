import request from 'supertest';
import { app } from '../../index';

describe('Complete Workflow Integration', () => {
  let authToken: string;
  let clientId: string;
  let leadId: string;
  let followUpId: string;

  const adminUser = {
    email: 'workflow-admin@example.com',
    password: 'AdminPassword123!',
    name: 'Workflow Admin',
    business_name: 'Complete Workflow Corp'
  };

  const testClient = {
    name: 'Workflow Client',
    email: 'client@workflow.com',
    phone: '+1234567890'
  };

  const testLead = {
    status: 'new',
    notes: 'Initial contact from website',
    clientId: ''
  };

  const testFollowUp = {
    notes: 'Schedule demo call',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    clientId: ''
  };

  const staffUser = {
    email: 'workflow-staff@example.com',
    password: 'StaffPassword123!',
    name: 'Workflow Staff',
    role: 'staff'
  };

  it('should complete a full CRM workflow', async () => {
    // Step 1: Register business admin
    const registerResponse = await request(app)
      .post('/api/v1/auth/register')
      .send(adminUser);

    expect(registerResponse.status).toBe(201);

    // Step 2: Login admin
    const loginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: adminUser.email,
        password: adminUser.password
      });

    expect(loginResponse.status).toBe(200);
    authToken = loginResponse.body.session.access_token;

    // Step 3: Create staff user
    const createStaffResponse = await request(app)
      .post('/api/v1/user')
      .set('Authorization', `Bearer ${authToken}`)
      .send(staffUser);

    expect(createStaffResponse.status).toBe(201);

    // Step 4: Create client
    const createClientResponse = await request(app)
      .post('/api/v1/clients')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testClient);

    expect(createClientResponse.status).toBe(201);
    clientId = createClientResponse.body.id;
    testLead.clientId = clientId;
    testFollowUp.clientId = clientId;

    // Step 5: Create lead
    const createLeadResponse = await request(app)
      .post('/api/v1/leads')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testLead);

    expect(createLeadResponse.status).toBe(201);
    leadId = createLeadResponse.body.id;

    // Step 6: Create follow-up
    const createFollowUpResponse = await request(app)
      .post('/api/v1/followUp')
      .set('Authorization', `Bearer ${authToken}`)
      .send(testFollowUp);

    expect(createFollowUpResponse.status).toBe(201);
    followUpId = createFollowUpResponse.body.id;

    // Step 7: Update lead status
    const updateLeadResponse = await request(app)
      .put(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'contacted',
        notes: 'Called client, interested in our services'
      });

    expect(updateLeadResponse.status).toBe(200);

    // Step 8: Complete follow-up
    const updateFollowUpResponse = await request(app)
      .put(`/api/v1/followUp/${followUpId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        completed: true,
        notes: 'Demo completed successfully'
      });

    expect(updateFollowUpResponse.status).toBe(200);

    // Step 9: Update lead to qualified
    const qualifyLeadResponse = await request(app)
      .put(`/api/v1/leads/${leadId}`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        status: 'qualified',
        notes: 'Client ready to proceed with proposal'
      });

    expect(qualifyLeadResponse.status).toBe(200);

    // Step 10: Verify all data is accessible
    const clientsResponse = await request(app)
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${authToken}`);

    expect(clientsResponse.status).toBe(200);
    expect(clientsResponse.body.length).toBe(1);

    const leadsResponse = await request(app)
      .get('/api/v1/leads')
      .set('Authorization', `Bearer ${authToken}`);

    expect(leadsResponse.status).toBe(200);
    expect(leadsResponse.body.length).toBe(1);
    expect(leadsResponse.body[0].status).toBe('qualified');

    const followUpsResponse = await request(app)
      .get('/api/v1/followUp')
      .set('Authorization', `Bearer ${authToken}`);

    expect(followUpsResponse.status).toBe(200);
    expect(followUpsResponse.body.length).toBe(1);
    expect(followUpsResponse.body[0].completed).toBe(true);

    const usersResponse = await request(app)
      .get('/api/v1/user')
      .set('Authorization', `Bearer ${authToken}`);

    expect(usersResponse.status).toBe(200);
    expect(usersResponse.body.length).toBe(2); // Admin + Staff

    // Step 11: Test staff user login and limited access
    const staffLoginResponse = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: staffUser.email,
        password: staffUser.password
      });

    expect(staffLoginResponse.status).toBe(200);
    const staffToken = staffLoginResponse.body.session.access_token;

    // Staff can view clients
    const staffClientsResponse = await request(app)
      .get('/api/v1/clients')
      .set('Authorization', `Bearer ${staffToken}`);

    expect(staffClientsResponse.status).toBe(200);

    // Staff cannot create users
    const staffCreateUserResponse = await request(app)
      .post('/api/v1/user')
      .set('Authorization', `Bearer ${staffToken}`)
      .send({
        email: 'another-staff@example.com',
        password: 'Password123!',
        name: 'Another Staff'
      });

    expect(staffCreateUserResponse.status).toBe(403);

    console.log('✅ Complete workflow test passed successfully!');
  }, 30000); // Increase timeout for this comprehensive test
});