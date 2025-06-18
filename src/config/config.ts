import dotenv from 'dotenv';
import { z } from 'zod';

// Load environment variables
dotenv.config();

// Define configuration schema
const envSchema = z.object({
  // Server
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000'),
  
  // Database
  DATABASE_URL: z.string(),
  DIRECT_URL: z.string(),
  
  // JWT
  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  
  // OpenAI
  OPENAI_API_KEY: z.string(),
  
  // Rate Limiting
  RATE_LIMIT_WINDOW_MS: z.string().default('900000'), // 15 minutes
  RATE_LIMIT_MAX: z.string().default('100'),
  
  // CORS
  CORS_ORIGIN: z.string().default('*'),
  
  // Logging
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'http', 'debug']).default('info'),
});

// Parse and validate configuration
const parsedEnv = envSchema.parse(process.env);

export const config = {
  NODE_ENV: parsedEnv.NODE_ENV,
  PORT: parseInt(parsedEnv.PORT, 10),
  DATABASE_URL: parsedEnv.DATABASE_URL,
  DIRECT_URL: parsedEnv.DIRECT_URL,
  jwt: {
    secret: parsedEnv.JWT_SECRET,
    expiresIn: parsedEnv.JWT_EXPIRES_IN
  },
  CORS_ORIGIN: parsedEnv.CORS_ORIGIN,
  RATE_LIMIT_WINDOW_MS: parseInt(parsedEnv.RATE_LIMIT_WINDOW_MS, 10),
  RATE_LIMIT_MAX: parseInt(parsedEnv.RATE_LIMIT_MAX, 10),
} as const; 