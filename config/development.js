/**
 * 开发环境配置文件
 * 继承默认配置并添加开发环境特定配置
 */

module.exports = {
  // 继承默认配置
  ...require('./default'),

  // 开发环境特定配置
  app: {
    ...require('./default').app,
    port: process.env.PORT || 3001, // 开发环境使用不同端口
  },

  // 开发环境日志配置
  logger: {
    ...require('./default').logger,
    level: 'debug', // 开发环境使用更详细的日志级别
    format: 'dev',
  },

  // 开发环境数据库配置
  database: {
    ...require('./default').database,
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'liqpro',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
  },

  // 开发环境Solana配置
  solana: {
    ...require('./default').solana,
    network: 'mainnet-beta',
    rpcEndpoint: 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
    wsEndpoint: 'wss://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
    timeout: 30000,
  },

  // 开发环境Jupiter API配置
  jupiter: {
    ...require('./default').jupiter,
    apiUrl: process.env.JUPITER_API_URL || 'https://quote-api.jup.ag/v6',
    timeout: process.env.JUPITER_API_TIMEOUT || 30000,
    slippageBps: process.env.JUPITER_SLIPPAGE_BPS || 50,
    maxAccounts: process.env.JUPITER_MAX_ACCOUNTS || 64,
    dynamicComputeUnitLimit: true,
    wrapAndUnwrapSol: true,
    prioritizationFeeLamports: {
      priorityLevelWithMaxLamports: {
        maxLamports: process.env.JUPITER_PRIORITY_FEE_LAMPORTS || 10000000,
        priorityLevel: process.env.JUPITER_PRIORITY_LEVEL || 'veryHigh'
      }
    },
    dynamicSlippage: {
      maxBps: process.env.JUPITER_DYNAMIC_SLIPPAGE_MAX_BPS || 300
    }
  },

  // 开发环境Meteora API配置
  meteora: {
    ...require('./default').meteora,
    baseUrl: process.env.METEORA_API_URL || 'https://api.meteora.ag',
  },

  // 开发环境缓存配置
  cache: {
    ...require('./default').cache,
    ttl: 60, // 开发环境使用更短的缓存时间
  },

  // 开发环境安全配置
  security: {
    ...require('./default').security,
    cors: {
      ...require('./default').security.cors,
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
    },
    rateLimit: {
      ...require('./default').security.rateLimit,
      max: 1000, // 开发环境放宽请求限制
    },
  },

  // 开发环境监控配置
  monitoring: {
    ...require('./default').monitoring,
    sampleRate: 1,
  },

  // 开发工具配置
  devTools: {
    reactDevTools: true,
    reduxDevTools: true,
    mockApi: true,
    hotReload: true,
  },
}; 