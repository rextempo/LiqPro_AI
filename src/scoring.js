/**
 * 评分系统工具函数
 * 
 * 实现PRD中定义的评分算法，包括流动性分布评分、费用效率评分等
 */

/**
 * 计算流动性集中度评分
 * @param {Object} distribution - 流动性分布数据
 * @returns {number} 0-100的评分
 */
export function calculateConcentrationScore(distribution) {
  const totalLiquidity = distribution.bins.reduce((sum, bin) => sum + bin.liquidity, 0);
  const sortedBins = [...distribution.bins].sort((a, b) => b.liquidity - a.liquidity);
  
  // 计算前20%bins的流动性占比
  const topBinsCount = Math.ceil(sortedBins.length * 0.2);
  const topBinsLiquidity = sortedBins.slice(0, topBinsCount)
    .reduce((sum, bin) => sum + bin.liquidity, 0);
  
  const concentrationRatio = topBinsLiquidity / totalLiquidity;
  
  // 理想集中度为0.6-0.8，过高或过低都会降低评分
  if (concentrationRatio >= 0.6 && concentrationRatio <= 0.8) {
    return 100;
  } else if (concentrationRatio > 0.8) {
    return Math.max(0, 100 - ((concentrationRatio - 0.8) * 500)); // 每0.1超出扣50分
  } else {
    return Math.max(0, 100 - ((0.6 - concentrationRatio) * 500)); // 每0.1不足扣50分
  }
}

/**
 * 计算有效流动性比率
 * @param {Object} distribution - 流动性分布数据
 * @param {Object} activeBin - 当前活跃bin信息
 * @returns {number} 0-100的评分
 */
export function calculateEffectiveRatio(distribution, activeBin) {
  const currentPrice = activeBin.price;
  const range = 0.05; // ±5%的价格范围
  
  const minPrice = currentPrice * (1 - range);
  const maxPrice = currentPrice * (1 + range);
  
  const effectiveBins = distribution.bins.filter(bin => 
    bin.price >= minPrice && bin.price <= maxPrice
  );
  
  const effectiveLiquidity = effectiveBins.reduce((sum, bin) => sum + bin.liquidity, 0);
  const totalLiquidity = distribution.bins.reduce((sum, bin) => sum + bin.liquidity, 0);
  
  const ratio = effectiveLiquidity / totalLiquidity;
  
  // 理想比率为0.6-0.8，过高或过低都会降低评分
  if (ratio >= 0.6 && ratio <= 0.8) {
    return 100;
  } else if (ratio > 0.8) {
    return Math.max(0, 100 - ((ratio - 0.8) * 500)); // 每0.1超出扣50分
  } else {
    return Math.max(0, 100 - ((0.6 - ratio) * 500)); // 每0.1不足扣50分
  }
}

/**
 * 计算流动性深度评分
 * @param {Object} distribution - 流动性分布数据
 * @returns {number} 0-100的评分
 */
export function calculateDepthScore(distribution) {
  const totalLiquidity = distribution.bins.reduce((sum, bin) => sum + bin.liquidity, 0);
  const averageLiquidity = totalLiquidity / distribution.bins.length;
  
  // 计算深度得分，基于平均每个bin的流动性
  // 假设理想的平均流动性为10000 USD
  const idealAverageLiquidity = 10000;
  const depthRatio = Math.min(1, averageLiquidity / idealAverageLiquidity);
  
  return Math.round(depthRatio * 100);
}

/**
 * 计算Bin覆盖率评分
 * @param {Object} distribution - 流动性分布数据
 * @returns {number} 0-100的评分
 */
export function calculateCoverageScore(distribution) {
  const binsWithLiquidity = distribution.bins.filter(bin => bin.liquidity > 0);
  const coverageRatio = binsWithLiquidity.length / distribution.bins.length;
  
  // 理想覆盖率为0.4-0.6，过高或过低都会降低评分
  if (coverageRatio >= 0.4 && coverageRatio <= 0.6) {
    return 100;
  } else if (coverageRatio > 0.6) {
    return Math.max(0, 100 - ((coverageRatio - 0.6) * 250)); // 每0.1超出扣25分
  } else {
    return Math.max(0, 100 - ((0.4 - coverageRatio) * 250)); // 每0.1不足扣25分
  }
}

