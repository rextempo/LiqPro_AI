import winston from 'winston';

export interface LoggerConfig {
  level?: string;
  serviceName: string;
  console?: boolean;
  file?: {
    enabled: boolean;
    filename: string;
  };
}

/**
 * Creates a configured winston logger instance
 * @param config Logger configuration options
 * @returns Winston logger instance
 */
export function createLogger(config: LoggerConfig) {
  const { level = 'info', serviceName, console = true, file } = config;
  
  const formats = [
    winston.format.timestamp(),
    winston.format.json(),
    winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp', 'service'] }),
    winston.format.printf(info => {
      return `${info.timestamp} [${info.service}] ${info.level}: ${info.message}`;
    })
  ];

  const transports: winston.transport[] = [];
  
  if (console) {
    transports.push(new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        ...formats
      )
    }));
  }
  
  if (file?.enabled) {
    transports.push(new winston.transports.File({
      filename: file.filename,
      format: winston.format.combine(...formats)
    }));
  }
  
  return winston.createLogger({
    level,
    defaultMeta: { service: serviceName },
    transports
  });
} 