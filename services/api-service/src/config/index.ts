/**
 * API Service Configuration
 */
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * 服务配置接口
 */
interface ServiceConfig {
  url: string;
  apiKey?: string;
}

/**
 * Redis配置接口
 */
interface RedisConfig {
  url: string;
  enabled: boolean;
}

/**
 * API Service Configuration
 */
export interface ApiServiceConfig {
  port: number;
  env: string;
  corsOrigins: string[];
  apiKeys: string[];
  services: {
    signal: ServiceConfig;
    data: ServiceConfig;
    scoring: ServiceConfig;
    agent: ServiceConfig;
    timeout: number;
  };
  cache: {
    redis: RedisConfig;
    defaultTtl: number;
  };
  logging: {
    level: string;
    enableConsole: boolean;
    enableFile: boolean;
    filePath?: string;
  };
}

/**
 * Default configuration values
 */
const defaultConfig: ApiServiceConfig = {
  port: 3000,
  env: 'development',
  corsOrigins: ['http://localhost:3000'],
  apiKeys: ['test-api-key'],
  services: {
    signal: {
      url: 'http://localhost:3001',
      apiKey: 'signal-service-key'
    },
    data: {
      url: 'http://localhost:3002',
      apiKey: 'data-service-key'
    },
    scoring: {
      url: 'http://localhost:3003',
      apiKey: 'scoring-service-key'
    },
    agent: {
      url: 'http://localhost:3004',
      apiKey: 'agent-service-key'
    },
    timeout: 10000
  },
  cache: {
    redis: {
      url: 'redis://localhost:6379',
      enabled: false
    },
    defaultTtl: 300 // 默认缓存5分钟
  },
  logging: {
    level: 'info',
    enableConsole: true,
    enableFile: false
  }
};

/**
 * Environment-specific configuration
 */
export const config: ApiServiceConfig = {
  port: parseInt(process.env.PORT || '3000', 10),
  env: process.env.NODE_ENV || defaultConfig.env,
  corsOrigins: process.env.CORS_ORIGINS ? process.env.CORS_ORIGINS.split(',') : defaultConfig.corsOrigins,
  apiKeys: process.env.API_KEYS ? process.env.API_KEYS.split(',') : defaultConfig.apiKeys,
  services: {
    signal: {
      url: process.env.SIGNAL_SERVICE_URL || defaultConfig.services.signal.url,
      apiKey: process.env.SIGNAL_SERVICE_API_KEY || defaultConfig.services.signal.apiKey
    },
    data: {
      url: process.env.DATA_SERVICE_URL || defaultConfig.services.data.url,
      apiKey: process.env.DATA_SERVICE_API_KEY || defaultConfig.services.data.apiKey
    },
    scoring: {
      url: process.env.SCORING_SERVICE_URL || defaultConfig.services.scoring.url,
      apiKey: process.env.SCORING_SERVICE_API_KEY || defaultConfig.services.scoring.apiKey
    },
    agent: {
      url: process.env.AGENT_SERVICE_URL || defaultConfig.services.agent.url,
      apiKey: process.env.AGENT_SERVICE_API_KEY || defaultConfig.services.agent.apiKey
    },
    timeout: parseInt(process.env.SERVICE_TIMEOUT || '10000', 10)
  },
  cache: {
    redis: {
      url: process.env.REDIS_URL || defaultConfig.cache.redis.url,
      enabled: process.env.REDIS_ENABLED ? process.env.REDIS_ENABLED === 'true' : defaultConfig.cache.redis.enabled
    },
    defaultTtl: parseInt(process.env.CACHE_DEFAULT_TTL || '300', 10)
  },
  logging: {
    level: process.env.LOG_LEVEL || defaultConfig.logging.level,
    enableConsole: process.env.LOG_ENABLE_CONSOLE ? process.env.LOG_ENABLE_CONSOLE === 'true' : defaultConfig.logging.enableConsole,
    enableFile: process.env.LOG_ENABLE_FILE ? process.env.LOG_ENABLE_FILE === 'true' : defaultConfig.logging.enableFile,
    filePath: process.env.LOG_FILE_PATH || defaultConfig.logging.filePath
  }
}; 