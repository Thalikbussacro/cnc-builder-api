import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import gcodeRoutes from './routes/gcode.routes';
import { apiLimiter } from './middleware/rate-limit';

const app = express();
const PORT = process.env.PORT || 3001;

// Security headers
app.use(helmet({
  contentSecurityPolicy: false, // API não precisa CSP
  crossOriginEmbedderPolicy: false, // Permitir embeds
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
      console.warn(`CORS: Origem bloqueada - ${origin}`);
      callback(new Error('Origem não permitida pelo CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400, // 24 horas de cache para preflight
}));
app.use(express.json({ limit: '10mb' })); // Permite requests grandes

// Rate limiting
app.use('/api', apiLimiter);

// Rotas
app.use('/api', gcodeRoutes);

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Tratamento global de erros
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Erro:', err);
  res.status(500).json({
    error: 'Erro interno do servidor',
    message: err.message,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 API rodando em http://localhost:${PORT}`);
});
