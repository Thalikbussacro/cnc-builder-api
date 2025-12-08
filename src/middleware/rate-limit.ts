import rateLimit from 'express-rate-limit';

export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10000,
  message: 'Muitas requisições deste IP. Tente novamente em 15 minutos.',
  standardHeaders: true,
  legacyHeaders: false,
});

export const gcodeGenerationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: 'Limite de geração de G-code excedido. Aguarde 1 minuto.',
  skipSuccessfulRequests: false,
});

export const validationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 1000,
  message: 'Limite de validação excedido. Aguarde 1 minuto.',
});
