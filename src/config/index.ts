import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3001').transform(Number).pipe(z.number().int().positive()),
  LOG_LEVEL: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  ALLOWED_ORIGINS: z.string().default('http://localhost:3000'),
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