/**
 * 计算费用适应性评分
 * @param {Object} feeInfo - 费用信息
 * @returns {number} 0-100的评分
 */
export function calculateFeeAdaptabilityScore(feeInfo) {
  const { baseFee, maxFee, currentDynamicFee } = feeInfo;
  
  // 检查动态费用是否在合理范围内
  const feeRange = maxFee - baseFee;
  const normalizedDynamicFee = (currentDynamicFee - baseFee) / feeRange;
  
  // 理想的动态费用应该在基础费率和最高费率之间的30%-70%范围内
  if (normalizedDynamicFee >= 0.3 && normalizedDynamicFee <= 0.7) {
    return 100;
  } else if (normalizedDynamicFee > 0.7) {
    return Math.max(0, 100 - ((normalizedDynamicFee - 0.7) * 333)); // 每0.1超出扣33.3分
  } else {
    return Math.max(0, 100 - ((0.3 - normalizedDynamicFee) * 333)); // 每0.1不足扣33.3分
  }
}

/**
 * 计算费用收集效率评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateFeeCollectionScore(pool) {
  const { fees_24h, trade_volume_24h, feeInfo } = pool;
  const { currentDynamicFee } = feeInfo;
  
  // 计算理论可收集费用
  const theoreticalFees = trade_volume_24h * currentDynamicFee;
  
  // 计算实际收集效率
  const collectionEfficiency = fees_24h / theoreticalFees;
  
  // 理想效率应该在80%以上
  if (collectionEfficiency >= 0.8) {
    return 100;
  } else {
    return Math.max(0, Math.round(collectionEfficiency * 125)); // 线性计分，80%及以上得满分
  }
}

/**
 * 计算费率竞争力评分
 * @param {Object} feeInfo - 费用信息
 * @returns {number} 0-100的评分
 */
export function calculateFeeCompetitivenessScore(feeInfo) {
  const { baseFee, currentDynamicFee } = feeInfo;
  
  // 基础费率评分（占40%）
  const baseFeeScore = baseFee <= 0.003 ? 100 :
    baseFee <= 0.005 ? 80 :
    baseFee <= 0.008 ? 60 :
    baseFee <= 0.01 ? 40 : 20;
  
  // 动态费率评分（占60%）
  const dynamicFeeScore = currentDynamicFee <= 0.005 ? 100 :
    currentDynamicFee <= 0.008 ? 80 :
    currentDynamicFee <= 0.01 ? 60 :
    currentDynamicFee <= 0.015 ? 40 : 20;
  
  return Math.round(baseFeeScore * 0.4 + dynamicFeeScore * 0.6);
}

