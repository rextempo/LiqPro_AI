/**
 * Meteora DLMM 池数据分析模块
 * 
 * 该模块负责分析 Meteora DLMM 池数据，识别高活跃度池和最佳投资机会
 */

import { logger } from '../utils/logger.js';

// 活跃度阈值常量
const VOLUME_THRESHOLD = 10000; // 24小时交易量阈值（美元）
const TVL_THRESHOLD = 5000;     // 总锁仓价值阈值（美元）
const FEE_THRESHOLD = 10;       // 24小时费用阈值（美元）

/**
 * 分析池数据，计算关键指标
 * 
 * @param {Object} poolsData - 从不同来源获取的池数据
 * @returns {Array} 处理后的池数据数组
 */
export function analyzePools(poolsData) {
  logger.info('开始分析池数据');
  
  try {
    // 合并来自不同来源的池数据
    const mergedPools = mergePools(poolsData);
    logger.info(`合并后共有 ${mergedPools.length} 个池`);
    
    // 计算每个池的关键指标
    const analyzedPools = mergedPools.map(pool => {
      try {
        // 计算风险调整后的 APR
        const riskAdjustedAPR = calculateRiskAdjustedAPR(pool);
        
        // 计算无常损失风险
        const impermanentLossRisk = calculateImpermanentLossRisk(pool);
        
        // 计算综合得分
        const score = calculateScore(pool, riskAdjustedAPR, impermanentLossRisk);
        
        return {
          ...pool,
          riskAdjustedAPR,
          impermanentLossRisk,
          score
        };
      } catch (error) {
        logger.warn(`分析池 ${pool.address || 'unknown'} 时出错`, { error: error.message });
        return pool;
      }
    });
    
    logger.info('池数据分析完成');
    return analyzedPools;
  } catch (error) {
    logger.error('分析池数据失败', { error: error.message, stack: error.stack });
    throw new Error(`分析池数据失败: ${error.message}`);
  }
}

/**
 * 合并来自不同来源的池数据
 * 
 * @param {Object} poolsData - 从不同来源获取的池数据
 * @returns {Array} 合并后的池数据数组
 */
function mergePools({ apiPools = [], sdkPools = [], rpcPools = [] }) {
  logger.debug(`合并池数据: API ${apiPools.length}个, SDK ${sdkPools.length}个, RPC ${rpcPools.length}个`);
  
  // 创建地址到池数据的映射
  const poolMap = new Map();
  
  // 处理 API 池数据
  apiPools.forEach(pool => {
    const address = pool.pairAddress || pool.address || '';
    if (!address) return;
    
    poolMap.set(address, {
      address,
      source: 'api',
      ...pool
    });
  });
  
  // 合并 SDK 池数据
  sdkPools.forEach(pool => {
    const address = pool.address || '';
    if (!address) return;
    
    if (poolMap.has(address)) {
      // 合并现有数据
      const existingPool = poolMap.get(address);
      poolMap.set(address, {
        ...existingPool,
        ...pool,
        source: `${existingPool.source},sdk`
      });
    } else {
      // 添加新数据
      poolMap.set(address, pool);
    }
  });
  
  // 合并 RPC 池数据
  rpcPools.forEach(pool => {
    const address = pool.address || '';
    if (!address) return;
    
    if (poolMap.has(address)) {
      // 合并现有数据
      const existingPool = poolMap.get(address);
      poolMap.set(address, {
        ...existingPool,
        ...pool,
        source: `${existingPool.source},rpc`
      });
    } else {
      // 添加新数据
      poolMap.set(address, pool);
    }
  });
  
  // 转换为数组
  return Array.from(poolMap.values());
}

/**
 * 计算风险调整后的 APR
 * 
 * @param {Object} pool - 池数据
 * @returns {number} 风险调整后的 APR
 */
function calculateRiskAdjustedAPR(pool) {
  // 获取基础 APR
  const baseAPR = parseFloat(pool.apr || pool.apy || 0);
  
  // 如果没有 APR 数据，返回 0
  if (!baseAPR || isNaN(baseAPR)) return 0;
  
  // 计算风险因子
  const riskFactor = calculateRiskFactor(pool);
  
  // 调整 APR
  return baseAPR * (1 - riskFactor);
}

/**
 * 计算风险因子
 * 
 * @param {Object} pool - 池数据
 * @returns {number} 风险因子 (0-1)
 */
function calculateRiskFactor(pool) {
  let riskFactor = 0.5; // 默认风险因子
  
  // 根据交易量调整风险
  const volume24h = parseFloat(pool.volume24h || 0);
  if (volume24h > 100000) {
    riskFactor -= 0.1; // 高交易量降低风险
  } else if (volume24h < 1000) {
    riskFactor += 0.1; // 低交易量增加风险
  }
  
  // 根据 TVL 调整风险
  const tvl = parseFloat(pool.tvl || 0);
  if (tvl > 50000) {
    riskFactor -= 0.1; // 高 TVL 降低风险
  } else if (tvl < 5000) {
    riskFactor += 0.1; // 低 TVL 增加风险
  }
  
  // 根据池年龄调整风险
  const createdAt = pool.createdAt ? new Date(pool.createdAt) : null;
  if (createdAt) {
    const ageInDays = (new Date() - createdAt) / (1000 * 60 * 60 * 24);
    if (ageInDays > 30) {
      riskFactor -= 0.1; // 老池降低风险
    } else if (ageInDays < 7) {
      riskFactor += 0.2; // 新池增加风险
    }
  }
  
  // 确保风险因子在 0-1 范围内
  return Math.max(0, Math.min(1, riskFactor));
}

