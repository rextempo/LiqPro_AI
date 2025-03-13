/**
 * Meteora DLMM 数据服务模块
 * 
 * 该模块提供了与 Meteora DLMM 池交互的功能，包括数据收集和快照生成
 */

const { createEnhancedPoolCollector } = require('./pool-collector');
const logger = require('../utils/logger');
const { 
  generateDailySnapshot, 
  generateWeeklySnapshot,
  cleanupOldSnapshots
} = require('../services/snapshot-service');
const { Pool } = require('../models/pool');

let dataCollectionTask = null;
let snapshotGenerationTask = null;

/**
 * 启动数据收集任务
 * @param {number} interval 收集间隔（毫秒）
 * @returns {Object} 包含停止方法的对象
 */
function startDataCollectionTask(interval) {
  if (dataCollectionTask) {
    logger.warn('数据收集任务已在运行中');
    return { stop: () => {} };
  }

  const collector = createEnhancedPoolCollector(
    process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com'
  );

  // 定义要监控的池地址列表
  const poolAddresses = [
    'BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y', // SOL-USDC
    // 添加其他池地址...
  ];

  // 定期收集数据
  dataCollectionTask = setInterval(async () => {
    try {
      logger.info('开始收集 Meteora 池数据');
      
      for (const address of poolAddresses) {
        try {
          // 获取池信息并生成小时快照
          await collector.getPoolInfoWithSnapshot(address, true, true);
          logger.info(`已更新池数据: ${address}`);
        } catch (error) {
          logger.error(`更新池数据失败: ${address}`, { error: error.message });
        }
      }

      logger.info('Meteora 池数据收集完成');
    } catch (error) {
      logger.error('Meteora 池数据收集失败', { error: error.message });
    }
  }, interval);

  // 启动快照生成任务
  startSnapshotGenerationTask();

  return {
    stop: () => {
      if (dataCollectionTask) {
        clearInterval(dataCollectionTask);
        dataCollectionTask = null;
        logger.info('已停止 Meteora 池数据收集任务');
      }
      
      if (snapshotGenerationTask) {
        clearInterval(snapshotGenerationTask);
        snapshotGenerationTask = null;
        logger.info('已停止快照生成任务');
      }
    },
  };
}

/**
 * 启动快照生成任务
 */
function startSnapshotGenerationTask() {
  if (snapshotGenerationTask) {
    return;
  }

  // 每小时执行一次
  const ONE_HOUR = 60 * 60 * 1000;
  
  snapshotGenerationTask = setInterval(async () => {
    try {
      const now = new Date();
      const pools = await Pool.find();
      
      for (const pool of pools) {
        try {
          // 每天0点生成日快照
          if (now.getUTCHours() === 0) {
            await generateDailySnapshot(pool.address);
            
            // 每周一生成周快照
            if (now.getUTCDay() === 1) {
              await generateWeeklySnapshot(pool.address);
              
              // 每月1日清理旧数据
              if (now.getUTCDate() === 1) {
                await cleanupOldSnapshots(
                  parseInt(process.env.HOURLY_SNAPSHOTS_TO_KEEP || '168'),
                  parseInt(process.env.DAILY_SNAPSHOTS_TO_KEEP || '90'),
                  parseInt(process.env.WEEKLY_SNAPSHOTS_TO_KEEP || '52')
                );
              }
            }
          }
        } catch (error) {
          logger.error(`生成池 ${pool.address} 的快照失败`, { error: error.message });
        }
      }
    } catch (error) {
      logger.error('快照生成任务失败', { error: error.message });
    }
  }, ONE_HOUR);
  
  logger.info('已启动快照生成任务');
}

module.exports = {
  startDataCollectionTask
}; 