import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { appConfig } from './config';
import gcodeRoutes from './routes/gcode.routes';
import healthRoutes from './routes/health.routes';
import swaggerRoutes from './routes/swagger.routes';
import authRoutes from './routes/auth.routes';
import projectsRoutes from './routes/projects.routes';
import presetsRoutes from './routes/presets.routes';
import preferencesRoutes from './routes/preferences.routes';
import { apiLimiter } from './middleware/rate-limit';
import { sanitizeMiddleware } from './middleware/sanitize';
import { errorHandler } from './middleware/error-handler';
import { requestIdMiddleware } from './middleware/request-id';
import { logger } from './utils/logger';

logger.info('=== SERVIDOR INICIANDO ===', {
  nodeEnv: appConfig.nodeEnv,
  isVercel: !!process.env.VERCEL,
  allowedOrigins: appConfig.allowedOrigins,
});

const app = express();
const PORT = appConfig.port;

// Cabeçalhos de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"], // Swagger UI precisa de inline styles e CDN
      scriptSrc: ["'self'", "'unsafe-inline'", "https://unpkg.com"], // Swagger UI precisa de inline scripts e CDN
      imgSrc: ["'self'", "data:", "https:"], // Swagger UI usa data URIs e logos externos
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// Compressão de respostas
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 1024,
}));

// Rastreamento de requisições
app.use(requestIdMiddleware);

// Configuração CORS
app.use(cors({
  origin: (origin, callback) => {
    logger.info('CORS: Requisição recebida', { origin, hasOrigin: !!origin });

    if (!origin) {
      logger.info('CORS: Permitindo requisição sem origin');
      return callback(null, true);
    }

    // Check for exact match or wildcard pattern match
    const isAllowed = appConfig.allowedOrigins.some(allowedOrigin => {
      // Exact match
      if (allowedOrigin === origin) {
        logger.info('CORS: Match exato', { origin, allowedOrigin });
        return true;
      }

      // Wildcard pattern match (e.g., https://*.vercel.app)
      if (allowedOrigin.includes('*')) {
        const pattern = allowedOrigin
          .replace(/\./g, '\\.')  // Escape dots
          .replace(/\*/g, '.*');   // Convert * to .*
        const regex = new RegExp(`^${pattern}$`);
        const matches = regex.test(origin);
        if (matches) {
          logger.info('CORS: Match com wildcard', { origin, allowedOrigin, pattern });
        }
        return matches;
      }

      return false;
    });

    if (isAllowed) {
      logger.info('CORS: Origem permitida', { origin });
      callback(null, true);
    } else {
      logger.warn('CORS: Origem bloqueada', { origin, allowedOrigins: appConfig.allowedOrigins });
      callback(null, false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
// Handle OPTIONS requests explicitly for CORS preflight BEFORE other middlewares
app.options('*', (req, res) => {
  const origin = req.headers.origin;
  logger.info('OPTIONS: Preflight recebido', {
    origin,
    path: req.path,
    method: req.method,
  });

  // Check if origin is allowed
  const isAllowed = !origin || appConfig.allowedOrigins.some(allowedOrigin => {
    if (allowedOrigin === origin) return true;

    if (allowedOrigin.includes('*')) {
      const pattern = allowedOrigin
        .replace(/\./g, '\\.')
        .replace(/\*/g, '.*');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(origin);
    }

    return false;
  });

  if (isAllowed && origin) {
    logger.info('OPTIONS: Headers CORS adicionados', { origin });
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET,POST,PATCH,PUT,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    res.header('Access-Control-Max-Age', '86400');
  } else {
    logger.warn('OPTIONS: Origem não permitida', { origin });
  }

  res.status(200).end();
});

app.use(express.json({ limit: '2mb' }));
app.use(sanitizeMiddleware);

// Limitador de taxa
app.use('/api', apiLimiter);

// Rotas
logger.info('Registrando rotas...');
app.use(swaggerRoutes);
app.use(healthRoutes);
app.use('/api', authRoutes);
app.use('/api', projectsRoutes);
app.use('/api', presetsRoutes);
app.use('/api', preferencesRoutes);
app.use('/api', gcodeRoutes);
app.use(errorHandler);
logger.info('Rotas registradas com sucesso');

// Export app for Vercel serverless
logger.info('Exportando app', { isVercel: !!process.env.VERCEL, nodeEnv: appConfig.nodeEnv });
export default app;

// Only listen if not in test or serverless environment
if (appConfig.nodeEnv !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    logger.info('API iniciada com sucesso', { port: PORT, env: appConfig.nodeEnv });
  });
} else {
  logger.info('Modo serverless - não executando listen', {
    isTest: appConfig.nodeEnv === 'test',
    isVercel: !!process.env.VERCEL
  });
}
