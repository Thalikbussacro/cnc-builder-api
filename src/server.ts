import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import swaggerUi from 'swagger-ui-express';
import { appConfig } from './config';
import { swaggerSpec } from './config/swagger';
import gcodeRoutes from './routes/gcode.routes';
import healthRoutes from './routes/health.routes';
import { apiLimiter } from './middleware/rate-limit';
import { sanitizeMiddleware } from './middleware/sanitize';
import { errorHandler } from './middleware/error-handler';
import { requestIdMiddleware } from './middleware/request-id';
import { logger } from './utils/logger';

const app = express();
const PORT = appConfig.port;

// Cabeçalhos de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // Swagger UI precisa de inline styles
      scriptSrc: ["'self'", "'unsafe-inline'"], // Swagger UI precisa de inline scripts
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
    if (!origin) return callback(null, true);

    if (appConfig.allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS: Origem bloqueada', { origin });
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json({ limit: '2mb' }));
app.use(sanitizeMiddleware);

// Limitador de taxa
app.use('/api', apiLimiter);

// Documentação Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'CNC Builder API Docs',
}));

app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

app.use(healthRoutes);
app.use('/api', gcodeRoutes);
app.use(errorHandler);

export default app;

if (appConfig.nodeEnv !== 'test') {
  app.listen(PORT, () => {
    logger.info('API iniciada', { port: PORT, env: appConfig.nodeEnv });
  });
}
