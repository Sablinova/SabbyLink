/**
 * Structured Logger using Winston
 */

import winston from 'winston';
import { env } from '@/config/env';

const { combine, timestamp, printf, colorize, errors } = winston.format;

// Custom log format
const logFormat = printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

// Create logger instance
export const logger = winston.createLogger({
  level: env.LOG_LEVEL,
  format: combine(
    errors({ stack: true }),
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    logFormat
  ),
  transports: [
    // Console output
    new winston.transports.Console({
      format: combine(
        colorize(),
        logFormat
      ),
    }),
    // Error log file
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
    // Combined log file
    new winston.transports.File({
      filename: 'logs/combined.log',
      maxsize: 10485760, // 10MB
      maxFiles: 5,
    }),
  ],
});

// Helper methods
export const log = {
  info: (message: string, ...args: any[]) => logger.info(message, ...args),
  warn: (message: string, ...args: any[]) => logger.warn(message, ...args),
  error: (message: string, error?: any) => {
    if (error) {
      logger.error(message, { error });
    } else {
      logger.error(message);
    }
  },
  debug: (message: string, ...args: any[]) => logger.debug(message, ...args),
  success: (message: string, ...args: any[]) => logger.info(`✅ ${message}`, ...args),
};
