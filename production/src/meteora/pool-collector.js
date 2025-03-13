/**
 * Meteora池收集器适配器
 * 用于连接现有的MeteoraPoolCollector和新的快照功能
 */

const { MeteoraPoolCollector } = require('../../meteora-simple');
const { upsertPoolData } = require('../services/pool-service');
const { generateHourlySnapshot } = require('../services/snapshot-service');
const { Pool } = require('../models/pool');
const logger = require('../utils/logger');

/**
 * 创建一个适配器，将现有的MeteoraPoolCollector与快照功能连接起来
 * @param {string} rpcEndpoint Solana RPC端点
 * @returns {Object} 增强的池收集器
 */
function createEnhancedPoolCollector(rpcEndpoint) {
  // 创建原始收集器
  const originalCollector = new MeteoraPoolCollector(rpcEndpoint);
  
  // 增强的收集器
  const enhancedCollector = {
    // 保留原始收集器的所有方法
    ...originalCollector,
    
    /**
     * 获取池信息并生成快照
     * @param {string} poolAddress 池地址
     * @param {boolean} forceRefresh 强制刷新
     * @param {boolean} generateSnapshot 是否生成快照
     * @returns {Promise<Object>} 池信息
     */
    async getPoolInfoWithSnapshot(poolAddress, forceRefresh = false, generateSnapshot = true) {
      try {
        // 使用原始收集器获取池信息
        const poolInfo = await originalCollector.getPoolInfo(poolAddress, forceRefresh);
        
        // 转换数据格式
        const poolData = {
          address: poolAddress,
          tokenA: poolInfo.tokenX || 'Unknown',
          tokenB: poolInfo.tokenY || 'Unknown',
          tokenAAddress: poolInfo.tokenX || 'Unknown',
          tokenBAddress: poolInfo.tokenY || 'Unknown',
          feeTier: poolInfo.feeTier || 0,
          binStep: poolInfo.binStep || 0,
          liquidity: parseFloat(poolInfo.liquidity) || 0,
          volume24h: 0, // 需要从其他来源获取
          currentPrice: parseFloat(poolInfo.sqrtPrice) || 0,
          status: poolInfo.status || 'enabled',
          reserves: {
            tokenA: 0, // 需要从其他来源获取
            tokenB: 0, // 需要从其他来源获取
          },
          fees: {
            base: poolInfo.feeTier || 0,
            max: 0, // 需要从其他来源获取
            total24h: 0, // 需要从其他来源获取
          },
          volumeHistory: {
            cumulative: 0, // 需要从其他来源获取
            fees: 0, // 需要从其他来源获取
          },
          yields: {
            apr: 0, // 需要从其他来源获取
            feesToTVL: 0, // 需要从其他来源获取
            feesToTVLPercent: 0, // 需要从其他来源获取
          },
          tags: [],
          name: `${poolInfo.tokenX || 'Unknown'}-${poolInfo.tokenY || 'Unknown'}`,
        };
        
        // 存储到数据库
        const updatedPool = await upsertPoolData(poolData);
        
        // 生成快照
        if (generateSnapshot) {
          await generateHourlySnapshot(poolAddress, updatedPool);
        }
        
        return updatedPool;
      } catch (error) {
        logger.error(`获取池 ${poolAddress} 信息并生成快照失败`, { error: error.message });
        throw error;
      }
    },
    
    /**
     * 获取所有池信息并生成快照
     * @param {boolean} forceRefresh 强制刷新
     * @param {boolean} generateSnapshot 是否生成快照
     * @returns {Promise<Array>} 池信息数组
     */
    async getAllPoolsWithSnapshot(forceRefresh = false, generateSnapshot = true) {
      try {
        // 使用原始收集器获取所有池
        const allPools = await originalCollector.getAllPools(forceRefresh);
        
        const results = [];
        
        // 处理每个池
        for (const pool of allPools) {
          try {
            const poolData = await this.getPoolInfoWithSnapshot(
              pool.address,
              forceRefresh,
              generateSnapshot
            );
            results.push(poolData);
          } catch (error) {
            logger.error(`处理池 ${pool.address} 失败`, { error: error.message });
            // 继续处理其他池
          }
        }
        
        return results;
      } catch (error) {
        logger.error('获取所有池信息并生成快照失败', { error: error.message });
        throw error;
      }
    }
  };
  
  return enhancedCollector;
}

module.exports = {
  createEnhancedPoolCollector
}; 