/**
 * 计算价格波动评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculatePriceVolatilityScore(pool) {
  const { priceHistory } = pool;
  if (!priceHistory || priceHistory.length < 2) return 50; // 默认中等分数
  
  // 计算价格变化率的标准差
  const changes = [];
  for (let i = 1; i < priceHistory.length; i++) {
    const change = (priceHistory[i].price - priceHistory[i-1].price) / priceHistory[i-1].price;
    changes.push(change);
  }
  
  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  const variance = changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length;
  const stdDev = Math.sqrt(variance);
  
  // 波动率评分（波动率越低，分数越高）
  return Math.max(0, Math.round(100 - (stdDev * 1000))); // 每0.1%的标准差扣1分
}

/**
 * 计算收益稳定性评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateYieldStabilityScore(pool) {
  const { yieldHistory } = pool;
  if (!yieldHistory || yieldHistory.length < 2) return 50; // 默认中等分数
  
  // 计算收益率的变异系数
  const yields = yieldHistory.map(h => h.yield);
  const avgYield = yields.reduce((sum, y) => sum + y, 0) / yields.length;
  const variance = yields.reduce((sum, y) => sum + Math.pow(y - avgYield, 2), 0) / yields.length;
  const stdDev = Math.sqrt(variance);
  const cv = stdDev / avgYield; // 变异系数
  
  // 变异系数评分（变异系数越低，分数越高）
  return Math.max(0, Math.round(100 - (cv * 200))); // 每0.5的变异系数扣100分
}

/**
 * 计算交易量一致性评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateVolumeConsistencyScore(pool) {
  const { volumeHistory } = pool;
  if (!volumeHistory || volumeHistory.length < 2) return 50; // 默认中等分数
  
  // 计算日变化率的平均值
  const changes = [];
  for (let i = 1; i < volumeHistory.length; i++) {
    const change = Math.abs((volumeHistory[i].volume - volumeHistory[i-1].volume) / volumeHistory[i-1].volume);
    changes.push(change);
  }
  
  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  
  // 变化率评分（变化率越低，分数越高）
  return Math.max(0, Math.round(100 - (avgChange * 200))); // 每50%的平均变化率扣100分
}

/**
 * 计算流动性稳定性评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateLiquidityStabilityScore(pool) {
  const { liquidityHistory } = pool;
  if (!liquidityHistory || liquidityHistory.length < 2) return 50; // 默认中等分数
  
  // 计算日变化率的平均值
  const changes = [];
  for (let i = 1; i < liquidityHistory.length; i++) {
    const change = Math.abs((liquidityHistory[i].liquidity - liquidityHistory[i-1].liquidity) / liquidityHistory[i-1].liquidity);
    changes.push(change);
  }
  
  const avgChange = changes.reduce((sum, change) => sum + change, 0) / changes.length;
  
  // 变化率评分（变化率越低，分数越高）
  return Math.max(0, Math.round(100 - (avgChange * 300))); // 每33%的平均变化率扣100分
}

/**
 * 计算最优价格区间
 * @param {Object} pool - 池子数据
 * @returns {Object} 价格区间建议
 */
export function calculateOptimalPriceRange(pool) {
  const { enhanced: { activeBin, liquidityDistribution }, type } = pool;
  const currentPrice = activeBin.price;
  
  // 根据池子类型确定价格区间范围
  let rangePercentage;
  switch (type) {
    case 'stable':
      rangePercentage = 0.02; // 稳定币对：±2%
      break;
    case 'medium':
      rangePercentage = 0.08; // 中等波动币对：±8%
      break;
    case 'volatile':
      rangePercentage = 0.15; // 高波动币对：±15%
      break;
    default:
      rangePercentage = 0.05; // 默认：±5%
  }
  
  return {
    min: currentPrice * (1 - rangePercentage),
    max: currentPrice * (1 + rangePercentage),
    current: currentPrice,
    optimal_range_percentage: rangePercentage * 100
  };
}

/**
 * 确定Bin分布策略
 * @param {Object} pool - 池子数据
 * @returns {string} 分布策略
 */
export function determineBinDistribution(pool) {
  const { type, volatility } = pool;
  
  if (type === 'stable' || volatility < 0.01) {
    return "集中式"; // 80%流动性集中在中心价格区间
  } else if (volatility > 0.05) {
    return "梯度式"; // 从中心向边缘递减分布
  } else {
    return "平衡式"; // 均匀分布
  }
}

/**
 * 计算最优Bin步长
 * @param {Object} pool - 池子数据
 * @returns {number} bin步长
 */
export function calculateOptimalBinStep(pool) {
  const { type, volatility } = pool;
  
  if (type === 'stable') {
    return 1; // 稳定币对使用最小步长
  } else if (type === 'volatile' || volatility > 0.05) {
    return 100; // 高波动币对使用大步长
  } else {
    return 50; // 中等波动币对使用中等步长
  }
} 