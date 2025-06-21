#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

async function setup() {
  console.log('🚀 TenantFlow Backend Setup\n');
  
  try {
    // Check if .env already exists
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
      const overwrite = await question('⚠️  .env file already exists. Overwrite? (y/N): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('Setup cancelled.');
        rl.close();
        return;
      }
    }

    console.log('Please provide the following configuration:\n');

    const config = {
      NODE_ENV: 'development',
      PORT: await question('Port (default: 3001): ') || '3001',
      DATABASE_URL: await question('Database URL (postgresql://...): '),
      DIRECT_URL: await question('Direct Database URL (same as DATABASE_URL): '),
      CORS_ORIGIN: await question('CORS Origin (default: http://localhost:3000): ') || 'http://localhost:3000',
      RATE_LIMIT_WINDOW_MS: '900000',
      RATE_LIMIT_MAX: '100',
      SUPABASE_URL: await question('Supabase URL (https://your-project.supabase.co): '),
      SUPABASE_SERVICE_ROLE_KEY: await question('Supabase Service Role Key: '),
      SUPABASE_ANON_KEY: await question('Supabase Anon Key: '),
      OPENAI_API_KEY: await question('OpenAI API Key: '),
      LOG_LEVEL: 'info'
    };

    // Validate required fields
    const requiredFields = ['DATABASE_URL', 'DIRECT_URL', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_ANON_KEY'];
    const missingFields = requiredFields.filter(field => !config[field]);
    
    if (missingFields.length > 0) {
      console.error('❌ Missing required fields:', missingFields.join(', '));
      rl.close();
      return;
    }

    // Generate .env content
    const envContent = Object.entries(config)
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');

    // Write .env file
    fs.writeFileSync(envPath, envContent);
    console.log('\n✅ .env file created successfully!');

    // Generate Prisma client
    console.log('\n🔧 Generating Prisma client...');
    const { execSync } = require('child_process');
    try {
      execSync('npm run prisma:generate', { stdio: 'inherit' });
      console.log('✅ Prisma client generated!');
    } catch (error) {
      console.error('❌ Failed to generate Prisma client:', error.message);
    }

    console.log('\n🎉 Setup completed! You can now run:');
    console.log('  npm run dev');
    console.log('\nMake sure your database is running and accessible.');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  } finally {
    rl.close();
  }
}

setup(); 