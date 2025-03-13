/**
 * 池数据服务
 * 负责池数据的存储和检索
 */

const { Pool } = require('../models/pool');
const logger = require('../utils/logger');

/**
 * 创建或更新池数据
 * @param {Object} poolData 池数据
 * @returns {Promise<Object>} 更新后的池数据
 */
async function upsertPoolData(poolData) {
  try {
    const { address } = poolData;
    
    if (!address) {
      throw new Error('池地址不能为空');
    }
    
    // 使用findOneAndUpdate进行upsert操作
    const updatedPool = await Pool.findOneAndUpdate(
      { address },
      { 
        ...poolData,
        lastUpdated: new Date()
      },
      { 
        upsert: true, 
        new: true,
        setDefaultsOnInsert: true
      }
    );
    
    logger.info(`池数据已更新: ${address}`);
    return updatedPool;
  } catch (error) {
    logger.error(`更新池数据失败: ${poolData.address || 'unknown'}`, { error: error.message });
    throw error;
  }
}

/**
 * 获取所有池数据
 * @param {Object} filter 过滤条件
 * @param {Object} sort 排序条件
 * @param {number} limit 限制数量
 * @param {number} skip 跳过数量
 * @returns {Promise<Array>} 池数据数组
 */
async function getAllPools(filter = {}, sort = { 'yields.apr': -1 }, limit = 100, skip = 0) {
  try {
    return await Pool.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limit);
  } catch (error) {
    logger.error('获取所有池数据失败', { error: error.message });
    throw error;
  }
}

/**
 * 获取特定池的数据
 * @param {string} address 池地址
 * @returns {Promise<Object>} 池数据
 */
async function getPoolByAddress(address) {
  try {
    const pool = await Pool.findOne({ address });
    
    if (!pool) {
      logger.warn(`找不到池数据: ${address}`);
      return null;
    }
    
    return pool;
  } catch (error) {
    logger.error(`获取池 ${address} 数据失败`, { error: error.message });
    throw error;
  }
}

/**
 * 获取特定代币对的所有池
 * @param {string} tokenA 代币A地址
 * @param {string} tokenB 代币B地址
 * @returns {Promise<Array>} 池数据数组
 */
async function getPoolsByTokenPair(tokenA, tokenB) {
  try {
    return await Pool.find({
      $or: [
        { tokenAAddress: tokenA, tokenBAddress: tokenB },
        { tokenAAddress: tokenB, tokenBAddress: tokenA }
      ]
    });
  } catch (error) {
    logger.error(`获取代币对 ${tokenA}/${tokenB} 的池数据失败`, { error: error.message });
    throw error;
  }
}

module.exports = {
  upsertPoolData,
  getAllPools,
  getPoolByAddress,
  getPoolsByTokenPair
}; 