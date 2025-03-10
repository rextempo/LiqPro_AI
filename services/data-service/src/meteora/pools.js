/**
 * Meteora DLMM 池数据采集模块
 * 
 * 该模块负责从多个来源获取 Meteora DLMM 池数据
 */

import { Connection, PublicKey } from '@solana/web3.js';
import pkg from '@meteora-ag/dlmm';
import fetch from 'node-fetch';
import { logger } from '../utils/logger.js';
import { withRetry } from '../utils/retry.js';
import { config } from '../config.js';

const DLMM = pkg.default;
const METEORA_PROGRAM_ID = new PublicKey('LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo');

/**
 * 从多个来源获取所有 Meteora DLMM 池数据
 * 
 * @param {Connection} connection - Solana 连接实例
 * @returns {Promise<Object>} 包含从不同来源获取的池数据
 */
export async function fetchAllPools(connection) {
  logger.info('开始获取 Meteora DLMM 池数据');
  
  try {
    // 并行获取数据以提高效率
    const [apiPools, sdkPools, rpcPools] = await Promise.all([
      fetchPoolsFromAPI(),
      fetchPoolsFromSDK(connection),
      fetchPoolsFromRPC(connection)
    ]);
    
    logger.info(`成功获取池数据: API ${apiPools.length}个, SDK ${sdkPools.length}个, RPC ${rpcPools.length}个`);
    
    return {
      apiPools,
      sdkPools,
      rpcPools,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('获取池数据失败', { error: error.message, stack: error.stack });
    throw new Error(`获取 Meteora DLMM 池数据失败: ${error.message}`);
  }
}

/**
 * 从 API 获取池数据
 * 
 * @returns {Promise<Array>} 池数据数组
 */
async function fetchPoolsFromAPI() {
  // 尝试不同的 API 端点
  const endpoints = [
    'https://dlmm-api.meteora.ag/pair/all',
    'https://dlmm-api.meteora.ag/pool/all',
    'https://dlmm-api.meteora.ag/v1/dlmm/pairs',
    'https://api.meteora.ag/v1/dlmm/pairs'
  ];
  
  for (const endpoint of endpoints) {
    logger.debug(`尝试从 API 端点 ${endpoint} 获取池数据`);
    
    try {
      const response = await withRetry(() => fetch(endpoint, {
        timeout: config.api.timeout,
        headers: {
          'Accept': 'application/json',
          'User-Agent': config.api.userAgent
        }
      }));
      
      if (!response.ok) {
        logger.warn(`API 请求失败，状态码: ${response.status}`, { endpoint });
        continue;
      }
      
      const responseData = await response.json();
      let pools = [];
      
      // 处理不同的响应格式
      if (Array.isArray(responseData)) {
        pools = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        pools = responseData.data;
      } else {
        logger.warn('未知的 API 响应格式', { endpoint });
        continue;
      }
      
      logger.info(`成功从 ${endpoint} 获取 ${pools.length} 个池数据`);
      return pools;
    } catch (error) {
      logger.warn(`从 ${endpoint} 获取池数据失败`, { error: error.message });
    }
  }
  
  logger.warn('所有 API 端点都失败了，返回空数组');
  return [];
}

/**
 * 使用 SDK 获取池数据
 * 
 * @param {Connection} connection - Solana 连接实例
 * @returns {Promise<Array>} 池数据数组
 */
async function fetchPoolsFromSDK(connection) {
  logger.debug('使用 SDK 获取池数据');
  
  try {
    const allPools = await withRetry(() => DLMM.getLbPairs(connection));
    logger.info(`SDK 返回 ${allPools.length} 个池数据`);
    
    // 转换 SDK 返回的数据为标准格式
    const processedPools = allPools.map(pool => {
      try {
        return {
          source: 'sdk',
          address: pool.pubkey?.toString() || '',
          tokenX: pool.tokenX?.toString() || '',
          tokenY: pool.tokenY?.toString() || '',
          binStep: pool.binStep?.toString() || '',
          activeId: pool.activeId?.toString() || '',
          // 添加其他可能的字段
          raw: pool // 保留原始数据以备后用
        };
      } catch (error) {
        logger.warn('处理 SDK 池数据时出错', { error: error.message });
        return null;
      }
    }).filter(Boolean);
    
    return processedPools;
  } catch (error) {
    logger.error('使用 SDK 获取池数据失败', { error: error.message, stack: error.stack });
    return [];
  }
}

/**
 * 使用 RPC 获取池账户
 * 
 * @param {Connection} connection - Solana 连接实例
 * @returns {Promise<Array>} 池账户数组
 */
async function fetchPoolsFromRPC(connection) {
  logger.debug('使用 RPC 获取池账户');
  
  try {
    const accounts = await withRetry(() => connection.getProgramAccounts(
      METEORA_PROGRAM_ID,
      {
        filters: [
          {
            memcmp: {
              offset: 8, // 跳过 discriminator
              bytes: '3' // LbPair account discriminator
            }
          }
        ],
        dataSlice: { offset: 0, length: 0 } // 只获取地址，不获取数据
      }
    ));
    
    logger.info(`RPC 返回 ${accounts.length} 个池账户`);
    
    // 转换 RPC 返回的数据为标准格式
    const processedAccounts = accounts.map(account => ({
      source: 'rpc',
      address: account.pubkey.toString(),
      raw: account // 保留原始数据以备后用
    }));
    
    return processedAccounts;
  } catch (error) {
    logger.error('使用 RPC 获取池账户失败', { error: error.message, stack: error.stack });
    return [];
  }
}

/**
 * 获取特定池的详细信息
 * 
 * @param {Connection} connection - Solana 连接实例
 * @param {string|PublicKey} poolAddress - 池地址
 * @returns {Promise<Object>} 池详细信息
 */
export async function getPoolByAddress(connection, poolAddress) {
  logger.debug(`获取池 ${poolAddress} 的详细信息`);
  
  try {
    const pubkey = typeof poolAddress === 'string' ? new PublicKey(poolAddress) : poolAddress;
    
    // 尝试从 API 获取
    try {
      const response = await withRetry(() => fetch(`https://dlmm-api.meteora.ag/pool/${pubkey.toString()}`));
      
      if (response.ok) {
        const poolData = await response.json();
        logger.info(`成功从 API 获取池 ${pubkey.toString()} 的详细信息`);
        return {
          source: 'api',
          ...poolData
        };
      }
    } catch (error) {
      logger.warn(`从 API 获取池 ${pubkey.toString()} 的详细信息失败`, { error: error.message });
    }
    
    // 尝试使用 SDK 获取
    try {
      const dlmm = await withRetry(() => DLMM.create(connection, pubkey));
      
      if (dlmm) {
        logger.info(`成功使用 SDK 获取池 ${pubkey.toString()} 的详细信息`);
        
        // 获取活跃 bin 信息
        const activeBin = await dlmm.getActiveBin();
        
        // 获取 bin 周围的流动性分布
        const binsAroundActive = await dlmm.getBinsAroundActiveBin(5, 5);
        
        // 获取费用信息
        const feeInfo = await dlmm.getFeeInfo();
        
        return {
          source: 'sdk',
          address: pubkey.toString(),
          activeBin,
          binsAroundActive,
          feeInfo,
          raw: dlmm
        };
      }
    } catch (error) {
      logger.warn(`使用 SDK 获取池 ${pubkey.toString()} 的详细信息失败`, { error: error.message });
    }
    
    // 尝试直接从链上获取
    const accountInfo = await withRetry(() => connection.getAccountInfo(pubkey));
    
    if (accountInfo) {
      logger.info(`成功从链上获取池 ${pubkey.toString()} 的账户信息`);
      return {
        source: 'rpc',
        address: pubkey.toString(),
        owner: accountInfo.owner.toString(),
        lamports: accountInfo.lamports,
        dataLength: accountInfo.data.length,
        executable: accountInfo.executable,
        rentEpoch: accountInfo.rentEpoch,
        raw: accountInfo
      };
    }
    
    throw new Error(`无法获取池 ${pubkey.toString()} 的详细信息`);
  } catch (error) {
    logger.error(`获取池 ${poolAddress} 的详细信息失败`, { error: error.message, stack: error.stack });
    throw error;
  }
} 