import type { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

/**
 * Classe de erro customizada
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    // Mantém stack trace correto
    Object.setPrototypeOf(this, AppError.prototype);
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Middleware de tratamento de erros global
 */
export function errorHandler(
  err: Error | AppError,
  req: Request,
  res: Response,
  _next: NextFunction
) {
  // Erro operacional (esperado)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      requestId: req.headers['x-request-id'],
      timestamp: new Date().toISOString(),
    });
  }

  // Erro não esperado
  logger.error('❌ ERRO NÃO TRATADO', {
    error: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  return res.status(500).json({
    error: 'Erro interno do servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    requestId: req.headers['x-request-id'],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Erros comuns pré-definidos
 */
export class BadRequestError extends AppError {
  constructor(message: string) {
    super(400, message);
  }
}

export class NotFoundError extends AppError {
  constructor(message: string) {
    super(404, message);
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(422, message);
  }
}