/**
 * 计算无常损失风险
 * 
 * @param {Object} pool - 池数据
 * @returns {number} 无常损失风险 (0-1)
 */
function calculateImpermanentLossRisk(pool) {
  // 获取价格波动率
  const volatility = parseFloat(pool.volatility || 0);
  
  // 如果没有波动率数据，使用默认值
  if (!volatility || isNaN(volatility)) {
    // 尝试从其他数据估算波动率
    const priceChange24h = parseFloat(pool.priceChange24h || 0);
    if (priceChange24h && !isNaN(priceChange24h)) {
      // 使用 24 小时价格变化作为波动率的估计
      return Math.min(1, Math.abs(priceChange24h) / 100);
    }
    
    // 如果没有价格变化数据，使用默认值
    return 0.5;
  }
  
  // 将波动率转换为 0-1 范围的风险值
  return Math.min(1, volatility / 100);
}

/**
 * 计算池的综合得分
 * 
 * @param {Object} pool - 池数据
 * @param {number} riskAdjustedAPR - 风险调整后的 APR
 * @param {number} impermanentLossRisk - 无常损失风险
 * @returns {number} 综合得分 (0-100)
 */
function calculateScore(pool, riskAdjustedAPR, impermanentLossRisk) {
  // 基础得分来自风险调整后的 APR
  let score = riskAdjustedAPR * 10;
  
  // 根据无常损失风险调整得分
  score = score * (1 - impermanentLossRisk * 0.5);
  
  // 根据交易量调整得分
  const volume24h = parseFloat(pool.volume24h || 0);
  if (volume24h > 10000) {
    score += 10;
  } else if (volume24h > 5000) {
    score += 5;
  }
  
  // 根据 TVL 调整得分
  const tvl = parseFloat(pool.tvl || 0);
  if (tvl > 50000) {
    score += 10;
  } else if (tvl > 10000) {
    score += 5;
  }
  
  // 确保得分在 0-100 范围内
  return Math.max(0, Math.min(100, score));
}

/**
 * 筛选高活跃度池
 * 
 * @param {Array} pools - 池数据数组
 * @returns {Array} 高活跃度池数组
 */
export function filterHighActivityPools(pools) {
  logger.info('筛选高活跃度池');
  
  try {
    const highActivityPools = pools.filter(pool => {
      // 检查交易量
      const volume24h = parseFloat(pool.volume24h || 0);
      const hasHighVolume = volume24h >= VOLUME_THRESHOLD;
      
      // 检查 TVL
      const tvl = parseFloat(pool.tvl || 0);
      const hasHighTVL = tvl >= TVL_THRESHOLD;
      
      // 检查费用
      const fees24h = parseFloat(pool.fees_24h || 0);
      const hasHighFees = fees24h >= FEE_THRESHOLD;
      
      // 至少满足两个条件
      return (hasHighVolume && hasHighTVL) || 
             (hasHighVolume && hasHighFees) || 
             (hasHighTVL && hasHighFees);
    });
    
    logger.info(`找到 ${highActivityPools.length} 个高活跃度池`);
    return highActivityPools;
  } catch (error) {
    logger.error('筛选高活跃度池失败', { error: error.message, stack: error.stack });
    throw new Error(`筛选高活跃度池失败: ${error.message}`);
  }
}

/**
 * 识别每个交易对的最佳池
 * 
 * @param {Array} pools - 池数据数组
 * @returns {Array} 最佳池数组
 */
export function identifyBestPoolsPerPair(pools) {
  logger.info('识别每个交易对的最佳池');
  
  try {
    // 按交易对分组
    const pairMap = new Map();
    
    pools.forEach(pool => {
      const tokenXSymbol = pool.tokenXSymbol || 'unknown';
      const tokenYSymbol = pool.tokenYSymbol || 'unknown';
      
      // 创建交易对标识符
      const pairId = `${tokenXSymbol}-${tokenYSymbol}`;
      
      if (!pairMap.has(pairId)) {
        pairMap.set(pairId, []);
      }
      
      pairMap.get(pairId).push(pool);
    });
    
    // 为每个交易对选择最佳池
    const bestPools = [];
    
    pairMap.forEach((pairPools, pairId) => {
      // 按得分排序
      pairPools.sort((a, b) => (b.score || 0) - (a.score || 0));
      
      // 选择得分最高的池
      if (pairPools.length > 0) {
        const bestPool = pairPools[0];
        bestPools.push({
          ...bestPool,
          isPairBest: true,
          pairId
        });
      }
    });
    
    logger.info(`找到 ${bestPools.length} 个最佳池`);
    return bestPools;
  } catch (error) {
    logger.error('识别最佳池失败', { error: error.message, stack: error.stack });
    throw new Error(`识别最佳池失败: ${error.message}`);
  }
} 