/**
 * 风险评估
 * 分析流动性池的不同风险因素
 */

const HealthScoreCalculator = require('./health-score-calculator');
const logger = require('../utils/logger');

class RiskAssessment {
  /**
   * 评估池的风险
   * @param {string} poolAddress 池地址
   * @param {number} priceVolatility 价格波动性 (0-1)
   * @param {number} recentPriceChange 近期价格变化百分比 (-1 to 1)
   * @param {number} tvlChangePercent TVL变化百分比 (-1 to 1)
   * @param {number} liquidityDepth 流动性深度 (0-1, 越高越好)
   * @param {number} volumeChangePercent 交易量变化百分比 (-1 to 1)
   * @param {number} slippageEstimate 标准交易的滑点估计 (0-1)
   * @param {number} largeHoldersPercent 大户持有的池份额百分比 (0-1)
   * @param {number} recentWhaleWithdrawals 近期大户提款占池的百分比 (0-1)
   * @param {number} tokenRatioImbalance 代币比例不平衡 (-1 to 1, 0是平衡)
   * @returns {Object} 风险评估结果
   */
  static assessRisks(
    poolAddress,
    priceVolatility,
    recentPriceChange,
    tvlChangePercent,
    liquidityDepth,
    volumeChangePercent,
    slippageEstimate,
    largeHoldersPercent,
    recentWhaleWithdrawals,
    tokenRatioImbalance
  ) {
    // 计算各个风险分数 (1-5分制，分数越高风险越低)
    const priceRiskScore = this.calculatePriceRiskScore(priceVolatility, recentPriceChange);
    const liquidityRiskScore = this.calculateLiquidityRiskScore(tvlChangePercent, liquidityDepth);
    const tradingRiskScore = this.calculateTradingRiskScore(volumeChangePercent, slippageEstimate);
    const whaleRiskScore = this.calculateWhaleRiskScore(largeHoldersPercent, recentWhaleWithdrawals);
    const imbalanceRiskScore = this.calculateImbalanceRiskScore(tokenRatioImbalance);

    // 将分数映射到风险等级
    const priceRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(priceRiskScore);
    const liquidityRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(liquidityRiskScore);
    const tradingRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(tradingRiskScore);
    const whaleRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(whaleRiskScore);
    const imbalanceRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(imbalanceRiskScore);

    // 记录评估结果
    logger.debug(`风险评估已完成，池地址: ${poolAddress}`);
    logger.debug(`价格风险: ${priceRiskScore.toFixed(2)} (${priceRiskLevel})`);
    logger.debug(`流动性风险: ${liquidityRiskScore.toFixed(2)} (${liquidityRiskLevel})`);
    logger.debug(`交易风险: ${tradingRiskScore.toFixed(2)} (${tradingRiskLevel})`);
    logger.debug(`大户风险: ${whaleRiskScore.toFixed(2)} (${whaleRiskLevel})`);
    logger.debug(`不平衡风险: ${imbalanceRiskScore.toFixed(2)} (${imbalanceRiskLevel})`);

    // 返回评估结果
    return {
      poolAddress,
      timestamp: Date.now(),
      priceRisk: {
        level: priceRiskLevel,
        volatility: priceVolatility,
        recentChange: recentPriceChange,
      },
      liquidityRisk: {
        level: liquidityRiskLevel,
        tvlChangePercent,
        depth: liquidityDepth,
      },
      tradingRisk: {
        level: tradingRiskLevel,
        volumeChangePercent,
        slippageEstimate,
      },
      whaleRisk: {
        level: whaleRiskLevel,
        largeHoldersPercent,
        recentWithdrawals: recentWhaleWithdrawals,
      },
      imbalanceRisk: {
        level: imbalanceRiskLevel,
        tokenRatioImbalance,
      },
    };
  }

  /**
   * 计算价格风险分数
   * @param {number} volatility 价格波动性 (0-1)
   * @param {number} recentChange 近期价格变化百分比 (-1 to 1)
   * @returns {number} 价格风险分数 (1-5, 分数越高风险越低)
   */
  static calculatePriceRiskScore(volatility, recentChange) {
    // 波动性权重大于近期变化
    const volatilityScore = 1 + (1 - Math.min(1, volatility * 10)) * 4;
    const changeScore = 1 + (1 - Math.min(1, Math.abs(recentChange) * 5)) * 4;
    return volatilityScore * 0.7 + changeScore * 0.3;
  }

  /**
   * 计算流动性风险分数
   * @param {number} tvlChangePercent TVL变化百分比 (-1 to 1)
   * @param {number} liquidityDepth 流动性深度 (0-1, 越高越好)
   * @returns {number} 流动性风险分数 (1-5, 分数越高风险越低)
   */
  static calculateLiquidityRiskScore(tvlChangePercent, liquidityDepth) {
    // TVL变化和流动性深度同等重要
    const tvlChangeScore = 1 + (1 - Math.min(1, Math.abs(tvlChangePercent) * 5)) * 4;
    const depthScore = 1 + Math.min(1, liquidityDepth * 2) * 4;
    return tvlChangeScore * 0.5 + depthScore * 0.5;
  }

  /**
   * 计算交易风险分数
   * @param {number} volumeChangePercent 交易量变化百分比 (-1 to 1)
   * @param {number} slippageEstimate 滑点估计 (0-1)
   * @returns {number} 交易风险分数 (1-5, 分数越高风险越低)
   */
  static calculateTradingRiskScore(volumeChangePercent, slippageEstimate) {
    // 滑点权重大于交易量变化
    const volumeChangeScore = 1 + (1 - Math.min(1, Math.abs(volumeChangePercent) * 5)) * 4;
    const slippageScore = 1 + (1 - Math.min(1, slippageEstimate * 20)) * 4;
    return volumeChangeScore * 0.3 + slippageScore * 0.7;
  }

  /**
   * 计算大户风险分数
   * @param {number} largeHoldersPercent 大户持有的池份额百分比 (0-1)
   * @param {number} recentWithdrawals 近期大户提款占池的百分比 (0-1)
   * @returns {number} 大户风险分数 (1-5, 分数越高风险越低)
   */
  static calculateWhaleRiskScore(largeHoldersPercent, recentWithdrawals) {
    // 近期提款权重大于持有比例
    const holdersScore = 1 + (1 - Math.min(1, largeHoldersPercent * 2)) * 4;
    const withdrawalsScore = 1 + (1 - Math.min(1, recentWithdrawals * 10)) * 4;
    return holdersScore * 0.4 + withdrawalsScore * 0.6;
  }

  /**
   * 计算不平衡风险分数
   * @param {number} tokenRatioImbalance 代币比例不平衡 (-1 to 1, 0是平衡)
   * @returns {number} 不平衡风险分数 (1-5, 分数越高风险越低)
   */
  static calculateImbalanceRiskScore(tokenRatioImbalance) {
    // 不平衡程度越低，分数越高
    return 1 + (1 - Math.min(1, Math.abs(tokenRatioImbalance) * 5)) * 4;
  }
}

module.exports = RiskAssessment; 