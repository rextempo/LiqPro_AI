/**
 * @file 配置文件
 * @module config
 */

export const config = {
  meteora: {
    baseUrl: process.env.METEORA_API_URL || 'https://api.meteora.ag',
    apiKey: process.env.METEORA_API_KEY || '',
    rpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com'
  },
  pools: {
    minTVL: 10000, // 最小TVL（美元）
    minVolume: 20000, // 最小24小时成交量（美元）
    updateInterval: 300000, // 更新间隔（5分钟）
    maxRetries: 3, // 最大重试次数
    retryDelay: 1000 // 重试延迟（毫秒）
  }
}; 