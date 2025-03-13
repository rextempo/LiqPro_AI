import { HealthScoreCalculator } from './health-score-calculator';
import { createLogger } from '@liqpro/monitoring';
const logger = createLogger('scoring-service:risk-assessment');
/**
 * Risk Assessment
 * Analyzes different risk factors for a liquidity pool
 */
export class RiskAssessment {
    /**
     * Assess the risks for a pool
     * @param poolAddress The pool address
     * @param priceVolatility Price volatility (0-1)
     * @param recentPriceChange Recent price change percentage (-1 to 1)
     * @param tvlChangePercent TVL change percentage (-1 to 1)
     * @param liquidityDepth Liquidity depth (0-1, higher is better)
     * @param volumeChangePercent Volume change percentage (-1 to 1)
     * @param slippageEstimate Slippage estimate for standard trade (0-1)
     * @param largeHoldersPercent Percentage of pool held by large holders (0-1)
     * @param recentWhaleWithdrawals Recent whale withdrawals as percentage of pool (0-1)
     * @param tokenRatioImbalance Token ratio imbalance (-1 to 1, 0 is balanced)
     * @returns Risk assessment result
     */
    static assessRisks(poolAddress, priceVolatility, recentPriceChange, tvlChangePercent, liquidityDepth, volumeChangePercent, slippageEstimate, largeHoldersPercent, recentWhaleWithdrawals, tokenRatioImbalance) {
        // Calculate individual risk scores (1-5 scale, higher is better/less risky)
        const priceRiskScore = this.calculatePriceRiskScore(priceVolatility, recentPriceChange);
        const liquidityRiskScore = this.calculateLiquidityRiskScore(tvlChangePercent, liquidityDepth);
        const tradingRiskScore = this.calculateTradingRiskScore(volumeChangePercent, slippageEstimate);
        const whaleRiskScore = this.calculateWhaleRiskScore(largeHoldersPercent, recentWhaleWithdrawals);
        const imbalanceRiskScore = this.calculateImbalanceRiskScore(tokenRatioImbalance);
        // Map scores to risk levels
        const priceRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(priceRiskScore);
        const liquidityRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(liquidityRiskScore);
        const tradingRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(tradingRiskScore);
        const whaleRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(whaleRiskScore);
        const imbalanceRiskLevel = HealthScoreCalculator.mapScoreToRiskLevel(imbalanceRiskScore);
        // Log assessment
        logger.debug(`Risk assessment completed for pool ${poolAddress}`);
        logger.debug(`Price risk: ${priceRiskScore.toFixed(2)} (${priceRiskLevel})`);
        logger.debug(`Liquidity risk: ${liquidityRiskScore.toFixed(2)} (${liquidityRiskLevel})`);
        logger.debug(`Trading risk: ${tradingRiskScore.toFixed(2)} (${tradingRiskLevel})`);
        logger.debug(`Whale risk: ${whaleRiskScore.toFixed(2)} (${whaleRiskLevel})`);
        logger.debug(`Imbalance risk: ${imbalanceRiskScore.toFixed(2)} (${imbalanceRiskLevel})`);
        // Return the assessment result
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
     * Calculate price risk score
     * @param volatility Price volatility (0-1)
     * @param recentChange Recent price change percentage (-1 to 1)
     * @returns Price risk score (1-5, higher is better/less risky)
     */
    static calculatePriceRiskScore(volatility, recentChange) {
        // Volatility has more weight than recent change
        const volatilityScore = 1 + (1 - Math.min(1, volatility * 10)) * 4;
        const changeScore = 1 + (1 - Math.min(1, Math.abs(recentChange) * 5)) * 4;
        return volatilityScore * 0.7 + changeScore * 0.3;
    }
    /**
     * Calculate liquidity risk score
     * @param tvlChangePercent TVL change percentage (-1 to 1)
     * @param depth Liquidity depth (0-1, higher is better)
     * @returns Liquidity risk score (1-5, higher is better/less risky)
     */
    static calculateLiquidityRiskScore(tvlChangePercent, depth) {
        // Negative TVL change is worse than positive
        const tvlChangeScore = tvlChangePercent < 0
            ? 1 + (1 - Math.min(1, Math.abs(tvlChangePercent) * 10)) * 4
            : 1 + (1 - Math.min(1, Math.abs(tvlChangePercent) * 5)) * 4;
        const depthScore = 1 + depth * 4;
        return tvlChangeScore * 0.6 + depthScore * 0.4;
    }
    /**
     * Calculate trading risk score
     * @param volumeChangePercent Volume change percentage (-1 to 1)
     * @param slippageEstimate Slippage estimate for standard trade (0-1)
     * @returns Trading risk score (1-5, higher is better/less risky)
     */
    static calculateTradingRiskScore(volumeChangePercent, slippageEstimate) {
        // Negative volume change is worse than positive
        const volumeChangeScore = volumeChangePercent < 0
            ? 1 + (1 - Math.min(1, Math.abs(volumeChangePercent) * 8)) * 4
            : 1 + (1 - Math.min(1, Math.abs(volumeChangePercent) * 4)) * 4;
        const slippageScore = 1 + (1 - Math.min(1, slippageEstimate * 20)) * 4;
        return volumeChangeScore * 0.5 + slippageScore * 0.5;
    }
    /**
     * Calculate whale risk score
     * @param largeHoldersPercent Percentage of pool held by large holders (0-1)
     * @param recentWithdrawals Recent whale withdrawals as percentage of pool (0-1)
     * @returns Whale risk score (1-5, higher is better/less risky)
     */
    static calculateWhaleRiskScore(largeHoldersPercent, recentWithdrawals) {
        const holdersScore = 1 + (1 - Math.min(1, largeHoldersPercent * 2)) * 4;
        const withdrawalsScore = 1 + (1 - Math.min(1, recentWithdrawals * 10)) * 4;
        // Recent withdrawals are more concerning than concentration
        return holdersScore * 0.4 + withdrawalsScore * 0.6;
    }
    /**
     * Calculate imbalance risk score
     * @param tokenRatioImbalance Token ratio imbalance (-1 to 1, 0 is balanced)
     * @returns Imbalance risk score (1-5, higher is better/less risky)
     */
    static calculateImbalanceRiskScore(tokenRatioImbalance) {
        return 1 + (1 - Math.min(1, Math.abs(tokenRatioImbalance) * 2)) * 4;
    }
}
