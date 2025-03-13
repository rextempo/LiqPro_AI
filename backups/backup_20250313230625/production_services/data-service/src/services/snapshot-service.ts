/**
 * 池数据快照服务
 * 负责生成和查询不同时间粒度的池数据快照
 */

import { HourlySnapshot, DailySnapshot, WeeklySnapshot } from '../models/pool-snapshots';
import { Pool, IPool } from '../models/pool';
import logger from '../utils/logger';

/**
 * 生成小时快照
 * @param poolAddress 池地址
 * @param currentData 当前池数据
 */
export async function generateHourlySnapshot(poolAddress: string, currentData: IPool): Promise<void> {
  try {
    const now = new Date();
    const hour = now.getUTCHours();
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1; // 月份从0开始
    const year = now.getUTCFullYear();

    // 获取上一小时的快照
    const previousHour = new Date(now);
    previousHour.setUTCHours(previousHour.getUTCHours() - 1);
    const prevHourSnapshot = await HourlySnapshot.findOne({
      poolAddress,
      year: previousHour.getUTCFullYear(),
      month: previousHour.getUTCMonth() + 1,
      day: previousHour.getUTCDate(),
      hour: previousHour.getUTCHours(),
    });

    // 计算变化率
    const liquidity_change_1h = prevHourSnapshot 
      ? (currentData.liquidity - prevHourSnapshot.liquidity) / prevHourSnapshot.liquidity 
      : 0;
    
    const price_change_1h = prevHourSnapshot 
      ? (currentData.currentPrice - prevHourSnapshot.currentPrice) / prevHourSnapshot.currentPrice 
      : 0;
    
    // 假设我们有小时交易量数据，这里使用24小时交易量除以24作为估计
    const hourlyVolume = currentData.volume24h / 24;
    const volume_change_1h = prevHourSnapshot && prevHourSnapshot.volume > 0
      ? (hourlyVolume - prevHourSnapshot.volume) / prevHourSnapshot.volume
      : 0;
    
    // 计算效率指标
    const fee_to_volume_ratio = hourlyVolume > 0 
      ? (currentData.fees.total24h / 24) / hourlyVolume 
      : 0;
    
    const capital_efficiency = currentData.liquidity > 0 
      ? hourlyVolume / currentData.liquidity 
      : 0;

    // 创建或更新小时快照
    await HourlySnapshot.findOneAndUpdate(
      {
        poolAddress,
        year,
        month,
        day,
        hour,
      },
      {
        $set: {
          timestamp: now,
          liquidity: currentData.liquidity,
          currentPrice: currentData.currentPrice,
          reserves: {
            tokenA: currentData.reserves.tokenA,
            tokenB: currentData.reserves.tokenB,
          },
          fees: currentData.fees.total24h / 24, // 估计小时费用
          volume: hourlyVolume,
          apr: currentData.yields.apr,
          feesToTVL: currentData.yields.feesToTVL,
          liquidity_change_1h,
          price_change_1h,
          volume_change_1h,
          fee_to_volume_ratio,
          capital_efficiency,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`已生成池 ${poolAddress} 的小时快照`);
  } catch (error) {
    logger.error(`生成池 ${poolAddress} 的小时快照失败`, { error });
    throw error;
  }
}

/**
 * 生成日快照
 * @param poolAddress 池地址
 */
export async function generateDailySnapshot(poolAddress: string): Promise<void> {
  try {
    const now = new Date();
    const day = now.getUTCDate();
    const month = now.getUTCMonth() + 1;
    const year = now.getUTCFullYear();

    // 获取当前池数据
    const poolData = await Pool.findOne({ address: poolAddress });
    if (!poolData) {
      logger.error(`找不到池数据: ${poolAddress}`);
      return;
    }

    // 获取24小时内的小时快照
    const last24Hours = new Date(now);
    last24Hours.setUTCHours(last24Hours.getUTCHours() - 24);
    
    const hourlySnapshots = await HourlySnapshot.find({
      poolAddress,
      timestamp: { $gte: last24Hours },
    }).sort({ timestamp: 1 });

    if (hourlySnapshots.length === 0) {
      logger.warn(`没有足够的小时快照来生成日快照: ${poolAddress}`);
      return;
    }

    // 获取前一天的快照
    const previousDay = new Date(now);
    previousDay.setUTCDate(previousDay.getUTCDate() - 1);
    const prevDaySnapshot = await DailySnapshot.findOne({
      poolAddress,
      year: previousDay.getUTCFullYear(),
      month: previousDay.getUTCMonth() + 1,
      day: previousDay.getUTCDate(),
    });

    // 计算变化率
    const liquidity_change_24h = prevDaySnapshot 
      ? (poolData.liquidity - prevDaySnapshot.liquidity) / prevDaySnapshot.liquidity 
      : 0;
    
    const price_change_24h = prevDaySnapshot 
      ? (poolData.currentPrice - prevDaySnapshot.currentPrice) / prevDaySnapshot.currentPrice 
      : 0;
    
    const volume_change_24h = prevDaySnapshot && prevDaySnapshot.volume > 0
      ? (poolData.volume24h - prevDaySnapshot.volume) / prevDaySnapshot.volume
      : 0;

    // 计算价格波动性 (24小时标准差/平均价格)
    const prices = hourlySnapshots.map(snapshot => snapshot.currentPrice);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceVariance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const priceStdDev = Math.sqrt(priceVariance);
    const price_volatility_24h = avgPrice > 0 ? priceStdDev / avgPrice : 0;

    // 计算效率指标
    const fee_apy = poolData.liquidity > 0 
      ? (poolData.fees.total24h * 365) / poolData.liquidity 
      : 0;
    
    const capital_efficiency_24h = poolData.liquidity > 0 
      ? poolData.volume24h / poolData.liquidity 
      : 0;

    // 创建或更新日快照
    await DailySnapshot.findOneAndUpdate(
      {
        poolAddress,
        year,
        month,
        day,
      },
      {
        $set: {
          timestamp: now,
          liquidity: poolData.liquidity,
          currentPrice: poolData.currentPrice,
          reserves: {
            tokenA: poolData.reserves.tokenA,
            tokenB: poolData.reserves.tokenB,
          },
          fees: poolData.fees.total24h,
          volume: poolData.volume24h,
          apr: poolData.yields.apr,
          feesToTVL: poolData.yields.feesToTVL,
          liquidity_change_24h,
          price_change_24h,
          volume_change_24h,
          price_volatility_24h,
          fee_apy,
          capital_efficiency_24h,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`已生成池 ${poolAddress} 的日快照`);
  } catch (error) {
    logger.error(`生成池 ${poolAddress} 的日快照失败`, { error });
    throw error;
  }
}

/**
 * 生成周快照
 * @param poolAddress 池地址
 */
export async function generateWeeklySnapshot(poolAddress: string): Promise<void> {
  try {
    const now = new Date();
    // 获取当前是一年中的第几周
    const startOfYear = new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
    const week = Math.ceil((((now.getTime() - startOfYear.getTime()) / 86400000) + startOfYear.getUTCDay() + 1) / 7);
    const year = now.getUTCFullYear();

    // 获取当前池数据
    const poolData = await Pool.findOne({ address: poolAddress });
    if (!poolData) {
      logger.error(`找不到池数据: ${poolAddress}`);
      return;
    }

    // 获取过去7天的日快照
    const last7Days = new Date(now);
    last7Days.setUTCDate(last7Days.getUTCDate() - 7);
    
    const dailySnapshots = await DailySnapshot.find({
      poolAddress,
      timestamp: { $gte: last7Days },
    }).sort({ timestamp: 1 });

    if (dailySnapshots.length === 0) {
      logger.warn(`没有足够的日快照来生成周快照: ${poolAddress}`);
      return;
    }

    // 获取上一周的快照
    const previousWeek = new Date(now);
    previousWeek.setUTCDate(previousWeek.getUTCDate() - 7);
    // 计算上一周是一年中的第几周
    const startOfPrevYear = new Date(Date.UTC(previousWeek.getUTCFullYear(), 0, 1));
    const prevWeek = Math.ceil((((previousWeek.getTime() - startOfPrevYear.getTime()) / 86400000) + startOfPrevYear.getUTCDay() + 1) / 7);
    const prevYear = previousWeek.getUTCFullYear();
    
    const prevWeekSnapshot = await WeeklySnapshot.findOne({
      poolAddress,
      year: prevYear,
      week: prevWeek,
    });

    // 计算变化率
    const liquidity_change_7d = prevWeekSnapshot 
      ? (poolData.liquidity - prevWeekSnapshot.liquidity) / prevWeekSnapshot.liquidity 
      : 0;
    
    const price_change_7d = prevWeekSnapshot 
      ? (poolData.currentPrice - prevWeekSnapshot.currentPrice) / prevWeekSnapshot.currentPrice 
      : 0;
    
    // 计算7天总交易量 (假设我们有每日交易量)
    const volume7d = dailySnapshots.reduce((sum, snapshot) => sum + snapshot.volume, 0);
    
    const volume_change_7d = prevWeekSnapshot && prevWeekSnapshot.volume > 0
      ? (volume7d - prevWeekSnapshot.volume) / prevWeekSnapshot.volume
      : 0;

    // 计算价格波动性 (7天标准差/平均价格)
    const prices = dailySnapshots.map(snapshot => snapshot.currentPrice);
    const avgPrice = prices.reduce((sum, price) => sum + price, 0) / prices.length;
    const priceVariance = prices.reduce((sum, price) => sum + Math.pow(price - avgPrice, 2), 0) / prices.length;
    const priceStdDev = Math.sqrt(priceVariance);
    const price_volatility_7d = avgPrice > 0 ? priceStdDev / avgPrice : 0;

    // 计算流动性稳定性 (变异系数 = 标准差/平均值)
    const liquidities = dailySnapshots.map(snapshot => snapshot.liquidity);
    const avgLiquidity = liquidities.reduce((sum, liq) => sum + liq, 0) / liquidities.length;
    const liquidityVariance = liquidities.reduce((sum, liq) => sum + Math.pow(liq - avgLiquidity, 2), 0) / liquidities.length;
    const liquidityStdDev = Math.sqrt(liquidityVariance);
    const liquidity_stability = avgLiquidity > 0 ? 1 - (liquidityStdDev / avgLiquidity) : 0; // 转换为稳定性指标，越高越稳定

    // 计算7天平均资本效率
    const avg_capital_efficiency_7d = dailySnapshots.reduce((sum, snapshot) => {
      return sum + (snapshot.volume / snapshot.liquidity);
    }, 0) / dailySnapshots.length;

    // 创建或更新周快照
    await WeeklySnapshot.findOneAndUpdate(
      {
        poolAddress,
        year,
        week,
      },
      {
        $set: {
          timestamp: now,
          liquidity: poolData.liquidity,
          currentPrice: poolData.currentPrice,
          reserves: {
            tokenA: poolData.reserves.tokenA,
            tokenB: poolData.reserves.tokenB,
          },
          fees: dailySnapshots.reduce((sum, snapshot) => sum + snapshot.fees, 0), // 7天总费用
          volume: volume7d,
          apr: poolData.yields.apr,
          feesToTVL: poolData.yields.feesToTVL,
          liquidity_change_7d,
          price_change_7d,
          volume_change_7d,
          price_volatility_7d,
          liquidity_stability,
          avg_capital_efficiency_7d,
        },
      },
      { upsert: true, new: true }
    );

    logger.info(`已生成池 ${poolAddress} 的周快照`);
  } catch (error) {
    logger.error(`生成池 ${poolAddress} 的周快照失败`, { error });
    throw error;
  }
}

/**
 * 获取池的小时快照
 * @param poolAddress 池地址
 * @param limit 限制返回数量
 * @param skip 跳过数量
 */
export async function getHourlySnapshots(poolAddress: string, limit = 24, skip = 0) {
  try {
    return await HourlySnapshot.find({ poolAddress })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    logger.error(`获取池 ${poolAddress} 的小时快照失败`, { error });
    throw error;
  }
}

/**
 * 获取池的日快照
 * @param poolAddress 池地址
 * @param limit 限制返回数量
 * @param skip 跳过数量
 */
export async function getDailySnapshots(poolAddress: string, limit = 30, skip = 0) {
  try {
    return await DailySnapshot.find({ poolAddress })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    logger.error(`获取池 ${poolAddress} 的日快照失败`, { error });
    throw error;
  }
}

/**
 * 获取池的周快照
 * @param poolAddress 池地址
 * @param limit 限制返回数量
 * @param skip 跳过数量
 */
export async function getWeeklySnapshots(poolAddress: string, limit = 12, skip = 0) {
  try {
    return await WeeklySnapshot.find({ poolAddress })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit);
  } catch (error) {
    logger.error(`获取池 ${poolAddress} 的周快照失败`, { error });
    throw error;
  }
}

/**
 * 清理旧快照数据
 * @param hoursToKeep 保留小时快照的小时数
 * @param daysToKeep 保留日快照的天数
 * @param weeksToKeep 保留周快照的周数
 */
export async function cleanupOldSnapshots(hoursToKeep = 168, daysToKeep = 90, weeksToKeep = 52): Promise<void> {
  try {
    const hourCutoff = new Date();
    hourCutoff.setUTCHours(hourCutoff.getUTCHours() - hoursToKeep);
    
    const dayCutoff = new Date();
    dayCutoff.setUTCDate(dayCutoff.getUTCDate() - daysToKeep);
    
    const weekCutoff = new Date();
    weekCutoff.setUTCDate(weekCutoff.getUTCDate() - (weeksToKeep * 7));

    await HourlySnapshot.deleteMany({ timestamp: { $lt: hourCutoff } });
    await DailySnapshot.deleteMany({ timestamp: { $lt: dayCutoff } });
    await WeeklySnapshot.deleteMany({ timestamp: { $lt: weekCutoff } });

    logger.info(`已清理旧快照数据: ${hoursToKeep}小时前的小时快照, ${daysToKeep}天前的日快照, ${weeksToKeep}周前的周快照`);
  } catch (error) {
    logger.error('清理旧快照数据失败', { error });
    throw error;
  }
} 