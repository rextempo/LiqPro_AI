/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'DEBUG',
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR'
}

/**
 * 日志记录器接口
 */
export interface ILogger {
  debug(message: string, ...args: any[]): void;
  info(message: string, ...args: any[]): void;
  warn(message: string, ...args: any[]): void;
  error(message: string, ...args: any[]): void;
  setLevel(level: LogLevel): void;
}

/**
 * 控制台日志记录器实现
 */
export class ConsoleLogger implements ILogger {
  private level: LogLevel;

  constructor(level: LogLevel = LogLevel.INFO) {
    this.level = level;
  }

  /**
   * 设置日志级别
   */
  public setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * 记录调试日志
   */
  public debug(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(`[DEBUG] ${this.getTimestamp()} - ${message}`, ...args);
    }
  }

  /**
   * 记录信息日志
   */
  public info(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(`[INFO] ${this.getTimestamp()} - ${message}`, ...args);
    }
  }

  /**
   * 记录警告日志
   */
  public warn(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(`[WARN] ${this.getTimestamp()} - ${message}`, ...args);
    }
  }

  /**
   * 记录错误日志
   */
  public error(message: string, ...args: any[]): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(`[ERROR] ${this.getTimestamp()} - ${message}`, ...args);
    }
  }

  /**
   * 判断是否应该记录指定级别的日志
   */
  private shouldLog(level: LogLevel): boolean {
    const levels = [LogLevel.DEBUG, LogLevel.INFO, LogLevel.WARN, LogLevel.ERROR];
    const currentLevelIndex = levels.indexOf(this.level);
    const targetLevelIndex = levels.indexOf(level);
    
    return targetLevelIndex >= currentLevelIndex;
  }

  /**
   * 获取当前时间戳
   */
  private getTimestamp(): string {
    return new Date().toISOString();
  }
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