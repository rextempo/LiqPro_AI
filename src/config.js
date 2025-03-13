/**
 * 配置模块
 * 
 * 该模块集中管理应用程序的配置参数，支持通过环境变量覆盖默认值
 */

import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// 加载 .env 文件
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
}

/**
 * 从环境变量获取值，如果不存在则使用默认值
 * 
 * @param {string} key - 环境变量名
 * @param {any} defaultValue - 默认值
 * @returns {any} 配置值
 */
function getEnv(key, defaultValue) {
  const value = process.env[key];
  
  if (value === undefined) {
    return defaultValue;
  }
  
  // 尝试将值转换为数字或布尔值
  if (value.toLowerCase() === 'true') return true;
  if (value.toLowerCase() === 'false') return false;
  if (!isNaN(value) && value.trim() !== '') return Number(value);
  
  return value;
}

// 导出配置对象
const config = {
  // 应用程序配置
  app: {
    env: getEnv('NODE_ENV', 'development'),
    port: getEnv('PORT', 3000),
    host: getEnv('HOST', 'localhost'),
    name: getEnv('APP_NAME', 'data-service'),
    version: getEnv('APP_VERSION', '1.0.0')
  },
  
  // 日志配置
  logging: {
    level: getEnv('LOG_LEVEL', 'info'),
    console: getEnv('LOG_CONSOLE', true),
    file: getEnv('LOG_FILE', true),
    maxSize: getEnv('LOG_MAX_SIZE', 10485760), // 10MB
    maxFiles: getEnv('LOG_MAX_FILES', 10)
  },
  
  // Solana 配置
  solana: {
    rpcEndpoint: getEnv('SOLANA_RPC_ENDPOINT', 'https://api.mainnet-beta.solana.com'),
    wsEndpoint: getEnv('SOLANA_WS_ENDPOINT', 'wss://api.mainnet-beta.solana.com'),
    commitment: 'confirmed'
  },
  
  // Meteora 配置
  meteora: {
    programId: getEnv('METEORA_PROGRAM_ID', 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo'),
    apiEndpoint: getEnv('METEORA_API_ENDPOINT', 'https://dlmm-api.meteora.ag'),
    updateInterval: getEnv('METEORA_UPDATE_INTERVAL', 300000), // 5 分钟
    monitorInterval: getEnv('METEORA_MONITOR_INTERVAL', 60000), // 1 分钟
    binMonitorInterval: getEnv('METEORA_BIN_MONITOR_INTERVAL', 10000) // 10 秒
  },
  
  // API 配置
  api: {
    timeout: getEnv('API_TIMEOUT', 30000), // 30 秒
    retries: getEnv('API_RETRIES', 3),
    userAgent: getEnv('API_USER_AGENT', 'LiqPro/1.0.0')
  },
  
  // 数据库配置
  database: {
    uri: getEnv('DATABASE_URI', ''),
    name: getEnv('DATABASE_NAME', 'liqpro'),
    user: getEnv('DATABASE_USER', ''),
    password: getEnv('DATABASE_PASSWORD', ''),
    host: getEnv('DATABASE_HOST', 'localhost'),
    port: getEnv('DATABASE_PORT', 27017)
  },
  
  // 缓存配置
  cache: {
    enabled: getEnv('CACHE_ENABLED', true),
    ttl: getEnv('CACHE_TTL', 300), // 5 分钟
    maxSize: getEnv('CACHE_MAX_SIZE', 1000)
  },
  
  // 安全配置
  security: {
    apiKey: getEnv('API_KEY', ''),
    jwtSecret: getEnv('JWT_SECRET', ''),
    jwtExpiration: getEnv('JWT_EXPIRATION', '1d')
  },
  
  // 信号配置
  signal: {
    updateInterval: parseInt(process.env.SIGNAL_UPDATE_INTERVAL || '300000', 10), // 5分钟
    historyDays: parseInt(process.env.SIGNAL_HISTORY_DAYS || '14', 10),
    maxT1Pools: parseInt(process.env.SIGNAL_MAX_T1_POOLS || '3', 10),
    maxT2Pools: parseInt(process.env.SIGNAL_MAX_T2_POOLS || '5', 10),
    maxT3Pools: parseInt(process.env.SIGNAL_MAX_T3_POOLS || '7', 10)
  }
};

// 根据环境调整配置
if (config.app.env === 'development') {
  // 开发环境特定配置
  config.logging.level = getEnv('LOG_LEVEL', 'debug');
} else if (config.app.env === 'production') {
  // 生产环境特定配置
  config.logging.console = getEnv('LOG_CONSOLE', false);
}

// 验证必要的配置
function validateConfig() {
  const requiredConfigs = [
    { path: 'solana.rpcEndpoint', name: 'SOLANA_RPC_ENDPOINT' }
  ];
  
  const missingConfigs = requiredConfigs.filter(({ path }) => {
    const parts = path.split('.');
    let current = config;
    
    for (const part of parts) {
      if (current[part] === undefined || current[part] === '') {
        return true;
      }
      current = current[part];
    }
    
    return false;
  });
  
  if (missingConfigs.length > 0) {
    const missingEnvVars = missingConfigs.map(({ name }) => name).join(', ');
    console.error(`缺少必要的配置: ${missingEnvVars}`);
    process.exit(1);
  }
}

// 在非测试环境下验证配置
if (process.env.NODE_ENV !== 'test') {
  validateConfig();
}

module.exports = { config }; 