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
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length ? JSON.stringify(meta) : '';
          return `${timestamp} [${level}]: ${message} ${metaStr}`;
        })
      ),
    }),
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

export const stream = {
  write: (message: string) => {
    logger.info(message.trim());
  },
};

export function createRequestLogger(requestId: string) {
  return logger.child({ requestId });
}
