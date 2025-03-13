/**
 * 市场分析模块
 * 
 * 该模块负责分析 Meteora DLMM 池的市场数据，包括价格趋势、流动性分布、交易量模式和相关池关联分析
 */

import { logger } from '../../utils/logger.js';
import { config } from '../../config.js';

// 导入数据服务功能
import {
  getPoolTransactions,
  getPoolLiquidity,
  getPoolPrice,
  getPoolVolume
} from '../../meteora/index.js';

/**
 * 分析价格趋势
 * 
 * @param {Array} pools - 池数据数组
 * @param {Connection} connection - Solana 连接实例
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 价格趋势分析结果
 */
export async function analyzePriceTrend(pools, connection, options = {}) {
  logger.info('开始分析价格趋势');
  
  try {
    const trends = await Promise.all(pools.map(async (pool) => {
      // 获取历史价格数据
      const priceHistory = await getPoolPrice(pool.address, connection, {
        interval: options.interval || '1h',
        limit: options.limit || 168 // 默认7天的小时数据
      });
      
      // 计算价格变化率
      const priceChanges = calculatePriceChanges(priceHistory);
      
      // 识别趋势
      const trend = identifyTrend(priceChanges);
      
      // 计算波动性指标
      const volatility = calculateVolatility(priceChanges);
      
      return {
        poolAddress: pool.address,
        tokenPair: `${pool.tokenX}/${pool.tokenY}`,
        trend,
        volatility,
        priceChanges,
        lastUpdate: new Date().toISOString()
      };
    }));
    
    logger.info(`完成 ${trends.length} 个池的价格趋势分析`);
    
    return {
      trends,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('价格趋势分析失败', { error: error.message });
    throw error;
  }
}

/**
 * 分析流动性分布
 * 
 * @param {Array} pools - 池数据数组
 * @param {Connection} connection - Solana 连接实例
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 流动性分布分析结果
 */
export async function analyzeLiquidityDistribution(pools, connection, options = {}) {
  logger.info('开始分析流动性分布');
  
  try {
    const distributions = await Promise.all(pools.map(async (pool) => {
      // 获取流动性数据
      const liquidityData = await getPoolLiquidity(pool.address, connection);
      
      // 分析流动性集中度
      const concentration = analyzeLiquidityConcentration(liquidityData);
      
      // 识别流动性缺口
      const gaps = identifyLiquidityGaps(liquidityData);
      
      // 评估流动性稳定性
      const stability = assessLiquidityStability(liquidityData);
      
      return {
        poolAddress: pool.address,
        tokenPair: `${pool.tokenX}/${pool.tokenY}`,
        concentration,
        gaps,
        stability,
        lastUpdate: new Date().toISOString()
      };
    }));
    
    logger.info(`完成 ${distributions.length} 个池的流动性分布分析`);
    
    return {
      distributions,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('流动性分布分析失败', { error: error.message });
    throw error;
  }
}

/**
 * 分析交易量模式
 * 
 * @param {Array} pools - 池数据数组
 * @param {Connection} connection - Solana 连接实例
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 交易量模式分析结果
 */
export async function analyzeVolumePattern(pools, connection, options = {}) {
  logger.info('开始分析交易量模式');
  
  try {
    const patterns = await Promise.all(pools.map(async (pool) => {
      // 获取交易量数据
      const volumeData = await getPoolVolume(pool.address, connection, {
        interval: options.interval || '1h',
        limit: options.limit || 168
      });
      
      // 分析交易量趋势
      const volumeTrend = analyzeVolumeTrend(volumeData);
      
      // 识别交易量异常
      const anomalies = detectVolumeAnomalies(volumeData);
      
      // 评估交易活跃度
      const activity = assessTradingActivity(volumeData);
      
      return {
        poolAddress: pool.address,
        tokenPair: `${pool.tokenX}/${pool.tokenY}`,
        volumeTrend,
        anomalies,
        activity,
        lastUpdate: new Date().toISOString()
      };
    }));
    
    logger.info(`完成 ${patterns.length} 个池的交易量模式分析`);
    
    return {
      patterns,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('交易量模式分析失败', { error: error.message });
    throw error;
  }
}

/**
 * 查找相关池
 * 
 * @param {Array} pools - 池数据数组
 * @param {Connection} connection - Solana 连接实例
 * @param {Object} options - 分析选项
 * @returns {Promise<Object>} 相关池分析结果
 */
export async function findRelatedPools(pools, connection, options = {}) {
  logger.info('开始分析相关池');
  
  try {
    const relatedPools = new Map();
    
    for (const pool of pools) {
      // 查找共享代币的池
      const sharedTokenPools = pools.filter(p => 
        p.address !== pool.address && 
        (p.tokenX === pool.tokenX || p.tokenX === pool.tokenY ||
         p.tokenY === pool.tokenX || p.tokenY === pool.tokenY)
      );
      
      // 分析价格相关性
      const correlations = await analyzeCorrelations(pool, sharedTokenPools, connection);
      
      // 识别套利机会
      const arbitrageOpportunities = identifyArbitrage(pool, sharedTokenPools, correlations);
      
      relatedPools.set(pool.address, {
        poolAddress: pool.address,
        tokenPair: `${pool.tokenX}/${pool.tokenY}`,
        correlations,
        arbitrageOpportunities,
        lastUpdate: new Date().toISOString()
      });
    }
    
    logger.info(`完成 ${pools.length} 个池的相关性分析`);
    
    return {
      relatedPools: Object.fromEntries(relatedPools),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error('相关池分析失败', { error: error.message });
    throw error;
  }
}

// 辅助函数

function calculatePriceChanges(priceHistory) {
  if (!priceHistory || !Array.isArray(priceHistory) || priceHistory.length < 2) {
    return {
      changes: [],
      statistics: {
        mean: 0,
        median: 0,
        stdDev: 0
      }
    };
  }

  // 计算价格变化率
  const changes = priceHistory.slice(1).map((price, index) => {
    const prevPrice = priceHistory[index];
    const change = ((price - prevPrice) / prevPrice) * 100;
    return {
      timestamp: new Date().toISOString(),
      price,
      prevPrice,
      changePercent: change
    };
  });

  // 计算基本统计数据
  const changeValues = changes.map(c => c.changePercent);
  const mean = changeValues.reduce((a, b) => a + b, 0) / changeValues.length;
  const sortedChanges = [...changeValues].sort((a, b) => a - b);
  const median = sortedChanges[Math.floor(sortedChanges.length / 2)];
  const variance = changeValues.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / changeValues.length;
  const stdDev = Math.sqrt(variance);

  return {
    changes,
    statistics: {
      mean,
      median,
      stdDev
    }
  };
}

function identifyTrend(priceChanges) {
  if (!priceChanges || !priceChanges.changes || priceChanges.changes.length === 0) {
    return {
      trend: 'NEUTRAL',
      strength: 0,
      reliability: 0
    };
  }

  const { changes, statistics } = priceChanges;
  const recentChanges = changes.slice(-24); // 使用最近24小时的数据

  // 计算趋势指标
  const ema12 = calculateEMA(recentChanges.map(c => c.price), 12);
  const ema24 = calculateEMA(recentChanges.map(c => c.price), 24);
  const macdLine = ema12[ema12.length - 1] - ema24[ema24.length - 1];

  // 计算RSI
  const rsi = calculateRSI(recentChanges.map(c => c.changePercent));

  // 确定趋势
  let trend = 'NEUTRAL';
  if (macdLine > 0 && rsi > 50) {
    trend = 'UPWARD';
  } else if (macdLine < 0 && rsi < 50) {
    trend = 'DOWNWARD';
  }

  // 计算趋势强度
  const strength = Math.min(100, Math.abs(macdLine) * 10 + Math.abs(rsi - 50));

  // 计算可靠性
  const reliability = calculateTrendReliability(changes, statistics);

  return {
    trend,
    strength,
    reliability,
    indicators: {
      macd: macdLine,
      rsi,
      ema: {
        short: ema12[ema12.length - 1],
        long: ema24[ema24.length - 1]
      }
    }
  };
}

function calculateVolatility(priceChanges) {
  if (!priceChanges || !priceChanges.changes || priceChanges.changes.length === 0) {
    return {
      current: 0,
      historical: 0,
      trend: 'STABLE',
      risk: 'LOW'
    };
  }

  const { changes, statistics } = priceChanges;
  const recentChanges = changes.slice(-24); // 最近24小时
  const historicalChanges = changes.slice(0, -24); // 24小时之前

  // 计算当前波动率 (最近24小时)
  const currentVolatility = calculateVolatilityMetric(recentChanges);

  // 计算历史波动率
  const historicalVolatility = calculateVolatilityMetric(historicalChanges);

  // 确定波动率趋势
  let trend = 'STABLE';
  const volatilityChange = ((currentVolatility - historicalVolatility) / historicalVolatility) * 100;
  if (volatilityChange > 20) {
    trend = 'INCREASING';
  } else if (volatilityChange < -20) {
    trend = 'DECREASING';
  }

  // 评估风险等级
  let risk = 'LOW';
  if (currentVolatility > statistics.stdDev * 2) {
    risk = 'HIGH';
  } else if (currentVolatility > statistics.stdDev * 1.5) {
    risk = 'MEDIUM';
  }

  return {
    current: currentVolatility,
    historical: historicalVolatility,
    trend,
    risk,
    metrics: {
      dailyRange: calculateDailyRange(changes),
      peakTrough: calculatePeakTrough(changes),
      volatilityChange
    }
  };
}

// 内部辅助函数

function calculateEMA(prices, period) {
  const multiplier = 2 / (period + 1);
  let ema = [prices[0]];

  for (let i = 1; i < prices.length; i++) {
    ema.push((prices[i] - ema[i - 1]) * multiplier + ema[i - 1]);
  }

  return ema;
}

function calculateRSI(changes, period = 14) {
  if (changes.length < period) {
    return 50;
  }

  let gains = 0;
  let losses = 0;

  // 计算初始平均涨跌幅
  for (let i = 0; i < period; i++) {
    if (changes[i] >= 0) {
      gains += changes[i];
    } else {
      losses -= changes[i];
    }
  }

  gains /= period;
  losses /= period;

  // 计算RSI
  for (let i = period; i < changes.length; i++) {
    if (changes[i] >= 0) {
      gains = (gains * (period - 1) + changes[i]) / period;
      losses = (losses * (period - 1)) / period;
    } else {
      gains = (gains * (period - 1)) / period;
      losses = (losses * (period - 1) - changes[i]) / period;
    }
  }

  const rs = gains / losses;
  return 100 - (100 / (1 + rs));
}

function calculateTrendReliability(changes, statistics) {
  // 计算趋势可靠性分数 (0-100)
  const consistencyScore = calculateConsistencyScore(changes);
  const volumeSupport = calculateVolumeSupport(changes);
  const volatilityImpact = Math.max(0, 100 - (statistics.stdDev * 10));

  return Math.round((consistencyScore + volumeSupport + volatilityImpact) / 3);
}

function calculateVolatilityMetric(changes) {
  if (!changes || changes.length === 0) return 0;

  const values = changes.map(c => Math.abs(c.changePercent));
  return Math.sqrt(values.reduce((a, b) => a + b * b, 0) / values.length);
}

function calculateDailyRange(changes) {
  if (!changes || changes.length === 0) return { min: 0, max: 0, range: 0 };

  const prices = changes.map(c => c.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);

  return {
    min,
    max,
    range: max - min
  };
}

function calculatePeakTrough(changes) {
  if (!changes || changes.length < 2) return { peaks: [], troughs: [] };

  const peaks = [];
  const troughs = [];

  for (let i = 1; i < changes.length - 1; i++) {
    const prev = changes[i - 1].price;
    const curr = changes[i].price;
    const next = changes[i + 1].price;

    if (curr > prev && curr > next) {
      peaks.push({
        price: curr,
        timestamp: changes[i].timestamp
      });
    } else if (curr < prev && curr < next) {
      troughs.push({
        price: curr,
        timestamp: changes[i].timestamp
      });
    }
  }

  return { peaks, troughs };
}

function calculateConsistencyScore(changes) {
  if (!changes || changes.length < 2) return 50;

  let consistentMoves = 0;
  const direction = changes[changes.length - 1].changePercent > 0 ? 1 : -1;

  for (let i = changes.length - 2; i >= 0; i--) {
    if ((changes[i].changePercent > 0 && direction > 0) ||
        (changes[i].changePercent < 0 && direction < 0)) {
      consistentMoves++;
    }
  }

  return (consistentMoves / changes.length) * 100;
}

function calculateVolumeSupport(changes) {
  // 这个函数需要交易量数据支持，暂时返回中性值
  return 50;
}

function analyzeLiquidityConcentration(liquidityData) {
  if (!liquidityData || !liquidityData.bins || liquidityData.bins.length === 0) {
    return {
      concentration: 0,
      distribution: 'UNKNOWN',
      hotspots: []
    };
  }

  // 计算每个区间的流动性占比
  const totalLiquidity = liquidityData.bins.reduce((sum, bin) => sum + bin.liquidity, 0);
  const binShares = liquidityData.bins.map(bin => ({
    ...bin,
    share: (bin.liquidity / totalLiquidity) * 100
  }));

  // 按流动性份额排序
  const sortedBins = [...binShares].sort((a, b) => b.share - a.share);

  // 计算集中度 (前20%区间的流动性占比)
  const topBinsCount = Math.ceil(sortedBins.length * 0.2);
  const concentration = sortedBins
    .slice(0, topBinsCount)
    .reduce((sum, bin) => sum + bin.share, 0);

  // 确定分布类型
  let distribution = 'BALANCED';
  if (concentration > 80) {
    distribution = 'HIGHLY_CONCENTRATED';
  } else if (concentration > 60) {
    distribution = 'MODERATELY_CONCENTRATED';
  } else if (concentration < 30) {
    distribution = 'DISPERSED';
  }

  // 识别热点区间
  const hotspots = sortedBins
    .filter(bin => bin.share > 5) // 占比超过5%的区间
    .map(bin => ({
      binId: bin.id,
      priceRange: bin.priceRange,
      liquidity: bin.liquidity,
      share: bin.share
    }));

  return {
    concentration,
    distribution,
    hotspots,
    metrics: {
      giniCoefficient: calculateGiniCoefficient(binShares),
      entropyIndex: calculateEntropyIndex(binShares),
      effectiveBins: calculateEffectiveBins(binShares)
    }
  };
}

function identifyLiquidityGaps(liquidityData) {
  if (!liquidityData || !liquidityData.bins || liquidityData.bins.length === 0) {
    return {
      gaps: [],
      riskLevel: 'UNKNOWN'
    };
  }

  // 按价格排序区间
  const sortedBins = [...liquidityData.bins].sort((a, b) => a.priceRange.min - b.priceRange.min);
  
  const gaps = [];
  const currentPrice = liquidityData.currentPrice || 0;
  let totalGapVolume = 0;

  // 识别流动性缺口
  for (let i = 0; i < sortedBins.length - 1; i++) {
    const currentBin = sortedBins[i];
    const nextBin = sortedBins[i + 1];
    
    // 检查相邻区间是否存在缺口
    if (nextBin.priceRange.min - currentBin.priceRange.max > 0) {
      const gapSize = nextBin.priceRange.min - currentBin.priceRange.max;
      const gapCenter = (nextBin.priceRange.min + currentBin.priceRange.max) / 2;
      const distanceFromCurrent = Math.abs(gapCenter - currentPrice);
      
      const gap = {
        startPrice: currentBin.priceRange.max,
        endPrice: nextBin.priceRange.min,
        size: gapSize,
        distanceFromCurrent,
        severity: calculateGapSeverity(gapSize, distanceFromCurrent, currentPrice)
      };
      
      gaps.push(gap);
      totalGapVolume += gapSize;
    }
  }

  // 评估风险等级
  let riskLevel = 'LOW';
  const priceRange = sortedBins[sortedBins.length - 1].priceRange.max - sortedBins[0].priceRange.min;
  const gapRatio = totalGapVolume / priceRange;

  if (gapRatio > 0.2 || gaps.some(gap => gap.severity === 'HIGH')) {
    riskLevel = 'HIGH';
  } else if (gapRatio > 0.1 || gaps.some(gap => gap.severity === 'MEDIUM')) {
    riskLevel = 'MEDIUM';
  }

  return {
    gaps: gaps.sort((a, b) => b.severity - a.severity),
    riskLevel,
    metrics: {
      totalGapVolume,
      gapRatio,
      averageGapSize: totalGapVolume / gaps.length || 0
    }
  };
}

function assessLiquidityStability(liquidityData) {
  if (!liquidityData || !liquidityData.history || liquidityData.history.length === 0) {
    return {
      stability: 'UNKNOWN',
      trend: 'NEUTRAL',
      risk: 'UNKNOWN'
    };
  }

  // 分析历史流动性变化
  const changes = calculateLiquidityChanges(liquidityData.history);
  
  // 计算稳定性指标
  const volatility = calculateLiquidityVolatility(changes);
  const persistence = calculateLiquidityPersistence(changes);
  const resilience = calculateLiquidityResilience(changes);

  // 评估稳定性
  let stability = 'MODERATE';
  if (volatility < 0.1 && persistence > 0.8 && resilience > 0.7) {
    stability = 'HIGH';
  } else if (volatility > 0.3 || persistence < 0.4 || resilience < 0.3) {
    stability = 'LOW';
  }

  // 分析趋势
  const trend = analyzeLiquidityTrend(changes);

  // 评估风险
  let risk = 'MEDIUM';
  if (stability === 'HIGH' && trend.direction !== 'DECREASING') {
    risk = 'LOW';
  } else if (stability === 'LOW' || trend.direction === 'DECREASING') {
    risk = 'HIGH';
  }

  return {
    stability,
    trend: trend.direction,
    risk,
    metrics: {
      volatility,
      persistence,
      resilience,
      trendStrength: trend.strength
    }
  };
}

// 内部辅助函数

function calculateGiniCoefficient(bins) {
  if (!bins || bins.length === 0) return 0;
  
  const n = bins.length;
  const shares = bins.map(bin => bin.share).sort((a, b) => a - b);
  
  let sumOfDifferences = 0;
  let sumOfShares = 0;
  
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      sumOfDifferences += Math.abs(shares[i] - shares[j]);
    }
    sumOfShares += shares[i];
  }
  
  return sumOfDifferences / (2 * n * sumOfShares);
}

function calculateEntropyIndex(bins) {
  if (!bins || bins.length === 0) return 0;
  
  return -bins.reduce((entropy, bin) => {
    const p = bin.share / 100;
    return entropy + (p > 0 ? p * Math.log(p) : 0);
  }, 0);
}

function calculateEffectiveBins(bins) {
  if (!bins || bins.length === 0) return 0;
  
  const totalShare = bins.reduce((sum, bin) => sum + bin.share, 0);
  return bins.reduce((count, bin) => {
    return count + (bin.share / totalShare > 0.01 ? 1 : 0);
  }, 0);
}

function calculateGapSeverity(gapSize, distanceFromCurrent, currentPrice) {
  const relativeSeverity = (gapSize / currentPrice) * 100;
  const distanceImpact = Math.max(0, 1 - (distanceFromCurrent / currentPrice));
  const severityScore = relativeSeverity * distanceImpact;

  if (severityScore > 5) return 'HIGH';
  if (severityScore > 2) return 'MEDIUM';
  return 'LOW';
}

function calculateLiquidityChanges(history) {
  return history.map((record, index) => {
    if (index === 0) return { change: 0, timestamp: record.timestamp };
    
    const prevRecord = history[index - 1];
    const change = ((record.totalLiquidity - prevRecord.totalLiquidity) / prevRecord.totalLiquidity) * 100;
    
    return {
      change,
      timestamp: record.timestamp
    };
  });
}

function calculateLiquidityVolatility(changes) {
  if (changes.length < 2) return 0;
  
  const values = changes.map(c => c.change);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  
  return Math.sqrt(variance);
}

function calculateLiquidityPersistence(changes) {
  if (changes.length < 2) return 1;
  
  let persistentCount = 0;
  for (let i = 1; i < changes.length; i++) {
    if (Math.abs(changes[i].change) < 5) { // 变化小于5%视为稳定
      persistentCount++;
    }
  }
  
  return persistentCount / (changes.length - 1);
}

function calculateLiquidityResilience(changes) {
  if (changes.length < 2) return 1;
  
  let recoveryCount = 0;
  for (let i = 1; i < changes.length; i++) {
    if (changes[i - 1].change < -5 && changes[i].change > 0) { // 从显著下降中恢复
      recoveryCount++;
    }
  }
  
  return recoveryCount / (changes.length - 1);
}

function analyzeLiquidityTrend(changes) {
  if (changes.length < 2) {
    return { direction: 'NEUTRAL', strength: 0 };
  }
  
  const recentChanges = changes.slice(-24); // 使用最近24个数据点
  const totalChange = recentChanges.reduce((sum, c) => sum + c.change, 0);
  const averageChange = totalChange / recentChanges.length;
  
  let direction = 'NEUTRAL';
  if (averageChange > 1) {
    direction = 'INCREASING';
  } else if (averageChange < -1) {
    direction = 'DECREASING';
  }
  
  const strength = Math.min(100, Math.abs(averageChange) * 10);
  
  return { direction, strength };
}

function analyzeVolumeTrend(volumeData) {
  if (!volumeData || !volumeData.history || volumeData.history.length === 0) {
    return {
      trend: 'UNKNOWN',
      strength: 0,
      confidence: 0
    };
  }

  // 计算移动平均
  const periods = [4, 12, 24]; // 4小时，12小时，24小时
  const mas = periods.map(period => ({
    period,
    values: calculateVolumeMA(volumeData.history, period)
  }));

  // 分析趋势方向
  const shortTerm = analyzeMATrend(mas[0].values, 5);
  const mediumTerm = analyzeMATrend(mas[1].values, 12);
  const longTerm = analyzeMATrend(mas[2].values, 24);

  // 确定整体趋势
  const trend = determineOverallTrend(shortTerm, mediumTerm, longTerm);

  // 计算趋势强度
  const strength = calculateTrendStrength(shortTerm, mediumTerm, longTerm);

  // 计算趋势可信度
  const confidence = calculateTrendConfidence(volumeData.history, trend);

  return {
    trend: trend.direction,
    strength: strength,
    confidence: confidence,
    details: {
      shortTerm,
      mediumTerm,
      longTerm,
      movingAverages: mas.map(ma => ({
        period: ma.period,
        current: ma.values[ma.values.length - 1]
      }))
    }
  };
}

function detectVolumeAnomalies(volumeData) {
  if (!volumeData || !volumeData.history || volumeData.history.length === 0) {
    return {
      anomalies: [],
      riskLevel: 'UNKNOWN'
    };
  }

  const history = volumeData.history;
  const anomalies = [];
  
  // 计算基准统计数据
  const stats = calculateVolumeStatistics(history);
  
  // 检测异常
  history.forEach((record, index) => {
    // 突发性异常（短期）
    if (record.volume > stats.mean + stats.stdDev * 3) {
      anomalies.push({
        type: 'SPIKE',
        timestamp: record.timestamp,
        volume: record.volume,
        expectedVolume: stats.mean,
        deviation: (record.volume - stats.mean) / stats.stdDev,
        severity: 'HIGH'
      });
    }
    // 持续性异常（中期）
    else if (index >= 6) {
      const recentAvg = calculateRecentAverage(history, index, 6);
      if (recentAvg > stats.mean + stats.stdDev * 2) {
        anomalies.push({
          type: 'SUSTAINED_HIGH',
          timestamp: record.timestamp,
          volume: recentAvg,
          expectedVolume: stats.mean,
          deviation: (recentAvg - stats.mean) / stats.stdDev,
          severity: 'MEDIUM'
        });
      }
    }
    // 低迷期（长期）
    else if (index >= 24) {
      const recentAvg = calculateRecentAverage(history, index, 24);
      if (recentAvg < stats.mean - stats.stdDev * 2) {
        anomalies.push({
          type: 'SUSTAINED_LOW',
          timestamp: record.timestamp,
          volume: recentAvg,
          expectedVolume: stats.mean,
          deviation: (stats.mean - recentAvg) / stats.stdDev,
          severity: 'MEDIUM'
        });
      }
    }
  });

  // 评估风险等级
  const riskLevel = assessVolumeRisk(anomalies, stats);

  return {
    anomalies: anomalies.sort((a, b) => Math.abs(b.deviation) - Math.abs(a.deviation)),
    riskLevel,
    metrics: {
      totalAnomalies: anomalies.length,
      severityDistribution: calculateSeverityDistribution(anomalies),
      stats
    }
  };
}

function assessTradingActivity(volumeData) {
  if (!volumeData || !volumeData.history || volumeData.history.length === 0) {
    return {
      level: 'UNKNOWN',
      trend: 'NEUTRAL',
      consistency: 0
    };
  }

  // 计算活跃度指标
  const activityMetrics = calculateActivityMetrics(volumeData.history);
  
  // 评估活跃度水平
  const level = determineActivityLevel(activityMetrics);
  
  // 分析活跃度趋势
  const trend = analyzeActivityTrend(volumeData.history);
  
  // 计算一致性得分
  const consistency = calculateActivityConsistency(volumeData.history);

  return {
    level,
    trend: trend.direction,
    consistency,
    metrics: {
      ...activityMetrics,
      trendStrength: trend.strength,
      patterns: identifyActivityPatterns(volumeData.history)
    }
  };
}

// 内部辅助函数

function calculateVolumeMA(history, period) {
  const volumes = history.map(h => h.volume);
  const mas = [];
  
  for (let i = period - 1; i < volumes.length; i++) {
    const sum = volumes.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
    mas.push(sum / period);
  }
  
  return mas;
}

function analyzeMATrend(values, period) {
  if (values.length < period) {
    return { direction: 'NEUTRAL', strength: 0 };
  }

  const recent = values.slice(-period);
  const slope = calculateLinearRegression(recent);
  
  let direction = 'NEUTRAL';
  if (slope > 0.05) {
    direction = 'INCREASING';
  } else if (slope < -0.05) {
    direction = 'DECREASING';
  }
  
  const strength = Math.min(100, Math.abs(slope) * 100);
  
  return { direction, strength, slope };
}

function determineOverallTrend(shortTerm, mediumTerm, longTerm) {
  // 权重配置
  const weights = { short: 0.5, medium: 0.3, long: 0.2 };
  
  // 计算加权得分
  const score = (
    getDirectionScore(shortTerm.direction) * weights.short +
    getDirectionScore(mediumTerm.direction) * weights.medium +
    getDirectionScore(longTerm.direction) * weights.long
  );
  
  let direction = 'NEUTRAL';
  if (score > 0.3) {
    direction = 'INCREASING';
  } else if (score < -0.3) {
    direction = 'DECREASING';
  }
  
  return { direction, score };
}

function calculateTrendStrength(shortTerm, mediumTerm, longTerm) {
  const weights = { short: 0.5, medium: 0.3, long: 0.2 };
  
  return Math.min(100,
    shortTerm.strength * weights.short +
    mediumTerm.strength * weights.medium +
    longTerm.strength * weights.long
  );
}

function calculateTrendConfidence(history, trend) {
  if (history.length < 2) return 0;
  
  // 计算趋势一致性
  const consistencyScore = calculateVolumeConsistency(history, trend);
  
  // 计算数据质量分数
  const qualityScore = calculateDataQuality(history);
  
  // 计算趋势持续性
  const persistenceScore = calculateTrendPersistence(history, trend);
  
  return Math.round((consistencyScore + qualityScore + persistenceScore) / 3);
}

function calculateVolumeStatistics(history) {
  const volumes = history.map(h => h.volume);
  
  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const variance = volumes.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    mean,
    median: volumes.sort((a, b) => a - b)[Math.floor(volumes.length / 2)],
    stdDev,
    min: Math.min(...volumes),
    max: Math.max(...volumes)
  };
}

function calculateRecentAverage(history, currentIndex, period) {
  const start = Math.max(0, currentIndex - period + 1);
  const volumes = history.slice(start, currentIndex + 1).map(h => h.volume);
  return volumes.reduce((a, b) => a + b, 0) / volumes.length;
}

function assessVolumeRisk(anomalies, stats) {
  if (anomalies.length === 0) return 'LOW';
  
  const highSeverityCount = anomalies.filter(a => a.severity === 'HIGH').length;
  const recentAnomalies = anomalies.filter(a => {
    const age = Date.now() - new Date(a.timestamp).getTime();
    return age < 24 * 60 * 60 * 1000; // 24小时内
  });
  
  if (highSeverityCount >= 3 || recentAnomalies.length >= 5) {
    return 'HIGH';
  } else if (highSeverityCount >= 1 || recentAnomalies.length >= 2) {
    return 'MEDIUM';
  }
  
  return 'LOW';
}

function calculateSeverityDistribution(anomalies) {
  const distribution = { HIGH: 0, MEDIUM: 0, LOW: 0 };
  anomalies.forEach(a => distribution[a.severity]++);
  return distribution;
}

function calculateActivityMetrics(history) {
  const volumes = history.map(h => h.volume);
  const timeIntervals = calculateTimeIntervals(history);
  
  return {
    averageVolume: volumes.reduce((a, b) => a + b, 0) / volumes.length,
    peakVolume: Math.max(...volumes),
    volumeStability: calculateVolumeStability(volumes),
    tradingFrequency: calculateTradingFrequency(timeIntervals),
    intervalRegularity: calculateIntervalRegularity(timeIntervals)
  };
}

function determineActivityLevel(metrics) {
  const score = (
    normalizeMetric(metrics.averageVolume) * 0.3 +
    normalizeMetric(metrics.volumeStability) * 0.2 +
    normalizeMetric(metrics.tradingFrequency) * 0.3 +
    normalizeMetric(metrics.intervalRegularity) * 0.2
  );
  
  if (score > 0.7) return 'HIGH';
  if (score > 0.3) return 'MODERATE';
  return 'LOW';
}

function analyzeActivityTrend(history) {
  const periods = [6, 12, 24]; // 6小时，12小时，24小时
  const trends = periods.map(period => {
    const subset = history.slice(-period);
    return analyzeMATrend(subset.map(h => h.volume), period);
  });
  
  return {
    direction: trends[0].direction, // 使用短期趋势作为主要方向
    strength: calculateTrendStrength(...trends)
  };
}

function calculateActivityConsistency(history) {
  const volumes = history.map(h => h.volume);
  const mean = volumes.reduce((a, b) => a + b, 0) / volumes.length;
  const deviations = volumes.map(v => Math.abs(v - mean) / mean);
  
  return Math.max(0, 100 - (average(deviations) * 100));
}

function identifyActivityPatterns(history) {
  return {
    dailyCycle: analyzeDailyCycle(history),
    weekdayPattern: analyzeWeekdayPattern(history),
    trendCycles: analyzeTrendCycles(history)
  };
}

// 工具函数

function getDirectionScore(direction) {
  switch (direction) {
    case 'INCREASING': return 1;
    case 'DECREASING': return -1;
    default: return 0;
  }
}

function calculateLinearRegression(values) {
  const n = values.length;
  const xs = Array.from({length: n}, (_, i) => i);
  
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = values.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((sum, x, i) => sum + x * values[i], 0);
  const sumXX = xs.reduce((sum, x) => sum + x * x, 0);
  
  return (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
}

function calculateVolumeConsistency(history, trend) {
  // 实现细节
  return 75; // 示例返回值
}

function calculateDataQuality(history) {
  // 实现细节
  return 80; // 示例返回值
}

function calculateTrendPersistence(history, trend) {
  // 实现细节
  return 70; // 示例返回值
}

function calculateTimeIntervals(history) {
  // 实现细节
  return []; // 示例返回值
}

function calculateVolumeStability(volumes) {
  // 实现细节
  return 0.8; // 示例返回值
}

function calculateTradingFrequency(intervals) {
  // 实现细节
  return 0.7; // 示例返回值
}

function calculateIntervalRegularity(intervals) {
  // 实现细节
  return 0.75; // 示例返回值
}

function normalizeMetric(value) {
  // 实现细节
  return value; // 示例返回值
}

function average(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function analyzeDailyCycle(history) {
  // 实现细节
  return {}; // 示例返回值
}

function analyzeWeekdayPattern(history) {
  // 实现细节
  return {}; // 示例返回值
}

function analyzeTrendCycles(history) {
  // 实现细节
  return {}; // 示例返回值
}

async function analyzeCorrelations(pool, relatedPools, connection) {
  if (!pool || !relatedPools || relatedPools.length === 0) {
    return [];
  }

  try {
    // 获取所有池的价格历史数据
    const [poolPrices, ...relatedPricesList] = await Promise.all([
      getPoolPrice(pool.address, connection, { interval: '1h', limit: 168 }),
      ...relatedPools.map(p => 
        getPoolPrice(p.address, connection, { interval: '1h', limit: 168 })
      )
    ]);

    // 计算相关性
    const correlations = relatedPools.map((relatedPool, index) => {
      const relatedPrices = relatedPricesList[index];
      
      // 计算价格相关性
      const correlation = calculatePriceCorrelation(poolPrices, relatedPrices);
      
      // 计算价格偏离度
      const deviation = calculatePriceDeviation(poolPrices, relatedPrices);
      
      // 计算流动性关系
      const liquidityRelation = analyzeLiquidityRelation(pool, relatedPool);
      
      // 计算交易量关联度
      const volumeCorrelation = calculateVolumeCorrelation(pool, relatedPool);
      
      return {
        poolAddress: relatedPool.address,
        tokenPair: `${relatedPool.tokenX}/${relatedPool.tokenY}`,
        correlation: {
          coefficient: correlation.coefficient,
          significance: correlation.significance,
          trend: correlation.trend
        },
        priceDeviation: deviation,
        liquidityRelation,
        volumeCorrelation,
        lastUpdate: new Date().toISOString()
      };
    });

    // 按相关性强度排序
    return correlations.sort((a, b) => Math.abs(b.correlation.coefficient) - Math.abs(a.correlation.coefficient));
  } catch (error) {
    logger.error('分析价格相关性失败', { error: error.message });
    return [];
  }
}

function identifyArbitrage(pool, relatedPools, correlations) {
  if (!pool || !relatedPools || !correlations || correlations.length === 0) {
    return [];
  }

  const opportunities = [];

  correlations.forEach((correlation, index) => {
    const relatedPool = relatedPools[index];
    
    // 检查是否存在套利机会
    const arbitrageConditions = checkArbitrageConditions(pool, relatedPool, correlation);
    
    if (arbitrageConditions.hasOpportunity) {
      // 计算套利参数
      const params = calculateArbitrageParameters(pool, relatedPool, arbitrageConditions);
      
      // 评估套利风险
      const risks = assessArbitrageRisks(pool, relatedPool, params);
      
      // 计算预期收益
      const returns = estimateArbitrageReturns(params, risks);
      
      opportunities.push({
        type: arbitrageConditions.type,
        sourcePool: {
          address: pool.address,
          tokenPair: `${pool.tokenX}/${pool.tokenY}`
        },
        targetPool: {
          address: relatedPool.address,
          tokenPair: `${relatedPool.tokenX}/${relatedPool.tokenY}`
        },
        parameters: params,
        risks,
        expectedReturns: returns,
        confidence: calculateArbitrageConfidence(correlation, risks),
        lastUpdate: new Date().toISOString()
      });
    }
  });

  // 按预期收益排序
  return opportunities.sort((a, b) => b.expectedReturns.total - a.expectedReturns.total);
}

// 内部辅助函数

function calculatePriceCorrelation(prices1, prices2) {
  if (!prices1 || !prices2 || prices1.length !== prices2.length) {
    return {
      coefficient: 0,
      significance: 0,
      trend: 'NEUTRAL'
    };
  }

  // 计算皮尔逊相关系数
  const n = prices1.length;
  const mean1 = average(prices1);
  const mean2 = average(prices2);
  
  let sumCov = 0;
  let sumVar1 = 0;
  let sumVar2 = 0;
  
  for (let i = 0; i < n; i++) {
    const diff1 = prices1[i] - mean1;
    const diff2 = prices2[i] - mean2;
    sumCov += diff1 * diff2;
    sumVar1 += diff1 * diff1;
    sumVar2 += diff2 * diff2;
  }
  
  const coefficient = sumCov / Math.sqrt(sumVar1 * sumVar2);
  
  // 计算显著性
  const significance = calculateCorrelationSignificance(coefficient, n);
  
  // 确定趋势
  let trend = 'NEUTRAL';
  if (coefficient > 0.7 && significance > 0.95) {
    trend = 'STRONG_POSITIVE';
  } else if (coefficient < -0.7 && significance > 0.95) {
    trend = 'STRONG_NEGATIVE';
  } else if (coefficient > 0.3) {
    trend = 'WEAK_POSITIVE';
  } else if (coefficient < -0.3) {
    trend = 'WEAK_NEGATIVE';
  }
  
  return { coefficient, significance, trend };
}

function calculatePriceDeviation(prices1, prices2) {
  if (!prices1 || !prices2 || prices1.length !== prices2.length) {
    return {
      current: 0,
      average: 0,
      trend: 'NEUTRAL'
    };
  }

  // 计算价格偏离度时间序列
  const deviations = prices1.map((p1, i) => {
    const p2 = prices2[i];
    return ((p1 - p2) / ((p1 + p2) / 2)) * 100;
  });
  
  // 计算当前偏离度
  const current = deviations[deviations.length - 1];
  
  // 计算平均偏离度
  const average = mean(deviations);
  
  // 分析偏离趋势
  const recentDeviations = deviations.slice(-24); // 最近24小时
  const trend = analyzePriceDeviationTrend(recentDeviations);
  
  return {
    current,
    average,
    trend,
    volatility: standardDeviation(deviations),
    extremes: {
      max: Math.max(...deviations),
      min: Math.min(...deviations)
    }
  };
}

function analyzeLiquidityRelation(pool1, pool2) {
  // 分析流动性关系
  return {
    type: 'INDEPENDENT', // 示例返回值
    strength: 0.5
  };
}

function calculateVolumeCorrelation(pool1, pool2) {
  // 计算交易量相关性
  return {
    coefficient: 0.6, // 示例返回值
    significance: 0.95
  };
}

function checkArbitrageConditions(pool, relatedPool, correlation) {
  // 检查套利条件
  return {
    hasOpportunity: true, // 示例返回值
    type: 'TRIANGULAR'
  };
}

function calculateArbitrageParameters(pool, relatedPool, conditions) {
  // 计算套利参数
  return {
    entryPrice: 0,
    exitPrice: 0,
    optimalSize: 0
  };
}

function assessArbitrageRisks(pool, relatedPool, params) {
  // 评估套利风险
  return {
    slippage: 0.1,
    timing: 0.2,
    liquidity: 0.3,
    overall: 0.2
  };
}

function estimateArbitrageReturns(params, risks) {
  // 估算套利收益
  return {
    gross: 0,
    net: 0,
    total: 0
  };
}

function calculateArbitrageConfidence(correlation, risks) {
  // 计算套利置信度
  return 0.8; // 示例返回值
}

function calculateCorrelationSignificance(coefficient, n) {
  // 计算相关系数的显著性
  return 0.95; // 示例返回值
}

function analyzePriceDeviationTrend(deviations) {
  if (!deviations || deviations.length < 2) {
    return 'NEUTRAL';
  }

  const slope = calculateLinearRegression(deviations);
  
  if (Math.abs(slope) < 0.01) {
    return 'STABLE';
  } else if (slope > 0) {
    return 'DIVERGING';
  } else {
    return 'CONVERGING';
  }
}

function mean(values) {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function standardDeviation(values) {
  const avg = mean(values);
  const squareDiffs = values.map(value => Math.pow(value - avg, 2));
  return Math.sqrt(mean(squareDiffs));
} 