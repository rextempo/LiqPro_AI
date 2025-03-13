import { DecisionRecommendation, HealthScoreResult, RiskAssessmentResult, ScoringServiceConfig } from '../types';
/**
 * Scoring Controller
 * Manages the scoring process and interacts with other services
 */
export declare class ScoringController {
    private config;
    private isRunning;
    private scoringInterval;
    private healthScores;
    private riskAssessments;
    private recommendations;
    /**
     * Constructor
     * @param config Scoring service configuration
     */
    constructor(config: ScoringServiceConfig);
    /**
     * Start the scoring service
     */
    start(): Promise<void>;
    /**
     * Stop the scoring service
     */
    stop(): void;
    /**
     * Run a scoring cycle for all tracked pools
     */
    private runScoringCycle;
    /**
     * Process a single pool
     * @param poolAddress Pool address
     */
    private processPool;
    /**
     * Get tracked pools from data service
     * @returns Array of tracked pools
     */
    private getTrackedPools;
    /**
     * Get pool data from data service
     * @param poolAddress Pool address
     * @returns Pool data
     */
    private getPoolData;
    /**
     * Get historical data for a pool
     * @param poolAddress Pool address
     * @returns Historical pool data
     */
    private getHistoricalData;
    /**
     * Calculate price volatility based on historical data
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns Price volatility (0-1)
     */
    private calculatePriceVolatility;
    /**
     * Calculate recent price change
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns Recent price change (-1 to 1)
     */
    private calculateRecentPriceChange;
    /**
     * Calculate TVL change
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns TVL change percentage (-1 to 1)
     */
    private calculateTVLChange;
    /**
     * Calculate liquidity depth
     * @param poolData Current pool data
     * @returns Liquidity depth (0-1, higher is better)
     */
    private calculateLiquidityDepth;
    /**
     * Calculate volume change
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns Volume change percentage (-1 to 1)
     */
    private calculateVolumeChange;
    /**
     * Calculate slippage estimate
     * @param poolData Current pool data
     * @returns Slippage estimate (0-1)
     */
    private calculateSlippageEstimate;
    /**
     * Get percentage of pool held by large holders
     * @param poolAddress Pool address
     * @returns Percentage of pool held by large holders (0-1)
     */
    private getLargeHoldersPercentage;
    /**
     * Get recent whale withdrawals
     * @param poolAddress Pool address
     * @returns Recent whale withdrawals as percentage of pool (0-1)
     */
    private getRecentWhaleWithdrawals;
    /**
     * Calculate token imbalance ratio
     * @param poolData Current pool data
     * @returns Token imbalance ratio (-1 to 1, 0 is balanced)
     */
    private calculateTokenImbalance;
    /**
     * Store health score result
     * @param poolAddress Pool address
     * @param healthScore Health score result
     */
    private storeHealthScore;
    /**
     * Store risk assessment result
     * @param poolAddress Pool address
     * @param riskAssessment Risk assessment result
     */
    private storeRiskAssessment;
    /**
     * Store recommendation result
     * @param poolAddress Pool address
     * @param recommendation Decision recommendation
     */
    private storeRecommendation;
    /**
     * Get health scores for a pool
     * @param poolAddress Pool address
     * @param limit Maximum number of scores to return
     * @returns Array of health scores
     */
    getHealthScores(poolAddress: string, limit?: number): HealthScoreResult[];
    /**
     * Get risk assessments for a pool
     * @param poolAddress Pool address
     * @param limit Maximum number of assessments to return
     * @returns Array of risk assessments
     */
    getRiskAssessments(poolAddress: string, limit?: number): RiskAssessmentResult[];
    /**
     * Get recommendations for a pool
     * @param poolAddress Pool address
     * @param limit Maximum number of recommendations to return
     * @returns Array of recommendations
     */
    getRecommendations(poolAddress: string, limit?: number): DecisionRecommendation[];
    /**
     * Get latest health score for a pool
     * @param poolAddress Pool address
     * @returns Latest health score or null if not available
     */
    getLatestHealthScore(poolAddress: string): HealthScoreResult | null;
    /**
     * Get latest risk assessment for a pool
     * @param poolAddress Pool address
     * @returns Latest risk assessment or null if not available
     */
    getLatestRiskAssessment(poolAddress: string): RiskAssessmentResult | null;
    /**
     * Get latest recommendation for a pool
     * @param poolAddress Pool address
     * @returns Latest recommendation or null if not available
     */
    getLatestRecommendation(poolAddress: string): DecisionRecommendation | null;
}
//# sourceMappingURL=scoring-controller.d.ts.map