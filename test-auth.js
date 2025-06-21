const fetch = require('node-fetch');

async function testAuth() {
  const baseUrl = 'http://localhost:3001/api/v1';
  
  console.log('🧪 Testing Authentication Setup...\n');

  try {
    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await fetch(`${baseUrl.replace('/api/v1', '')}/health`);
    if (healthResponse.ok) {
      console.log('✅ Server is running');
    } else {
      console.log('❌ Server health check failed');
      return;
    }

    // Test 2: Register a new user
    console.log('\n2. Testing user registration...');
    const registerData = {
      email: 'test@example.com',
      password: 'TestPassword123!',
      name: 'Test User',
      business_name: 'Test Business'
    };

    const registerResponse = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(registerData)
    });

    if (registerResponse.ok) {
      const registerResult = await registerResponse.json();
      console.log('✅ User registered successfully:', registerResult.message);
    } else {
      const error = await registerResponse.json();
      console.log('⚠️  Registration response:', error.message);
    }

    // Test 3: Login
    console.log('\n3. Testing user login...');
    const loginData = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    };

    const loginResponse = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(loginData)
    });

    if (loginResponse.ok) {
      const loginResult = await loginResponse.json();
      console.log('✅ Login successful:', loginResult.message);
      
      // Test 4: Protected route with token
      console.log('\n4. Testing protected route...');
      const token = loginResult.session.access_token;
      
      const protectedResponse = await fetch(`${baseUrl}/business`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (protectedResponse.ok) {
        console.log('✅ Protected route accessible');
      } else {
        console.log('❌ Protected route failed:', protectedResponse.status);
      }
    } else {
      const error = await loginResponse.json();
      console.log('❌ Login failed:', error.message);
    }

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Make sure the server is running: npm run dev');
    console.log('2. Check your .env file configuration');
    console.log('3. Verify database connection');
  }
}

testAuth(); 