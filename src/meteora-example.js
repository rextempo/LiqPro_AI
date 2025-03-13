/**
 * Meteora DLMM 数据服务示例
 * 
 * 该脚本演示如何使用 Meteora DLMM 数据服务模块
 */

import {
  initConnection,
  fetchAllPools,
  analyzePools,
  filterHighActivityPools,
  identifyBestPoolsPerPair,
  savePools,
  saveHighActivityPools,
  saveBestPools,
  monitorPools,
  getPoolByAddress,
  monitorPoolBins,
  collectAndAnalyzeData,
  startDataCollectionTask
} from '../meteora/index.js';

import { logger } from '../utils/logger.js';
import { sleep } from '../utils/retry.js';

/**
 * 演示获取和分析所有池数据
 */
async function demoFetchAndAnalyze() {
  logger.info('=== 演示获取和分析所有池数据 ===');
  
  try {
    // 初始化连接
    const connection = initConnection();
    
    // 获取所有池数据
    logger.info('获取所有池数据...');
    const poolsData = await fetchAllPools(connection);
    
    logger.info(`成功获取池数据: API ${poolsData.apiPools.length}个, SDK ${poolsData.sdkPools.length}个, RPC ${poolsData.rpcPools.length}个`);
    
    // 分析池数据
    logger.info('分析池数据...');
    const analyzedPools = analyzePools(poolsData);
    
    logger.info(`分析完成，共 ${analyzedPools.length} 个池`);
    
    // 筛选高活跃度池
    logger.info('筛选高活跃度池...');
    const highActivityPools = filterHighActivityPools(analyzedPools);
    
    logger.info(`找到 ${highActivityPools.length} 个高活跃度池`);
    
    // 识别最佳池
    logger.info('识别最佳池...');
    const bestPools = identifyBestPoolsPerPair(analyzedPools);
    
    logger.info(`找到 ${bestPools.length} 个最佳池`);
    
    // 保存数据
    logger.info('保存数据...');
    await savePools(analyzedPools);
    await saveHighActivityPools(highActivityPools);
    await saveBestPools(bestPools);
    
    logger.info('数据保存完成');
    
    // 打印部分结果
    if (bestPools.length > 0) {
      logger.info('前 3 个最佳池:');
      bestPools.slice(0, 3).forEach((pool, index) => {
        logger.info(`${index + 1}. ${pool.tokenXSymbol || '未知'}-${pool.tokenYSymbol || '未知'} (得分: ${pool.score?.toFixed(2) || 'N/A'}, APR: ${pool.riskAdjustedAPR?.toFixed(2) || 'N/A'}%)`);
      });
    }
  } catch (error) {
    logger.error('演示失败', { error: error.message, stack: error.stack });
  }
}

/**
 * 演示获取特定池的详细信息
 */
async function demoGetPoolDetails() {
  logger.info('=== 演示获取特定池的详细信息 ===');
  
  try {
    // 初始化连接
    const connection = initConnection();
    
    // USDC-USDT 池地址
    const poolAddress = 'ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq';
    
    logger.info(`获取池 ${poolAddress} 的详细信息...`);
    const poolDetails = await getPoolByAddress(connection, poolAddress);
    
    logger.info(`成功获取池详细信息，来源: ${poolDetails.source}`);
    
    // 打印部分结果
    if (poolDetails.activeBin) {
      logger.info(`活跃 Bin ID: ${poolDetails.activeBin.id}`);
      logger.info(`活跃 Bin 价格: ${poolDetails.activeBin.price?.toString() || 'N/A'}`);
    }
    
    if (poolDetails.binsAroundActive) {
      logger.info(`获取到 ${poolDetails.binsAroundActive.length} 个 Bin 的流动性分布`);
    }
  } catch (error) {
    logger.error('演示失败', { error: error.message, stack: error.stack });
  }
}

/**
 * 演示监控池数据变化
 */
