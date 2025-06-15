import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required environment variables
if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL environment variable is required');
}

if (!SUPABASE_KEY) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY environment variable is required');
}

// Validate URL format
try {
  new URL(SUPABASE_URL);
} catch (error) {
  throw new Error(`Invalid SUPABASE_URL format: ${SUPABASE_URL}. URL must include protocol (https://)`);
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});