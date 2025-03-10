import winston from 'winston';

const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

export const createLogger = (module: string) => {
  return {
    info: (message: string, meta?: any) => logger.info(`[${module}] ${message}`, meta),
    error: (message: string, meta?: any) => logger.error(`[${module}] ${message}`, meta),
    warn: (message: string, meta?: any) => logger.warn(`[${module}] ${message}`, meta),
    debug: (message: string, meta?: any) => logger.debug(`[${module}] ${message}`, meta)
  };
};

/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error'
}

/**
 * Logger interface
 */
export interface Logger {
  debug(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
}

/**
 * Create a child logger with additional context
 * @param parentLogger Parent logger
 * @param context Additional context
 * @returns Child logger
 */
export function createChildLogger(parentLogger: Logger, context: any): Logger {
  return {
    debug: (message: string, meta?: any) => {
      parentLogger.debug(message, { ...context, ...meta });
    },
    info: (message: string, meta?: any) => {
      parentLogger.info(message, { ...context, ...meta });
    },
    warn: (message: string, meta?: any) => {
      parentLogger.warn(message, { ...context, ...meta });
    },
    error: (message: string, meta?: any) => {
      parentLogger.error(message, { ...context, ...meta });
    }
  };
}

/**
 * Create a transaction logger
 * @param module Module name
 * @param transactionId Transaction ID
 * @returns Transaction logger
 */
export function createTransactionLogger(module: string, transactionId: string): Logger {
  const logger = createLogger(module);
  return createChildLogger(logger, { transactionId });
}

/**
 * Create a request logger
 * @param module Module name
 * @param req Express request object
 * @returns Request logger
 */
export function createRequestLogger(module: string, req: any): Logger {
  const logger = createLogger(module);
  return createChildLogger(logger, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    ip: req.ip
  });
}

/**
 * Log performance metrics
 * @param logger Logger instance
 * @param operation Operation name
 * @param startTime Start time
 * @param meta Additional metadata
 */
export function logPerformance(logger: Logger, operation: string, startTime: [number, number], meta?: any): void {
  const endTime = process.hrtime(startTime);
  const durationMs = (endTime[0] * 1000) + (endTime[1] / 1000000);
  
  logger.debug(`Performance: ${operation} took ${durationMs.toFixed(2)}ms`, {
    operation,
    durationMs,
    ...meta
  });
}

/**
 * Create a performance logger
 * @param logger Logger instance
 * @returns Performance logger
 */
export function createPerformanceLogger(logger: Logger): {
  start: (operation: string) => () => void;
} {
  return {
    start: (operation: string) => {
      const startTime = process.hrtime();
      return () => {
        logPerformance(logger, operation, startTime);
      };
    }
  };
} 