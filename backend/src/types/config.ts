export interface AppConfig {
  port: string | number;
  env: string;
  name?: string;
  version?: string;
}

export interface LoggerConfig {
  level: string;
  format: string;
  transports: string[];
  filename?: string;
}

export interface DatabaseConfig {
  host: string | undefined;
  port: string | number | undefined;
  name: string | undefined;
  user: string | undefined;
  password: string | undefined;
  pool?: {
    min: number;
    max: number;
    idleTimeoutMillis: number;
  };
}

export interface SolanaConfig {
  network: string;
  rpcEndpoint: string;
  wsEndpoint: string;
  timeout: number;
  backupRpcEndpoint?: string;
}

export interface JupiterConfig {
  apiUrl: string;
  timeout: string | number;
  slippageBps: string | number;
  maxAccounts: string | number;
  dynamicComputeUnitLimit: boolean;
  wrapAndUnwrapSol: boolean;
  prioritizationFeeLamports: {
    priorityLevelWithMaxLamports: {
      maxLamports: string | number;
      priorityLevel: string;
    };
  };
  dynamicSlippage: {
    maxBps: string | number;
  };
}

export interface MeteoraConfig {
  baseUrl: string;
  apiKey?: string;
}

export interface CacheConfig {
  ttl: number;
  max?: number;
  enabled?: boolean;
  redis?: {
    host: string | undefined;
    port: string | number | undefined;
    password: string | undefined;
  };
}

export interface SecurityConfig {
  cors: {
    enabled?: boolean;
    origin: string | undefined;
    methods?: string[];
    allowedHeaders?: string[];
    credentials?: boolean;
  };
  rateLimit: {
    enabled?: boolean;
    max: string | number;
    windowMs?: number;
  };
}

export interface MonitoringConfig {
  enabled: boolean;
  sampleRate?: number;
  metrics?: {
    enabled: boolean;
    path: string;
  };
  tracing?: {
    enabled: boolean;
    sampleRate?: number;
    jaeger?: {
      agent: {
        host: string | undefined;
        port: string | number | undefined;
      };
    };
  };
}

export interface OptimizationConfig {
  compression: boolean;
  minification: boolean;
  cacheControl: boolean;
  etag: boolean;
}

export interface DevToolsConfig {
  reactDevTools: boolean;
  reduxDevTools: boolean;
  mockApi: boolean;
  hotReload: boolean;
}

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