async function demoMonitorPools() {
  logger.info('=== 演示监控池数据变化 ===');
  
  try {
    // 初始化连接
    const connection = initConnection();
    
    // 要监控的池地址
    const poolAddresses = [
      'ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq', // USDC-USDT
      'HyGVZdFM6hqdxQQX3e3BQ5PJWWNcK7CFK3LbcP1XvG9Y'  // SOL-USDC
    ];
    
    logger.info(`开始监控 ${poolAddresses.length} 个池...`);
    
    // 启动监控
    const monitor = monitorPools(connection, poolAddresses, {
      interval: 30000, // 30 秒
      onUpdate: (poolData, previousData, updateType, changes) => {
        if (updateType === 'initial') {
          logger.info(`初始化池 ${poolData.address} 数据`);
        } else if (updateType === 'update') {
          logger.info(`池 ${poolData.address} 数据变化: ${changes.length} 个字段`);
          changes.forEach(change => {
            logger.info(`  - ${change.field}: ${change.previous} -> ${change.current}`);
          });
        }
      }
    });
    
    // 运行 2 分钟后停止
    logger.info('监控将运行 2 分钟...');
    await sleep(120000);
    
    monitor.stop();
    logger.info('监控已停止');
  } catch (error) {
    logger.error('演示失败', { error: error.message, stack: error.stack });
  }
}

/**
 * 演示监控特定池的 bin 变化
 */
async function demoMonitorPoolBins() {
  logger.info('=== 演示监控特定池的 bin 变化 ===');
  
  try {
    // 初始化连接
    const connection = initConnection();
    
    // USDC-USDT 池地址
    const poolAddress = 'ARwi1S4DaiTG5DX7S4M4ZsrXqpMD1MrTmbu9ue2tpmEq';
    
    logger.info(`开始监控池 ${poolAddress} 的 bin 变化...`);
    
    // 启动监控
    const monitor = monitorPoolBins(connection, poolAddress, {
      interval: 10000, // 10 秒
      binRange: 5,     // 监控活跃 bin 周围 5 个 bin
      onUpdate: (updateData) => {
        if (updateData.type === 'activeBinChange') {
          logger.info(`活跃 bin 变化: ${updateData.previous.id} -> ${updateData.current.id}`);
        } else if (updateData.type === 'binLiquidityChange') {
          logger.info(`bin 流动性变化: ${updateData.changes.length} 个 bin`);
          updateData.changes.slice(0, 3).forEach(change => {
            logger.info(`  - Bin ${change.binId}: ${change.type || '流动性变化'}`);
          });
        }
      }
    });
    
    // 运行 2 分钟后停止
    logger.info('监控将运行 2 分钟...');
    await sleep(120000);
    
    monitor.stop();
    logger.info('监控已停止');
  } catch (error) {
    logger.error('演示失败', { error: error.message, stack: error.stack });
  }
}

/**
 * 演示完整的数据采集和分析流程
 */
async function demoCollectAndAnalyze() {
  logger.info('=== 演示完整的数据采集和分析流程 ===');
  
  try {
    logger.info('开始数据采集和分析...');
    const result = await collectAndAnalyzeData();
    
    logger.info('数据采集和分析完成', result);
  } catch (error) {
    logger.error('演示失败', { error: error.message, stack: error.stack });
  }
}

/**
 * 演示启动定时数据采集任务
 */
async function demoStartDataCollectionTask() {
  logger.info('=== 演示启动定时数据采集任务 ===');
  
  try {
    logger.info('启动定时数据采集任务...');
    const task = startDataCollectionTask(300000); // 5 分钟
    
    // 运行 10 分钟后停止
    logger.info('任务将运行 10 分钟...');
    await sleep(600000);
    
    task.stop();
    logger.info('任务已停止');
  } catch (error) {
    logger.error('演示失败', { error: error.message, stack: error.stack });
  }
}

/**
 * 主函数
 */
async function main() {
  logger.info('开始 Meteora DLMM 数据服务示例');
  
  // 根据命令行参数选择要运行的演示
  const demo = process.argv[2] || 'all';
  
  if (demo === 'fetch' || demo === 'all') {
    await demoFetchAndAnalyze();
  }
  
  if (demo === 'details' || demo === 'all') {
    await demoGetPoolDetails();
  }
  
  if (demo === 'monitor' || demo === 'all') {
    await demoMonitorPools();
  }
  
  if (demo === 'bins' || demo === 'all') {
    await demoMonitorPoolBins();
  }
  
  if (demo === 'collect' || demo === 'all') {
    await demoCollectAndAnalyze();
  }
  
  if (demo === 'task' || demo === 'all') {
    await demoStartDataCollectionTask();
  }
  
  logger.info('Meteora DLMM 数据服务示例结束');
}

// 运行主函数
main().catch(error => {
  logger.error('程序执行失败', { error: error.message, stack: error.stack });
  process.exit(1);
}); 