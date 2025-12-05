import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import gcodeRoutes from './routes/gcode.routes';
import { apiLimiter } from './middleware/rate-limit';
import { sanitizeMiddleware } from './middleware/sanitize';
import { errorHandler } from './middleware/error-handler';
import { logger } from './utils/logger';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // API não precisa CSP
  crossOriginEmbedderPolicy: false, // Permitir embeds
}));

// Compressão de respostas
app.use(compression({
  filter: (req, res) => {
    // Não comprimir se cliente enviou header x-no-compression
    if (req.headers['x-no-compression']) {
      return false;
    }
    // Comprimir apenas responses maiores que 1KB
    return compression.filter(req, res);
  },
  level: 6, // Nível de compressão (1-9, 6 é padrão equilibrado)
  threshold: 1024, // Só comprime se > 1KB
}));

// CORS Configuration
const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || [
  'http://localhost:3000',
  'https://cnc-builder-web.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    // Permite requests sem origin (Postman, curl, etc)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      logger.warn('CORS: Origem bloqueada', { origin });
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas de cache para preflight
}));
app.use(express.json({ limit: '2mb' })); // Limite de tamanho de payload
app.use(sanitizeMiddleware); // Sanitiza inputs

// Rate limiting
app.use('/api', apiLimiter);

// Rotas
app.use('/api', gcodeRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler global (sempre por último)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info('🚀 API rodando', { port: PORT, env: process.env.NODE_ENV || 'development' });
});
