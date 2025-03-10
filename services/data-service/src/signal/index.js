/**
 * 信号服务模块
 * 
 * 该模块负责分析市场数据、生成投资策略和进行回测，为 LiqPro 平台提供投资决策支持
 */

// 导入市场分析功能
import {
  analyzePriceTrend,
  analyzeLiquidityDistribution,
  analyzeVolumePattern,
  findRelatedPools
} from './analysis/market.js';

// 导入策略生成功能
import {
  generateBaseStrategy,
  adjustStrategyParameters,
  combineStrategies
} from './strategy/generator.js';

// 导入回测功能
import {
  backtest,
  evaluatePerformance,
  optimizeParameters
} from './backtest/engine.js';

// 导入工具函数
import { logger } from '../utils/logger.js';
import { config } from '../config.js';

// 导入数据服务功能，建立关联
import {
  initConnection,
  fetchAllPools,
  getPoolByAddress,
  analyzePools,
  filterHighActivityPools,
  identifyBestPoolsPerPair
} from '../meteora/index.js';

/**
 * 执行完整的信号生成流程
 * 
 * @param {Object} options - 信号生成选项
 * @returns {Promise<Object>} 生成的信号结果
 */
export async function generateSignals(options = {}) {
  logger.info('开始生成投资信号');
  
  try {
    // 初始化连接
    const connection = initConnection();
    
    // 获取池数据
    const poolsData = await fetchAllPools(connection);
    
    // 分析池数据
    const analyzedPools = analyzePools(poolsData);
    
    // 筛选高活跃度池
    const highActivityPools = filterHighActivityPools(analyzedPools);
    
    // 进行市场分析
    const marketAnalysis = await analyzeMarket(highActivityPools, connection, options);
    
    // 生成策略
    const strategies = generateStrategies(marketAnalysis, options);
    
    // 回测策略
    const backtestResults = await backtestStrategies(strategies, connection, options);
    
    // 优化策略参数
    const optimizedStrategies = optimizeStrategies(strategies, backtestResults);
    
    logger.info('投资信号生成完成');
    
    return {
      marketAnalysis,
      strategies: optimizedStrategies,
      backtestResults,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('生成投资信号失败', { error: error.message, stack: error.stack });
    throw new Error(`生成投资信号失败: ${error.message}`);
  }
}

/**
 * 分析市场数据
 * 
 * @param {Array} pools - 池数据数组
 * @param {Connection} connection - Solana 连接实例
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 市场分析结果
 */
async function analyzeMarket(pools, connection, options = {}) {
  logger.info('开始市场分析');
  
  try {
    // 并行执行各种分析
    const [
      priceTrends,
      liquidityDistributions,
      volumePatterns,
      relatedPoolsMap
    ] = await Promise.all([
      analyzePriceTrend(pools, connection, options),
      analyzeLiquidityDistribution(pools, connection, options),
      analyzeVolumePattern(pools, connection, options),
      findRelatedPools(pools, connection, options)
    ]);
    
    logger.info('市场分析完成');
    
    return {
      priceTrends,
      liquidityDistributions,
      volumePatterns,
      relatedPoolsMap,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('市场分析失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 生成投资策略
 * 
 * @param {Object} marketAnalysis - 市场分析结果
 * @param {Object} options - 策略生成选项
 * @returns {Array} 生成的策略数组
 */
function generateStrategies(marketAnalysis, options = {}) {
  logger.info('开始生成投资策略');
  
  try {
    // 生成基础策略
    const baseStrategies = generateBaseStrategy(marketAnalysis, options);
    
    // 调整策略参数
    const adjustedStrategies = adjustStrategyParameters(baseStrategies, marketAnalysis);
    
    // 组合策略
    const combinedStrategies = combineStrategies(adjustedStrategies, options);
    
    logger.info(`成功生成 ${combinedStrategies.length} 个投资策略`);
    
    return combinedStrategies;
  } catch (error) {
    logger.error('生成投资策略失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 回测投资策略
 * 
 * @param {Array} strategies - 策略数组
 * @param {Connection} connection - Solana 连接实例
 * @param {Object} options - 回测选项
 * @returns {Promise<Object>} 回测结果
 */
async function backtestStrategies(strategies, connection, options = {}) {
  logger.info('开始回测投资策略');
  
  try {
    // 执行回测
    const backtestResults = await backtest(strategies, connection, options);
    
    // 评估性能
    const performanceResults = evaluatePerformance(backtestResults);
    
    logger.info('回测完成');
    
    return {
      backtestResults,
      performanceResults,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('回测投资策略失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 优化策略参数
 * 
 * @param {Array} strategies - 策略数组
 * @param {Object} backtestResults - 回测结果
 * @returns {Array} 优化后的策略数组
 */
function optimizeStrategies(strategies, backtestResults) {
  logger.info('开始优化策略参数');
  
  try {
    // 优化参数
    const optimizedStrategies = optimizeParameters(strategies, backtestResults);
    
    logger.info('策略参数优化完成');
    
    return optimizedStrategies;
  } catch (error) {
    logger.error('优化策略参数失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

// 导出所有功能
export {
  // 市场分析
  analyzePriceTrend,
  analyzeLiquidityDistribution,
  analyzeVolumePattern,
  findRelatedPools,
  
  // 策略生成
  generateBaseStrategy,
  adjustStrategyParameters,
  combineStrategies,
  
  // 回测
  backtest,
  evaluatePerformance,
  optimizeParameters
}; 