import validator from 'validator';

/**
 * Sanitiza recursivamente objetos, arrays e strings
 * Remove caracteres perigosos de HTML/SQL/JS
 */
export function sanitizeInput(input: any): any {
  if (input === null || input === undefined) {
    return input;
  }

  if (typeof input === 'string') {
    // Remove tags HTML e caracteres perigosos
    return validator.escape(input.trim());
  }

  if (Array.isArray(input)) {
    return input.map(item => sanitizeInput(item));
  }

  if (typeof input === 'object') {
    const sanitized: any = {};
    for (const key in input) {
      if (Object.prototype.hasOwnProperty.call(input, key)) {
        sanitized[key] = sanitizeInput(input[key]);
      }
    }
    return sanitized;
  }

  // Números, booleans, etc passam direto
  return input;
}

/**
 * Middleware Express para sanitizar req.body
 */
export function sanitizeMiddleware(req: any, _res: any, next: any) {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeInput(req.body);
  }
  next();
}
