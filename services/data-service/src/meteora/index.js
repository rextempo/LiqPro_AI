/**
 * Meteora DLMM 数据服务模块
 * 
 * 该模块负责从 Meteora DLMM 协议获取和分析池数据，为 LiqPro 提供流动性池投资决策支持
 */

// 导入池数据采集功能
import { fetchAllPools, getPoolByAddress } from './pools.js';

// 导入池数据分析功能
import { analyzePools, filterHighActivityPools, identifyBestPoolsPerPair } from './analysis.js';

// 导入池数据存储功能
import { 
  savePools, 
  loadPools, 
  saveHighActivityPools, 
  loadHighActivityPools, 
  saveBestPools, 
  loadBestPools,
  saveRawApiData
} from './storage.js';

// 导入池监控功能
import { monitorPools, monitorPoolBins } from './monitor.js';

// 导入工具函数
import { Connection } from '@solana/web3.js';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

/**
 * 初始化 Solana 连接
 * 
 * @returns {Connection} Solana 连接实例
 */
export function initConnection() {
  return new Connection(config.solana.rpcEndpoint, config.solana.commitment);
}

/**
 * 执行完整的数据采集和分析流程
 * 
 * @returns {Promise<Object>} 分析结果
 */
export async function collectAndAnalyzeData() {
  logger.info('开始 Meteora DLMM 数据采集和分析流程');
  
  try {
    // 初始化连接
    const connection = initConnection();
    
    // 获取所有池数据
    const poolsData = await fetchAllPools(connection);
    
    // 保存原始 API 响应数据
    await saveRawApiData(poolsData);
    
    // 分析池数据
    const analyzedPools = analyzePools(poolsData);
    
    // 保存所有池数据
    await savePools(analyzedPools);
    
    // 筛选高活跃度池
    const highActivityPools = filterHighActivityPools(analyzedPools);
    
    // 保存高活跃度池数据
    await saveHighActivityPools(highActivityPools);
    
    // 识别最佳池
    const bestPools = identifyBestPoolsPerPair(analyzedPools);
    
    // 保存最佳池数据
    await saveBestPools(bestPools);
    
    logger.info('Meteora DLMM 数据采集和分析流程完成');
    
    return {
      totalPools: analyzedPools.length,
      highActivityPools: highActivityPools.length,
      bestPools: bestPools.length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('Meteora DLMM 数据采集和分析流程失败', { error: error.message, stack: error.stack });
    throw error;
  }
}

/**
 * 启动定时数据采集和分析任务
 * 
 * @param {number} interval - 采集间隔（毫秒）
 * @returns {Object} 任务控制对象
 */
export function startDataCollectionTask(interval = config.meteora.updateInterval) {
  logger.info(`启动 Meteora DLMM 数据采集任务，间隔 ${interval}ms`);
  
  let isRunning = true;
  let timeoutId = null;
  
  // 采集函数
  async function collect() {
    if (!isRunning) return;
    
    try {
      await collectAndAnalyzeData();
    } catch (error) {
      logger.error('数据采集任务失败', { error: error.message });
    }
    
    // 安排下一次采集
    if (isRunning) {
      timeoutId = setTimeout(collect, interval);
    }
  }
  
  // 立即开始第一次采集
  collect();
  
  // 返回控制对象
  return {
    stop: () => {
      isRunning = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      logger.info('停止 Meteora DLMM 数据采集任务');
    },
    isRunning: () => isRunning
  };
}

// 导出所有功能
export {
  // 池数据采集
  fetchAllPools,
  getPoolByAddress,
  
  // 池数据分析
  analyzePools,
  filterHighActivityPools,
  identifyBestPoolsPerPair,
  
  // 池数据存储
  savePools,
  loadPools,
  saveHighActivityPools,
  loadHighActivityPools,
  saveBestPools,
  loadBestPools,
  
  // 池监控
  monitorPools,
  monitorPoolBins
}; 