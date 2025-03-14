/**
 * 健康评分计算器
 * 负责计算流动性池的健康分数
 */

const { RiskLevel } = require('../types');
const logger = require('../utils/logger');

class HealthScoreCalculator {
  /**
   * 计算健康分数
   * @param {string} poolAddress 池地址
   * @param {number} priceVolatility 价格波动性 (0-1)
   * @param {number} tvlChangePercent TVL变化百分比 (-1 to 1)
   * @param {number} volumeChangePercent 交易量变化百分比 (-1 to 1)
   * @param {number} whaleWithdrawalPercent 大户提款百分比 (0-1)
   * @param {number} tokenImbalanceRatio 代币不平衡比例 (-1 to 1, 0是平衡)
   * @param {number} previousScore 上一次的分数 (可选)
   * @returns {Object} 健康分数结果
   */
  static calculateHealthScore(
    poolAddress,
    priceVolatility,
    tvlChangePercent,
    volumeChangePercent,
    whaleWithdrawalPercent,
    tokenImbalanceRatio,
    previousScore
  ) {
    // 1. 计算原始分数 (0-100)
    const priceRiskScore = 1 + (1 - Math.min(1, priceVolatility * 10)) * 4;
    const liquidityRiskScore = 1 + (1 - Math.min(1, Math.abs(tvlChangePercent) * 5)) * 4;
    const tradingRiskScore = 1 + (1 - Math.min(1, Math.abs(volumeChangePercent) * 5)) * 4;
    const whaleRiskScore = 1 + (1 - Math.min(1, whaleWithdrawalPercent * 10)) * 4;
    const imbalanceRiskScore = 1 + (1 - Math.min(1, Math.abs(tokenImbalanceRatio) * 5)) * 4;

    // 2. 计算加权分数
    const overallScore = priceRiskScore * 0.3 +
      liquidityRiskScore * 0.25 +
      tradingRiskScore * 0.2 +
      whaleRiskScore * 0.15 +
      imbalanceRiskScore * 0.1;

    // 3. 确定风险等级
    let riskLevel;
    if (overallScore >= 4.5) {
      riskLevel = RiskLevel.EXTREMELY_LOW;
    } else if (overallScore >= 3.5) {
      riskLevel = RiskLevel.LOW;
    } else if (overallScore >= 2.5) {
      riskLevel = RiskLevel.MEDIUM;
    } else if (overallScore >= 1.5) {
      riskLevel = RiskLevel.HIGH;
    } else {
      riskLevel = RiskLevel.EXTREMELY_HIGH;
    }

    // 计算分数变化（如果提供了上一次分数）
    const scoreChange = previousScore !== undefined ? overallScore - previousScore : undefined;

    // 记录计算结果
    logger.debug(`健康分数已计算，池地址: ${poolAddress}: ${overallScore.toFixed(2)} (${riskLevel})`);
    if (scoreChange !== undefined) {
      const changeDirection = scoreChange > 0 ? '上升' : '下降';
      logger.debug(`分数${changeDirection}了 ${Math.abs(scoreChange).toFixed(2)} 点`);
    }

    // 返回结果
    return {
      poolAddress,
      timestamp: Date.now(),
      overallScore,
      components: {
        priceRiskScore,
        liquidityRiskScore,
        tradingRiskScore,
        whaleRiskScore,
        imbalanceRiskScore,
      },
      riskLevel,
      previousScore,
      scoreChange,
    };
  }

  /**
   * 将分数映射到风险等级
   * @param {number} score 分数
   * @returns {string} 风险等级
   */
  static mapScoreToRiskLevel(score) {
    if (score >= 4.5) {
      return RiskLevel.EXTREMELY_LOW;
    } else if (score >= 3.5) {
      return RiskLevel.LOW;
    } else if (score >= 2.5) {
      return RiskLevel.MEDIUM;
    } else if (score >= 1.5) {
      return RiskLevel.HIGH;
    } else {
      return RiskLevel.EXTREMELY_HIGH;
    }
  }
}

module.exports = HealthScoreCalculator; 