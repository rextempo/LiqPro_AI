export const config = {
  rpc: {
    endpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
  },
  app: {
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
    host: process.env.HOST || 'localhost',
    name: process.env.APP_NAME || 'liqpro-data-service',
    version: process.env.APP_VERSION || '0.1.0',
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    console: process.env.LOG_CONSOLE === 'true',
    file: process.env.LOG_FILE === 'true',
    maxSize: process.env.LOG_MAX_SIZE || '10m',
    maxFiles: process.env.LOG_MAX_FILES || '7d',
  },
  solana: {
    rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com',
    wsEndpoint: process.env.SOLANA_WS_ENDPOINT || 'wss://api.mainnet-beta.solana.com',
    commitment: 'confirmed',
  },
  monitoring: {
    enabled: process.env.MONITORING_ENABLED === 'true',
    interval: parseInt(process.env.MONITORING_INTERVAL || '300000', 10), // 5分钟
    metricsPort: parseInt(process.env.METRICS_PORT || '9090', 10),
  },
  signal: {
    updateInterval: parseInt(process.env.SIGNAL_UPDATE_INTERVAL || '300000', 10), // 5分钟
    historyDays: parseInt(process.env.SIGNAL_HISTORY_DAYS || '14', 10),
    maxT1Pools: parseInt(process.env.SIGNAL_MAX_T1_POOLS || '3', 10),
    maxT2Pools: parseInt(process.env.SIGNAL_MAX_T2_POOLS || '5', 10),
    maxT3Pools: parseInt(process.env.SIGNAL_MAX_T3_POOLS || '7', 10),
  },
  security: {
    rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15分钟
    maxRequestsPerWindow: parseInt(process.env.MAX_REQUESTS_PER_WINDOW || '1000', 10),
  },
};
