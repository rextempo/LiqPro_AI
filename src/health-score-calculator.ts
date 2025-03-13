import { HealthScoreResult, RiskLevel } from '../types';
import { createLogger } from '@liqpro/monitoring';

const logger = createLogger('scoring-service:health-score-calculator');

/**
 * Health Score Calculator
 * Implements the health score algorithm as defined in the product requirements
 */
export class HealthScoreCalculator {
  /**
   * Calculate the health score for a pool
   * @param poolAddress The pool address
   * @param priceVolatility Price volatility (0-1)
   * @param tvlChangePercent TVL change percentage (-1 to 1)
   * @param volumeChangePercent Volume change percentage (-1 to 1)
   * @param whaleWithdrawalPercent Whale withdrawal percentage (0-1)
   * @param tokenImbalanceRatio Token imbalance ratio (-1 to 1)
   * @param previousScore Previous health score (optional)
   * @returns Health score result
   */
  public static calculateHealthScore(
    poolAddress: string,
    priceVolatility: number,
    tvlChangePercent: number,
    volumeChangePercent: number,
    whaleWithdrawalPercent: number,
    tokenImbalanceRatio: number,
    previousScore?: number
  ): HealthScoreResult {
    // 1. Calculate raw scores (0-100)
    const priceRiskRaw = 100 - Math.min(100, priceVolatility * 1000);
    const liquidityRiskRaw = 100 - Math.min(100, Math.abs(tvlChangePercent) * 5);
    const tradingRiskRaw = 100 - Math.min(100, Math.abs(volumeChangePercent) * 4);
    const whaleRiskRaw = 100 - Math.min(100, whaleWithdrawalPercent * 500);
    const imbalanceRiskRaw = 100 - Math.min(100, Math.abs(tokenImbalanceRatio) * 2.5);

    // 2. Normalize to 1-5 scale
    const priceRiskScore = 1 + (priceRiskRaw / 100) * 4;
    const liquidityRiskScore = 1 + (liquidityRiskRaw / 100) * 4;
    const tradingRiskScore = 1 + (tradingRiskRaw / 100) * 4;
    const whaleRiskScore = 1 + (whaleRiskRaw / 100) * 4;
    const imbalanceRiskScore = 1 + (imbalanceRiskRaw / 100) * 4;

    // 3. Calculate weighted score
    const overallScore =
      priceRiskScore * 0.3 +
      liquidityRiskScore * 0.25 +
      tradingRiskScore * 0.2 +
      whaleRiskScore * 0.15 +
      imbalanceRiskScore * 0.1;

    // 4. Determine risk level
    let riskLevel: RiskLevel;
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

    // Calculate score change if previous score is provided
    const scoreChange = previousScore !== undefined ? overallScore - previousScore : undefined;

    // Log the calculation
    logger.debug(`Health score calculated for pool ${poolAddress}: ${overallScore.toFixed(2)} (${riskLevel})`);
    if (scoreChange !== undefined) {
      const changeDirection = scoreChange > 0 ? 'increased' : 'decreased';
      logger.debug(`Score ${changeDirection} by ${Math.abs(scoreChange).toFixed(2)} points`);
    }

    // Return the result
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
   * Map a score to a risk level
   * @param score The score to map
   * @returns The corresponding risk level
   */
  public static mapScoreToRiskLevel(score: number): RiskLevel {
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