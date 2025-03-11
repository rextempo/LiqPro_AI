/**
 * 信号服务配置
 */
export interface SignalServiceConfig {
  port: number;
  host: string;
  logLevel: string;
  dataServiceUrl: string;
  meteoraServiceUrl: string;
  jupiterServiceUrl: string;
  cacheEnabled: boolean;
  cacheExpiry: number;
  redisUrl?: string;
  redisOptions?: {
    maxRetries: number;
    connectTimeout: number;
  };
  maxRetries: number;
  timeout: number;
  rateLimit: {
    windowMs: number;
    maxRequests: number;
  };
  auth: {
    enabled: boolean;
    jwtSecret: string;
    expiresIn: string;
  };
  cors: {
    origin: string | string[];
    credentials: boolean;
  };
  monitoring: {
    enabled: boolean;
    interval: number;
  };
  alerts: {
    enabled: boolean;
    channels: string[];
  };
  apiKeys: string[];
  signalGenerationInterval: number;
  strategyUpdateInterval: number;
} 