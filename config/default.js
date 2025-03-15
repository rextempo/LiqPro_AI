/**
 * 默认配置文件
 * 包含所有环境共享的基础配置
 */

module.exports = {
  // 应用基础配置
  app: {
    name: 'LiqPro',
    version: '1.0.0',
    env: process.env.NODE_ENV || 'development',
    port: process.env.PORT || 3000,
  },

  // 日志基础配置
  logger: {
    level: 'info',
    format: 'json',
    transports: ['console'],
  },

  // 数据库基础配置
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'liqpro',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    pool: {
      min: 2,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  },

  // Solana基础配置
  solana: {
    network: 'mainnet-beta',
    rpcEndpoint: process.env.SOLANA_RPC_ENDPOINT || 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
    wsEndpoint: process.env.SOLANA_WS_ENDPOINT || 'wss://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
    timeout: 30000,
  },

  // Jupiter API基础配置
  jupiter: {
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

  // Meteora API基础配置
  meteora: {
    apiKey: process.env.METEORA_API_KEY,
    baseUrl: process.env.METEORA_API_URL || 'https://dlmm-api.meteora.ag',
    version: 'v1',
    timeout: process.env.METEORA_API_TIMEOUT || 30000,
    retry: {
      maxAttempts: 3,
      backoff: {
        initialDelay: 1000,
        maxDelay: 5000,
        factor: 2
      }
    },
    rateLimit: {
      maxRequests: 100,
      windowMs: 60000 // 1分钟
    },
    // DLMM SDK配置
    sdk: {
      programId: process.env.METEORA_PROGRAM_ID || 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
      network: 'mainnet-beta',
      connection: {
        commitment: 'confirmed',
        confirmTransactionInitialTimeout: 60000,
        useRequestQueue: true,
        wsEndpoint: process.env.SOLANA_WS_ENDPOINT,
        httpEndpoint: process.env.SOLANA_RPC_ENDPOINT,
      },
      wallet: {
        publicKey: process.env.METEORA_WALLET_PUBLIC_KEY,
        secretKey: process.env.METEORA_WALLET_SECRET_KEY,
      },
      options: {
        slippageTolerance: 0.01, // 1%
        maxRetries: 3,
        retryDelay: 1000,
        priorityFee: {
          lamports: process.env.METEORA_PRIORITY_FEE_LAMPORTS || 10000000,
          priorityLevel: process.env.METEORA_PRIORITY_LEVEL || 'veryHigh'
        }
      }
    }
  },

  // 缓存基础配置
  cache: {
    enabled: true,
    ttl: 300,
    max: 1000,
  },

  // 安全基础配置
  security: {
    cors: {
      enabled: true,
      origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      credentials: true,
    },
    rateLimit: {
      enabled: true,
      max: process.env.RATE_LIMIT_MAX || 100,
      windowMs: 15 * 60 * 1000, // 15分钟
    },
  },

  // 监控基础配置
  monitoring: {
    enabled: false,
    metrics: {
      enabled: false,
      path: '/metrics',
    },
    tracing: {
      enabled: false,
      sampleRate: 0.1,
    },
  },
}; 