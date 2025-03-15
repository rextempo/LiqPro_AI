/**
 * 生产环境配置文件
 * 继承默认配置并添加生产环境特定配置
 */

module.exports = {
  // 继承默认配置
  ...require('./default'),

  // 生产环境特定配置
  app: {
    ...require('./default').app,
    port: process.env.PORT || 3000,
  },

  // 生产环境日志配置
  logger: {
    ...require('./default').logger,
    level: 'info',
    format: 'json',
    transports: ['file'],
    filename: '/var/log/liqpro/app.log',
  },

  // 生产环境数据库配置
  database: {
    ...require('./default').database,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    name: process.env.DB_NAME,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    pool: {
      min: 5,
      max: 20,
      idleTimeoutMillis: 30000,
    },
  },

  // 生产环境Solana配置
  solana: {
    ...require('./default').solana,
    network: 'mainnet-beta',
    rpcEndpoint: 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
    wsEndpoint: 'wss://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
    timeout: 30000,
  },

  // 生产环境Meteora API配置
  meteora: {
    ...require('./default').meteora,
    baseUrl: process.env.METEORA_API_URL || 'https://api.meteora.ag',
  },

  // 生产环境缓存配置
  cache: {
    ...require('./default').cache,
    ttl: 600,
    max: 5000,
    redis: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    },
  },

  // 生产环境安全配置
  security: {
    ...require('./default').security,
    cors: {
      ...require('./default').security.cors,
      origin: process.env.CORS_ORIGIN,
    },
    rateLimit: {
      ...require('./default').security.rateLimit,
      max: 50,
    },
  },

  // 生产环境监控配置
  monitoring: {
    ...require('./default').monitoring,
    enabled: true,
    metrics: {
      enabled: true,
      path: '/metrics',
    },
    tracing: {
      enabled: true,
      jaeger: {
        agent: {
          host: process.env.JAEGER_AGENT_HOST,
          port: process.env.JAEGER_AGENT_PORT,
        },
      },
    },
  },

  // 性能优化配置
  optimization: {
    compression: true,
    minification: true,
    cacheControl: true,
    etag: true,
  },
}; 