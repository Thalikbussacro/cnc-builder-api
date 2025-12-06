import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

/**
 * Middleware que adiciona um Request ID único para cada requisição
 *
 * - Gera um UUID v4 para cada request
 * - Aceita request ID vindo do cliente via header X-Request-ID
 * - Adiciona ao objeto req.id para uso interno
 * - Retorna no header de resposta X-Request-ID
 *
 * Útil para:
 * - Rastrear requisições específicas nos logs
 * - Debug de problemas em produção
 * - Correlação entre múltiplos serviços
 */

// Estender tipo Request do Express
declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export function requestIdMiddleware(req: Request, res: Response, next: NextFunction) {
  // Aceita request ID do cliente (se enviado) ou gera um novo
  const requestId = (req.headers['x-request-id'] as string) || uuidv4();

  // Adiciona ao objeto request para uso interno
  req.id = requestId;

  // Retorna no header de resposta
  res.setHeader('X-Request-ID', requestId);

  next();
}
