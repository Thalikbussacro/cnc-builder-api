import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { appConfig } from '../config';
import type { AuthTokenPayload } from '../types/auth.types';

// Estende o tipo Request do Express para incluir user
declare global {
  namespace Express {
    interface Request {
      user?: AuthTokenPayload;
    }
  }
}

/**
 * Middleware para verificar autenticação via JWT
 */
export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    // Extrai token do header Authorization
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Unauthorized: No token provided' });
      return;
    }

    const token = authHeader.replace('Bearer ', '');

    // Verifica e decodifica o token
    const decoded = jwt.verify(token, appConfig.jwtSecret) as AuthTokenPayload;

    // Anexa dados do usuário à request
    req.user = decoded;

    next();
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Unauthorized: Token expired' });
      return;
    }

    if (error instanceof jwt.JsonWebTokenError) {
      res.status(401).json({ error: 'Unauthorized: Invalid token' });
      return;
    }

    res.status(401).json({ error: 'Unauthorized' });
  }
};

/**
 * Middleware opcional de autenticação
 * Tenta autenticar, mas não bloqueia se não houver token
 */
export const optionalAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      next();
      return;
    }

    const token = authHeader.replace('Bearer ', '');
    const decoded = jwt.verify(token, appConfig.jwtSecret) as AuthTokenPayload;

    req.user = decoded;
    next();
  } catch (error) {
    // Ignora erro e continua sem autenticação
    next();
  }
};
