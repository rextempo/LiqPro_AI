/**
 * 应用配置
 */
export interface AppConfig {
  port: number;
  env: string;
}

/**
 * 日志配置
 */
export interface LoggerConfig {
  level: string;
  format: string;
  transports: string[];
  filename?: string;
}

/**
 * 数据库配置
 */
export interface DatabaseConfig {
  host: string;
  port: number;
  name: string;
  user: string;
  password: string;
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
}

/**
 * Solana配置
 */
export interface SolanaConfig {
  network: string;
  rpcEndpoint: string;
  wsEndpoint: string;
  timeout: number;
  backupRpcEndpoint?: string;
}

/**
 * Jupiter配置
 */
export interface JupiterConfig {
  apiUrl: string;
  timeout: number;
  slippageBps: number;
  maxAccounts: number;
  priorityFeeLamports: number;
  priorityLevel: string;
  dynamicSlippageMaxBps: number;
}

/**
 * Meteora配置
 */
export interface MeteoraConfig {
  baseUrl: string;
  apiKey?: string;
}

/**
 * 缓存配置
 */
export interface CacheConfig {
  ttl: number;
  max?: number;
  redis?: {
    host: string;
    port: number;
    password: string;
  };
}

/**
 * 安全配置
 */
export interface SecurityConfig {
  cors: {
    origin: string;
  };
  rateLimit: {
    max: number;
  };
}

/**
 * 监控配置
 */
export interface MonitoringConfig {
  enabled: boolean;
  sampleRate: number;
  metrics?: {
    enabled: boolean;
    path: string;
  };
  tracing?: {
    enabled: boolean;
    jaeger?: {
      agent: {
        host: string;
        port: number;
      };
    };
  };
}

/**
 * 性能优化配置
 */
export interface OptimizationConfig {
  compression: boolean;
  minification: boolean;
  cacheControl: boolean;
  etag: boolean;
}

/**
 * 开发工具配置
 */
export interface DevToolsConfig {
  reactDevTools: boolean;
  reduxDevTools: boolean;
  mockApi: boolean;
  hotReload: boolean;
}

/**
 * 完整配置接口
 */
export interface Config {
  app: AppConfig;
  logger: LoggerConfig;
  database: DatabaseConfig;
  solana: SolanaConfig;
  jupiter: JupiterConfig;
  meteora: MeteoraConfig;
  cache: CacheConfig;
  security: SecurityConfig;
  monitoring: MonitoringConfig;
  optimization?: OptimizationConfig;
  devTools?: DevToolsConfig;
} 