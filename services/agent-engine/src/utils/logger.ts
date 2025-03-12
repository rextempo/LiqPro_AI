import { Request, Response, NextFunction } from 'express';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  ERROR = 'error',
  WARN = 'warn',
  INFO = 'info',
  HTTP = 'http',
  DEBUG = 'debug'
}

/**
 * 日志记录器接口
 */
export interface Logger {
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  info(message: string, meta?: any): void;
  http(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

/**
 * 控制台日志记录器实现
 */
export function createLogger(context: string): Logger {
  return {
    error: (message: string, meta?: any) => console.error(`[ERROR] [${context}] ${message}`, meta || ''),
    warn: (message: string, meta?: any) => console.warn(`[WARN] [${context}] ${message}`, meta || ''),
    info: (message: string, meta?: any) => console.info(`[INFO] [${context}] ${message}`, meta || ''),
    http: (message: string, meta?: any) => console.log(`[HTTP] [${context}] ${message}`, meta || ''),
    debug: (message: string, meta?: any) => console.debug(`[DEBUG] [${context}] ${message}`, meta || '')
  };
}

/**
 * 结构化日志记录器
 */
export interface LoggerOptions {
  module: string;
}

export class Logger {
  private module: string;
  private static defaultLogger = console;

  constructor(options: LoggerOptions) {
    this.module = options.module;
  }

  /**
   * Create a child logger with a specific module name
   */
  public child(options: { module: string }): Logger {
    return new Logger({ module: `${this.module}:${options.module}` });
  }

  /**
   * Log an info message
   */
  public info(message: string | object, context?: string): void {
    this.log('INFO', message, context);
  }

  /**
   * Log a warning message
   */
  public warn(message: string | object, context?: string): void {
    this.log('WARN', message, context);
  }

  /**
   * Log an error message
   */
  public error(message: string | object, context?: string | Error): void {
    this.log('ERROR', message, context);
  }

  /**
   * Log a debug message
   */
  public debug(message: string | object, context?: string): void {
    this.log('DEBUG', message, context);
  }

  /**
   * Internal log method
   */
  private log(level: string, message: string | object, context?: string | Error): void {
    const timestamp = new Date().toISOString();
    const formattedMessage = typeof message === 'string' ? message : JSON.stringify(message);
    
    let contextStr = '';
    if (context) {
      if (typeof context === 'string') {
        contextStr = context;
      } else if (context instanceof Error) {
        contextStr = context.message;
      }
    }

    const logMessage = `[${timestamp}] ${level} [${this.module}]: ${formattedMessage}${contextStr ? ` - ${contextStr}` : ''}`;
    Logger.defaultLogger.log(logMessage);
  }
}

// Express middleware for logging HTTP requests
export function expressLogger() {
  return (req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      console.log(
        `[HTTP] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`,
        {
          method: req.method,
          url: req.originalUrl,
          statusCode: res.statusCode,
          duration,
          ip: req.ip,
          userAgent: req.get('user-agent'),
        },
      );
    });
    
    next();
  };
} 