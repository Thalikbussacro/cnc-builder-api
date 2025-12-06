import winston from 'winston';
import { appConfig } from '../config';

export const logger = winston.createLogger({
  level: appConfig.logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'cnc-builder-api' },
  transports: [
    // Console (sempre ativo)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),

    // Arquivo de erros (apenas produção)
    ...(appConfig.isProduction
      ? [
          new winston.transports.File({
            filename: 'logs/error.log',
            level: 'error',
          }),
          new winston.transports.File({
            filename: 'logs/combined.log',
          }),
        ]
      : []),
  ],
});

// Stream para integração com Express/Morgan
export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

/**
 * Cria um logger "filho" com request ID incluído nos metadados
 * Útil para rastrear todos os logs relacionados a um request específico
 *
 * @example
 * const reqLogger = createRequestLogger(req.id);
 * reqLogger.info('Processando validação');
 * // Output: { requestId: 'abc-123', message: 'Processando validação' }
 */
export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
