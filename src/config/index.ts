import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables from .env file only in local development
// Vercel injects env vars directly into process.env
if (!process.env.VERCEL) {
  dotenv.config();
}

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number).pipe(z.number().int().positive()),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),

  // JWT Authentication
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('30d'),

  // Supabase Database
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string(),

  // Email Service (Resend)
  RESEND_API_KEY: z.string(),
  FROM_EMAIL: z.string().email(),

  // Google OAuth (Optional)
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
});

function loadConfig() {
  try {
    const parsed = envSchema.parse(process.env);

    return {
      nodeEnv: parsed.NODE_ENV,
      port: parsed.PORT,
      logLevel: parsed.LOG_LEVEL,
      allowedOrigins: parsed.ALLOWED_ORIGINS.split(',').map(origin => origin.trim()),
      isProduction: parsed.NODE_ENV === 'production',
      isDevelopment: parsed.NODE_ENV === 'development',
      isTest: parsed.NODE_ENV === 'test',

      // Authentication
      jwtSecret: parsed.JWT_SECRET,
      jwtExpiresIn: parsed.JWT_EXPIRES_IN,

      // Database
      supabaseUrl: parsed.SUPABASE_URL,
      supabaseServiceRoleKey: parsed.SUPABASE_SERVICE_ROLE_KEY,

      // Email
      resendApiKey: parsed.RESEND_API_KEY,
      fromEmail: parsed.FROM_EMAIL,

      // Google OAuth
      googleClientId: parsed.GOOGLE_CLIENT_ID,
      googleClientSecret: parsed.GOOGLE_CLIENT_SECRET,
    };
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('Erro de configuração:');
      console.error(error.issues);
      process.exit(1);
    }
    throw error;
  }
}

export const appConfig = loadConfig();
