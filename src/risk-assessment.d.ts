import { RiskAssessmentResult } from '../types';
/**
 * Risk Assessment
 * Analyzes different risk factors for a liquidity pool
 */
export declare class RiskAssessment {
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
    static assessRisks(poolAddress: string, priceVolatility: number, recentPriceChange: number, tvlChangePercent: number, liquidityDepth: number, volumeChangePercent: number, slippageEstimate: number, largeHoldersPercent: number, recentWhaleWithdrawals: number, tokenRatioImbalance: number): RiskAssessmentResult;
    /**
     * Calculate price risk score
     * @param volatility Price volatility (0-1)
     * @param recentChange Recent price change percentage (-1 to 1)
     * @returns Price risk score (1-5, higher is better/less risky)
     */
    private static calculatePriceRiskScore;
    /**
     * Calculate liquidity risk score
     * @param tvlChangePercent TVL change percentage (-1 to 1)
     * @param depth Liquidity depth (0-1, higher is better)
     * @returns Liquidity risk score (1-5, higher is better/less risky)
     */
    private static calculateLiquidityRiskScore;
    /**
     * Calculate trading risk score
     * @param volumeChangePercent Volume change percentage (-1 to 1)
     * @param slippageEstimate Slippage estimate for standard trade (0-1)
     * @returns Trading risk score (1-5, higher is better/less risky)
     */
    private static calculateTradingRiskScore;
    /**
     * Calculate whale risk score
     * @param largeHoldersPercent Percentage of pool held by large holders (0-1)
     * @param recentWithdrawals Recent whale withdrawals as percentage of pool (0-1)
     * @returns Whale risk score (1-5, higher is better/less risky)
     */
    private static calculateWhaleRiskScore;
    /**
     * Calculate imbalance risk score
     * @param tokenRatioImbalance Token ratio imbalance (-1 to 1, 0 is balanced)
     * @returns Imbalance risk score (1-5, higher is better/less risky)
     */
    private static calculateImbalanceRiskScore;
}
//# sourceMappingURL=risk-assessment.d.ts.map