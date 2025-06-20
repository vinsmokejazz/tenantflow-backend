import { PrismaClient } from '@prisma/client';
import { supabaseAdmin } from '../../src/config/supabase';

const prisma = new PrismaClient();

beforeAll(async () => {
  // Connect to test database
  await prisma.$connect();
});

afterAll(async () => {
  // Clean up and disconnect
  await prisma.$disconnect();
});

beforeEach(async () => {
  // Clean up database before each test
  await cleanDatabase();
});

async function cleanDatabase() {
  const tablenames = await prisma.$queryRaw<
    Array<{ tablename: string }>
  >`SELECT tablename FROM pg_tables WHERE schemaname='public'`;

  const tables = tablenames
    .map(({ tablename }: { tablename: string }) => tablename)
    .filter((name: string) => name !== '_prisma_migrations')
    .map((name: string) => `"public"."${name}"`)
    .join(', ');

  try {
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables} CASCADE;`);
  } catch (error) {
    console.log({ error });
  }
}

async function deleteSupabaseUserByEmail(email: string) {
  const { data, error } = await supabaseAdmin.auth.admin.listUsers();
  if (error) return;
  const user = data.users.find((u: any) => u.email === email);
  if (user) {
    await supabaseAdmin.auth.admin.deleteUser(user.id);
  }
}

// Global test utilities
global.testUtils = {
  cleanDatabase,
  deleteSupabaseUserByEmail,
};

declare global {
  var testUtils: {
    cleanDatabase: () => Promise<void>;
    deleteSupabaseUserByEmail: (email: string) => Promise<void>;
  };
}