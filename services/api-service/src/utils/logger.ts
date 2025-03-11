/**
 * 日志工具类
 */
import { config } from '../config';
import * as fs from 'fs';
import * as path from 'path';

/**
 * 日志级别枚举
 */
export enum LogLevel {
  DEBUG = 'debug',
  INFO = 'info',
  WARN = 'warn',
  ERROR = 'error',
  FATAL = 'fatal'
}

/**
 * 日志级别优先级
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  [LogLevel.DEBUG]: 0,
  [LogLevel.INFO]: 1,
  [LogLevel.WARN]: 2,
  [LogLevel.ERROR]: 3,
  [LogLevel.FATAL]: 4
};

/**
 * 日志颜色
 */
const LOG_COLORS: Record<LogLevel, string> = {
  [LogLevel.DEBUG]: '\x1b[36m', // 青色
  [LogLevel.INFO]: '\x1b[32m',  // 绿色
  [LogLevel.WARN]: '\x1b[33m',  // 黄色
  [LogLevel.ERROR]: '\x1b[31m', // 红色
  [LogLevel.FATAL]: '\x1b[35m'  // 紫色
};

/**
 * 重置颜色
 */
const RESET_COLOR = '\x1b[0m';

/**
 * 日志记录器类
 */
export class Logger {
  private context: string;
  private minLevel: LogLevel;
  private enableConsole: boolean;
  private enableFile: boolean;
  private logFilePath?: string;
  private logFileStream?: fs.WriteStream;

  /**
   * 构造函数
   * @param context 日志上下文
   */
  constructor(context: string) {
    this.context = context;
    this.minLevel = (config.logging.level as LogLevel) || LogLevel.INFO;
    this.enableConsole = config.logging.enableConsole;
    this.enableFile = config.logging.enableFile;
    this.logFilePath = config.logging.filePath;

    // 如果启用文件日志，初始化文件流
    if (this.enableFile && this.logFilePath) {
      const logDir = path.dirname(this.logFilePath);
      
      // 确保日志目录存在
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
      
      this.logFileStream = fs.createWriteStream(this.logFilePath, { flags: 'a' });
    }
  }

  /**
   * 记录调试日志
   * @param message 日志消息
   * @param meta 元数据
   */
  public debug(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.DEBUG, message, meta);
  }

  /**
   * 记录信息日志
   * @param message 日志消息
   * @param meta 元数据
   */
  public info(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.INFO, message, meta);
  }

  /**
   * 记录警告日志
   * @param message 日志消息
   * @param meta 元数据
   */
  public warn(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.WARN, message, meta);
  }

  /**
   * 记录错误日志
   * @param message 日志消息
   * @param meta 元数据
   */
  public error(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.ERROR, message, meta);
  }

  /**
   * 记录致命错误日志
   * @param message 日志消息
   * @param meta 元数据
   */
  public fatal(message: string, meta?: Record<string, unknown>): void {
    this.log(LogLevel.FATAL, message, meta);
  }

  /**
   * 记录日志
   * @param level 日志级别
   * @param message 日志消息
   * @param meta 元数据
   */
  private log(level: LogLevel, message: string, meta?: Record<string, unknown>): void {
    // 检查日志级别
    if (LOG_LEVEL_PRIORITY[level] < LOG_LEVEL_PRIORITY[this.minLevel]) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logEntry = {
      timestamp,
      level,
      context: this.context,
      message,
      ...(meta || {})
    };

    // 控制台输出
    if (this.enableConsole) {
      const color = LOG_COLORS[level];
      const levelPadded = level.toUpperCase().padEnd(5);
      const contextFormatted = `[${this.context}]`.padEnd(15);
      
      console.log(
        `${timestamp} ${color}${levelPadded}${RESET_COLOR} ${contextFormatted} ${message}`,
        meta ? meta : ''
      );
    }

    // 文件输出
    if (this.enableFile && this.logFileStream) {
      this.logFileStream.write(`${JSON.stringify(logEntry)}\n`);
    }
  }

  /**
   * 关闭日志记录器
   */
  public close(): void {
    if (this.logFileStream) {
      this.logFileStream.end();
    }
  }
} 