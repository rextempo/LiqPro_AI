/**
 * Meteora DLMM 数据服务模块
 * 
 * 该模块提供了与 Meteora DLMM 池交互的功能
 */

// 导入meteora模块
import * as meteora from './meteora';

// 导入本地logger
import logger from '../utils/logger';
import { MeteoraPoolCollector } from './pool-collector';
import { upsertPoolData } from '../services/pool-service';
import { 
  generateHourlySnapshot, 
  generateDailySnapshot, 
  generateWeeklySnapshot,
  cleanupOldSnapshots
} from '../services/snapshot-service';
import { Pool } from '../models/pool';

// 导出meteora模块
export default meteora;

let dataCollectionTask: NodeJS.Timeout | null = null;
let snapshotGenerationTask: NodeJS.Timeout | null = null;

/**
 * 启动数据收集任务
 * @param interval 收集间隔（毫秒）
 */
export function startDataCollectionTask(interval: number): { stop: () => void } {
  if (dataCollectionTask) {
    logger.warn('数据收集任务已在运行中');
    return { stop: () => {} };
  }

  const collector = new MeteoraPoolCollector(process.env.SOLANA_RPC_ENDPOINT || 'https://api.mainnet-beta.solana.com');

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
          const poolInfo = await collector.getPoolInfo(address, true);
          
          // 转换数据格式并存储
          const poolData = {
            address,
            tokenA: poolInfo.tokenX.symbol,
            tokenB: poolInfo.tokenY.symbol,
            tokenAAddress: poolInfo.tokenX.mint.toString(),
            tokenBAddress: poolInfo.tokenY.mint.toString(),
            feeTier: poolInfo.fee,
            binStep: poolInfo.binStep,
            liquidity: poolInfo.totalLiquidity.toNumber(),
            volume24h: poolInfo.volume24h || 0,
            currentPrice: poolInfo.price,
            status: 'enabled',
            reserves: {
              tokenA: poolInfo.reserveX.toNumber(),
              tokenB: poolInfo.reserveY.toNumber(),
            },
            fees: {
              base: poolInfo.fee,
              max: poolInfo.maxFee,
              total24h: poolInfo.fees24h || 0,
            },
            volumeHistory: {
              cumulative: poolInfo.volumeCumulative || 0,
              fees: poolInfo.feesCumulative || 0,
            },
            yields: {
              apr: poolInfo.apr || 0,
              feesToTVL: poolInfo.feesToTVL || 0,
              feesToTVLPercent: poolInfo.feesToTVLPercent || 0,
            },
            tags: [],
            name: `${poolInfo.tokenX.symbol}-${poolInfo.tokenY.symbol}`,
          };
          
          await upsertPoolData(poolData);
          
          // 生成小时快照
          const pool = await Pool.findOne({ address });
          if (pool) {
            await generateHourlySnapshot(address, pool);
          }

          logger.info(`已更新池数据: ${address}`);
        } catch (error) {
          logger.error(`更新池数据失败: ${address}`, { error });
        }
      }

      logger.info('Meteora 池数据收集完成');
    } catch (error) {
      logger.error('Meteora 池数据收集失败', { error });
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
function startSnapshotGenerationTask(): void {
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
                await cleanupOldSnapshots();
              }
            }
          }
        } catch (error) {
          logger.error(`生成池 ${pool.address} 的快照失败`, { error });
        }
      }
    } catch (error) {
      logger.error('快照生成任务失败', { error });
    }
  }, ONE_HOUR);
  
  logger.info('已启动快照生成任务');
}
