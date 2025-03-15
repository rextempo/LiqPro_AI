import { Connection, ConnectionConfig } from '@solana/web3.js';
import config from '../../config';

// Solana连接配置
const connectionConfig: ConnectionConfig = {
  commitment: 'confirmed',
  confirmTransactionInitialTimeout: 60000,
  wsEndpoint: config.solana.wsEndpoint,
  httpHeaders: {
    'Cache-Control': 'no-cache',
  },
};

// 创建Solana连接实例
export const connection = new Connection(
  config.solana.rpcEndpoint,
  connectionConfig
);

// 创建备用连接实例
export const backupConnection = new Connection(
  config.solana.backupRpcEndpoint || '',
  connectionConfig
);

// 连接池配置
export const connectionPool = {
  maxConnections: 10,
  minConnections: 2,
  idleTimeout: 30000,
  acquireTimeout: 30000,
  createTimeout: 30000,
  destroyTimeout: 30000,
  reapInterval: 1000,
  createRetryInterval: 200,
};

// 重试配置
export const retryConfig = {
  maxRetries: 3,
  retryDelay: 1000,
  backoffFactor: 2,
  maxRetryDelay: 10000,
};

// 缓存配置
export const cacheConfig = {
  ttl: 30000, // 30秒
  maxSize: 1000, // 最大缓存条目数
  updateInterval: 5000, // 5秒更新一次
};

// 监控配置
export const monitoringConfig = {
  enabled: true,
  metricsInterval: 60000, // 1分钟
  alertThresholds: {
    latency: 1000, // 1秒
    errorRate: 0.01, // 1%
    connectionCount: 100, // 最大连接数
  },
}; 