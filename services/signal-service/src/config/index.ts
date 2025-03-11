import dotenv from 'dotenv';

dotenv.config();

/**
 * 信号服务配置类型
 */
export interface SignalServiceConfig {
  port: number;
  host: string;
  dataServiceUrl: string;
  aiServiceUrl: string;
  logLevel: string;
  environment: string;
  signalGenerationInterval: number;
  maxSignalsPerPool: number;
  signalExpirationTime: number;
  cacheEnabled: boolean;
  cacheTTL: number;
  retryAttempts: number;
  retryDelay: number;
  timeoutMs: number;
}

/**
 * 默认配置
 */
const defaultConfig: SignalServiceConfig = {
  port: 3000,
  host: 'localhost',
  dataServiceUrl: 'http://localhost:3001',
  aiServiceUrl: 'http://localhost:3002',
  logLevel: 'info',
  environment: 'development',
  signalGenerationInterval: 5 * 60 * 1000, // 5分钟
  maxSignalsPerPool: 10,
  signalExpirationTime: 24 * 60 * 60 * 1000, // 24小时
  cacheEnabled: true,
  cacheTTL: 5 * 60 * 1000, // 5分钟
  retryAttempts: 3,
  retryDelay: 1000,
  timeoutMs: 30000,
};

/**
 * 环境变量配置
 */
export const config: SignalServiceConfig = {
  port: parseInt(process.env.PORT || defaultConfig.port.toString(), 10),
  host: process.env.HOST || defaultConfig.host,
  dataServiceUrl: process.env.DATA_SERVICE_URL || defaultConfig.dataServiceUrl,
  aiServiceUrl: process.env.AI_SERVICE_URL || defaultConfig.aiServiceUrl,
  logLevel: process.env.LOG_LEVEL || defaultConfig.logLevel,
  environment: process.env.NODE_ENV || defaultConfig.environment,
  signalGenerationInterval: parseInt(
    process.env.SIGNAL_GENERATION_INTERVAL || 
    defaultConfig.signalGenerationInterval.toString(),
    10
  ),
  maxSignalsPerPool: parseInt(
    process.env.MAX_SIGNALS_PER_POOL || 
    defaultConfig.maxSignalsPerPool.toString(),
    10
  ),
  signalExpirationTime: parseInt(
    process.env.SIGNAL_EXPIRATION_TIME || 
    defaultConfig.signalExpirationTime.toString(),
    10
  ),
  cacheEnabled: process.env.CACHE_ENABLED === 'true' || defaultConfig.cacheEnabled,
  cacheTTL: parseInt(
    process.env.CACHE_TTL || 
    defaultConfig.cacheTTL.toString(),
    10
  ),
  retryAttempts: parseInt(
    process.env.RETRY_ATTEMPTS || 
    defaultConfig.retryAttempts.toString(),
    10
  ),
  retryDelay: parseInt(
    process.env.RETRY_DELAY || 
    defaultConfig.retryDelay.toString(),
    10
  ),
  timeoutMs: parseInt(
    process.env.TIMEOUT_MS || 
    defaultConfig.timeoutMs.toString(),
    10
  ),
}; 