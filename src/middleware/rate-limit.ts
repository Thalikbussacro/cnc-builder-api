import rateLimit from 'express-rate-limit';

// Rate limiter geral para toda API
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 requests por IP
  message: 'Muitas requisições deste IP. Tente novamente em 15 minutos.',
  standardHeaders: true, // Retorna info nos headers `RateLimit-*`
  legacyHeaders: false, // Desabilita headers `X-RateLimit-*`
});

// Rate limiter específico para geração de G-code (mais restritivo)
export const gcodeGenerationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 10, // 10 gerações por minuto
  message: 'Limite de geração de G-code excedido. Aguarde 1 minuto.',
  skipSuccessfulRequests: false,
});

// Rate limiter para validação (intermediário)
export const validationLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuto
  max: 30, // 30 validações por minuto
  message: 'Limite de validação excedido. Aguarde 1 minuto.',
});
