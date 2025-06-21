#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');

async function runMigrations() {
  console.log('🔄 Running database migrations...\n');

  try {
    // Generate Prisma client
    console.log('📦 Generating Prisma client...');
    execSync('npm run prisma:generate', { stdio: 'inherit' });
    console.log('✅ Prisma client generated successfully!\n');

    // Run migrations
    console.log('🗄️  Running database migrations...');
    execSync('npm run prisma:migrate', { stdio: 'inherit' });
    console.log('✅ Database migrations completed successfully!\n');

    // Open Prisma Studio (optional)
    console.log('🎉 Database setup completed!');
    console.log('\nYou can now:');
    console.log('  - Start the server: npm run dev');
    console.log('  - View database: npm run prisma:studio');
    console.log('  - Sync existing users: POST /api/v1/auth/sync-users');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.log('\nTroubleshooting:');
    console.log('1. Check your DATABASE_URL in .env file');
    console.log('2. Ensure your database is running and accessible');
    console.log('3. Verify your database user has proper permissions');
    process.exit(1);
  }
}

runMigrations(); 