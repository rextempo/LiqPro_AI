import { HealthScoreResult, RiskLevel } from '../types';
/**
 * Health Score Calculator
 * Implements the health score algorithm as defined in the product requirements
 */
export declare class HealthScoreCalculator {
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
    static calculateHealthScore(poolAddress: string, priceVolatility: number, tvlChangePercent: number, volumeChangePercent: number, whaleWithdrawalPercent: number, tokenImbalanceRatio: number, previousScore?: number): HealthScoreResult;
    /**
     * Map a score to a risk level
     * @param score The score to map
     * @returns The corresponding risk level
     */
    static mapScoreToRiskLevel(score: number): RiskLevel;
}
//# sourceMappingURL=health-score-calculator.d.ts.map