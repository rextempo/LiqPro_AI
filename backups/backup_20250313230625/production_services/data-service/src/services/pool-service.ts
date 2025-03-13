/**
 * Meteora 池数据服务
 */

import { Pool, IPool } from '../models/pool';
import logger from '../utils/logger';

/**
 * 更新或创建池数据
 * @param poolData 池数据
 */
export async function upsertPoolData(poolData: Partial<IPool>): Promise<void> {
  try {
    const now = new Date();
    const historyEntry = {
      timestamp: now,
      liquidity: poolData.liquidity,
      volume24h: poolData.volume24h,
      currentPrice: poolData.currentPrice,
      reserves: poolData.reserves,
      fees: {
        total24h: poolData.fees?.total24h,
      },
      yields: {
        apr: poolData.yields?.apr,
        feesToTVL: poolData.yields?.feesToTVL,
        feesToTVLPercent: poolData.yields?.feesToTVLPercent,
      },
    };

    await Pool.findOneAndUpdate(
      { address: poolData.address },
      {
        $set: {
          ...poolData,
          updatedAt: now,
        },
        $push: { history: historyEntry },
        $setOnInsert: {
          createdAt: now,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`已更新池数据: ${poolData.address}`);
  } catch (error) {
    logger.error(`更新池数据失败: ${poolData.address}`, { error });
    throw error;
  }
}

/**
 * 获取所有池数据
 * @param limit 限制返回数量
 * @param skip 跳过数量
 */
export async function getAllPools(limit = 100, skip = 0): Promise<IPool[]> {
  try {
    return await Pool.find()
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    logger.error('获取所有池数据失败', { error });
    throw error;
  }
}

/**
 * 获取特定池数据
 * @param address 池地址
 */
export async function getPoolByAddress(address: string): Promise<IPool | null> {
  try {
    return await Pool.findOne({ address });
  } catch (error) {
    logger.error(`获取池数据失败: ${address}`, { error });
    throw error;
  }
}

/**
 * 获取高活跃度池
 * @param limit 限制返回数量
 */
export async function getHighActivityPools(limit = 10): Promise<IPool[]> {
  try {
    return await Pool.find()
      .sort({ volume24h: -1 })
      .limit(limit);
  } catch (error) {
    logger.error('获取高活跃度池失败', { error });
    throw error;
  }
}

/**
 * 获取最佳收益率池
 * @param limit 限制返回数量
 */
export async function getBestYieldPools(limit = 10): Promise<IPool[]> {
  try {
    return await Pool.find()
      .sort({ 'yields.apr': -1 })
      .limit(limit);
  } catch (error) {
    logger.error('获取最佳收益率池失败', { error });
    throw error;
  }
}

/**
 * 获取池历史数据
 * @param address 池地址
 * @param startTime 开始时间
 * @param endTime 结束时间
 */
export async function getPoolHistory(
  address: string,
  startTime: Date,
  endTime: Date
): Promise<IPool[]> {
  try {
    return await Pool.find({
      address,
      'history.timestamp': {
        $gte: startTime,
        $lte: endTime,
      },
    });
  } catch (error) {
    logger.error(`获取池历史数据失败: ${address}`, { error });
    throw error;
  }
}

/**
 * 清理旧历史数据
 * @param daysToKeep 保留天数
 */
export async function cleanupOldHistory(daysToKeep: number): Promise<void> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    await Pool.updateMany(
      {},
      {
        $pull: {
          history: {
            timestamp: { $lt: cutoffDate },
          },
        },
      }
    );

    logger.info(`已清理 ${daysToKeep} 天前的历史数据`);
  } catch (error) {
    logger.error('清理旧历史数据失败', { error });
    throw error;
  }
} 