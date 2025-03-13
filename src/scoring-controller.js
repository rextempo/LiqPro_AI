var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import axios from 'axios';
import { createLogger } from '@liqpro/monitoring';
import { HealthScoreCalculator } from '../models/health-score-calculator';
import { RiskAssessment } from '../models/risk-assessment';
import { DecisionRecommender } from '../models/decision-recommendation';
const logger = createLogger('scoring-service:controller');
/**
 * Scoring Controller
 * Manages the scoring process and interacts with other services
 */
export class ScoringController {
    /**
     * Constructor
     * @param config Scoring service configuration
     */
    constructor(config) {
        this.config = config;
        this.isRunning = false;
        this.scoringInterval = null;
        this.healthScores = new Map();
        this.riskAssessments = new Map();
        this.recommendations = new Map();
        logger.info('Scoring controller initialized');
    }
    /**
     * Start the scoring service
     */
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.isRunning) {
                logger.warn('Scoring service is already running');
                return;
            }
            logger.info('Starting scoring service');
            this.isRunning = true;
            // Start periodic scoring
            this.scoringInterval = setInterval(() => this.runScoringCycle(), this.config.scoringInterval);
            // Run initial scoring cycle
            yield this.runScoringCycle();
        });
    }
    /**
     * Stop the scoring service
     */
    stop() {
        if (!this.isRunning) {
            logger.warn('Scoring service is not running');
            return;
        }
        logger.info('Stopping scoring service');
        this.isRunning = false;
        if (this.scoringInterval) {
            clearInterval(this.scoringInterval);
            this.scoringInterval = null;
        }
    }
    /**
     * Run a scoring cycle for all tracked pools
     */
    runScoringCycle() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                logger.debug('Starting scoring cycle');
                // Get tracked pools from data service
                const trackedPools = yield this.getTrackedPools();
                // Process each pool
                for (const pool of trackedPools) {
                    try {
                        yield this.processPool(pool.poolAddress);
                    }
                    catch (error) {
                        logger.error(`Error processing pool ${pool.poolAddress}: ${error}`);
                    }
                }
                logger.debug('Scoring cycle completed');
            }
            catch (error) {
                logger.error(`Error in scoring cycle: ${error}`);
            }
        });
    }
    /**
     * Process a single pool
     * @param poolAddress Pool address
     */
    processPool(poolAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            logger.debug(`Processing pool ${poolAddress}`);
            try {
                // Get pool data from data service
                const poolData = yield this.getPoolData(poolAddress);
                // Get historical data for comparison
                const historicalData = yield this.getHistoricalData(poolAddress);
                // Calculate metrics
                const priceVolatility = this.calculatePriceVolatility(poolData, historicalData);
                const recentPriceChange = this.calculateRecentPriceChange(poolData, historicalData);
                const tvlChangePercent = this.calculateTVLChange(poolData, historicalData);
                const liquidityDepth = this.calculateLiquidityDepth(poolData);
                const volumeChangePercent = this.calculateVolumeChange(poolData, historicalData);
                const slippageEstimate = this.calculateSlippageEstimate(poolData);
                const largeHoldersPercent = yield this.getLargeHoldersPercentage(poolAddress);
                const recentWhaleWithdrawals = yield this.getRecentWhaleWithdrawals(poolAddress);
                const tokenImbalanceRatio = this.calculateTokenImbalance(poolData);
                // Get previous health score if available
                const previousScores = this.healthScores.get(poolAddress) || [];
                const previousScore = previousScores.length > 0 ? previousScores[0].overallScore : undefined;
                // Calculate health score
                const healthScore = HealthScoreCalculator.calculateHealthScore(poolAddress, priceVolatility, tvlChangePercent, volumeChangePercent, recentWhaleWithdrawals, tokenImbalanceRatio, previousScore);
                // Perform risk assessment
                const riskAssessment = RiskAssessment.assessRisks(poolAddress, priceVolatility, recentPriceChange, tvlChangePercent, liquidityDepth, volumeChangePercent, slippageEstimate, largeHoldersPercent, recentWhaleWithdrawals, tokenImbalanceRatio);
                // Generate recommendation
                const recommendation = DecisionRecommender.generateRecommendation(healthScore, riskAssessment);
                // Store results
                this.storeHealthScore(poolAddress, healthScore);
                this.storeRiskAssessment(poolAddress, riskAssessment);
                this.storeRecommendation(poolAddress, recommendation);
                logger.info(`Pool ${poolAddress} processed: score=${healthScore.overallScore.toFixed(2)}, action=${recommendation.recommendedAction}`);
            }
            catch (error) {
                logger.error(`Error processing pool ${poolAddress}: ${error}`);
                throw error;
            }
        });
    }
    /**
     * Get tracked pools from data service
     * @returns Array of tracked pools
     */
    getTrackedPools() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios.get(`${this.config.dataServiceUrl}/api/pools/tracked`);
                return response.data;
            }
            catch (error) {
                logger.error(`Error getting tracked pools: ${error}`);
                // Return mock data for development/testing when data-service is not available
                logger.warn('Using mock data for tracked pools as data-service is not available');
                return [
                    {
                        poolAddress: 'mock_pool_address_1',
                        name: 'SOL-USDC',
                        tokenX: { symbol: 'SOL' },
                        tokenY: { symbol: 'USDC' },
                    },
                    {
                        poolAddress: 'mock_pool_address_2',
                        name: 'BONK-SOL',
                        tokenX: { symbol: 'BONK' },
                        tokenY: { symbol: 'SOL' },
                    }
                ];
            }
        });
    }
    /**
     * Get pool data from data service
     * @param poolAddress Pool address
     * @returns Pool data
     */
    getPoolData(poolAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios.get(`${this.config.dataServiceUrl}/api/pools/${poolAddress}/latest`);
                return response.data;
            }
            catch (error) {
                logger.error(`Error getting pool data for ${poolAddress}: ${error}`);
                // Return mock data for development/testing when data-service is not available
                logger.warn(`Using mock data for pool ${poolAddress} as data-service is not available`);
                return {
                    poolAddress,
                    timestamp: Date.now(),
                    tokenX: {
                        mint: 'mock_mint_x',
                        symbol: poolAddress.includes('SOL-USDC') ? 'SOL' : 'BONK',
                        decimals: 9,
                        price: 100,
                        reserve: 1000,
                    },
                    tokenY: {
                        mint: 'mock_mint_y',
                        symbol: poolAddress.includes('SOL-USDC') ? 'USDC' : 'SOL',
                        decimals: poolAddress.includes('SOL-USDC') ? 6 : 9,
                        price: poolAddress.includes('SOL-USDC') ? 1 : 100,
                        reserve: 100000,
                    },
                    liquidity: 500000,
                    volume24h: 1000000,
                    fees24h: 5000,
                    priceRatio: poolAddress.includes('SOL-USDC') ? 100 : 0.01,
                    tvl: 200000,
                };
            }
        });
    }
    /**
     * Get historical data for a pool
     * @param poolAddress Pool address
     * @returns Historical pool data
     */
    getHistoricalData(poolAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get data for the last 24 hours
                const endTime = Date.now();
                const startTime = endTime - 24 * 60 * 60 * 1000;
                const response = yield axios.get(`${this.config.dataServiceUrl}/api/pools/${poolAddress}/data`, {
                    params: {
                        startTime,
                        endTime,
                    },
                });
                return response.data;
            }
            catch (error) {
                logger.error(`Error getting historical data for ${poolAddress}: ${error}`);
                // Return mock data for development/testing when data-service is not available
                logger.warn(`Using mock historical data for pool ${poolAddress} as data-service is not available`);
                // Generate 24 hourly data points
                const mockData = [];
                const now = Date.now();
                const basePrice = poolAddress.includes('SOL-USDC') ? 100 : 0.01;
                const baseTVL = 200000;
                const baseVolume = 1000000;
                for (let i = 0; i < 24; i++) {
                    const timestamp = now - (23 - i) * 60 * 60 * 1000;
                    // Add some random variation
                    const priceVariation = 1 + (Math.random() * 0.1 - 0.05); // ±5%
                    const tvlVariation = 1 + (Math.random() * 0.08 - 0.04); // ±4%
                    const volumeVariation = 1 + (Math.random() * 0.2 - 0.1); // ±10%
                    mockData.push({
                        poolAddress,
                        timestamp,
                        priceRatio: basePrice * priceVariation,
                        tvl: baseTVL * tvlVariation,
                        volume24h: baseVolume * volumeVariation,
                    });
                }
                return mockData;
            }
        });
    }
    /**
     * Calculate price volatility based on historical data
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns Price volatility (0-1)
     */
    calculatePriceVolatility(_currentData, historicalData) {
        if (historicalData.length < 2)
            return 0;
        // Calculate standard deviation of price changes
        const priceRatios = historicalData.map(data => data.priceRatio);
        const mean = priceRatios.reduce((sum, price) => sum + price, 0) / priceRatios.length;
        const squaredDiffs = priceRatios.map(price => Math.pow(price - mean, 2));
        const variance = squaredDiffs.reduce((sum, diff) => sum + diff, 0) / squaredDiffs.length;
        const stdDev = Math.sqrt(variance);
        const normalizedVolatility = Math.min(1, stdDev / mean);
        return normalizedVolatility;
    }
    /**
     * Calculate recent price change
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns Recent price change (-1 to 1)
     */
    calculateRecentPriceChange(currentData, historicalData) {
        if (historicalData.length < 2)
            return 0;
        // Get oldest data point in the last 24 hours
        const oldestData = historicalData[historicalData.length - 1];
        // Calculate percentage change
        const oldPrice = oldestData.priceRatio;
        const newPrice = currentData.priceRatio;
        return (newPrice - oldPrice) / oldPrice;
    }
    /**
     * Calculate TVL change
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns TVL change percentage (-1 to 1)
     */
    calculateTVLChange(currentData, historicalData) {
        if (historicalData.length < 2)
            return 0;
        // Get oldest data point in the last 24 hours
        const oldestData = historicalData[historicalData.length - 1];
        // Calculate percentage change
        const oldTVL = oldestData.tvl;
        const newTVL = currentData.tvl;
        return (newTVL - oldTVL) / oldTVL;
    }
    /**
     * Calculate liquidity depth
     * @param poolData Current pool data
     * @returns Liquidity depth (0-1, higher is better)
     */
    calculateLiquidityDepth(poolData) {
        // Simplified calculation - in a real implementation, this would be more complex
        // and consider the distribution of liquidity across price ranges
        const normalizedLiquidity = Math.min(1, poolData.liquidity / 1000000);
        return normalizedLiquidity;
    }
    /**
     * Calculate volume change
     * @param currentData Current pool data
     * @param historicalData Historical pool data
     * @returns Volume change percentage (-1 to 1)
     */
    calculateVolumeChange(currentData, historicalData) {
        if (historicalData.length < 2)
            return 0;
        // Get data from 24 hours ago
        const oldestData = historicalData[historicalData.length - 1];
        // Calculate percentage change
        const oldVolume = oldestData.volume24h;
        const newVolume = currentData.volume24h;
        return (newVolume - oldVolume) / oldVolume;
    }
    /**
     * Calculate slippage estimate
     * @param poolData Current pool data
     * @returns Slippage estimate (0-1)
     */
    calculateSlippageEstimate(poolData) {
        // Simplified calculation - in a real implementation, this would be more complex
        // and consider the actual liquidity distribution
        const slippageEstimate = Math.max(0, Math.min(1, 1 / (poolData.liquidity / 10000)));
        return slippageEstimate;
    }
    /**
     * Get percentage of pool held by large holders
     * @param poolAddress Pool address
     * @returns Percentage of pool held by large holders (0-1)
     */
    getLargeHoldersPercentage(poolAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const response = yield axios.get(`${this.config.dataServiceUrl}/api/pools/${poolAddress}/large-holders`);
                return response.data.percentage || 0;
            }
            catch (error) {
                logger.error(`Error getting large holders percentage for ${poolAddress}: ${error}`);
                // Return mock data for development/testing when data-service is not available
                logger.warn(`Using mock large holders data for pool ${poolAddress} as data-service is not available`);
                return 0.25; // 25% held by large holders
            }
        });
    }
    /**
     * Get recent whale withdrawals
     * @param poolAddress Pool address
     * @returns Recent whale withdrawals as percentage of pool (0-1)
     */
    getRecentWhaleWithdrawals(poolAddress) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Get whale activities for the last 24 hours
                const endTime = Date.now();
                const startTime = endTime - 24 * 60 * 60 * 1000;
                const response = yield axios.get(`${this.config.dataServiceUrl}/api/pools/${poolAddress}/whale-activities`, {
                    params: {
                        startTime,
                        endTime,
                        type: 'withdraw',
                    },
                });
                // Calculate total withdrawal percentage
                const activities = response.data;
                const totalWithdrawalPercentage = activities.reduce((sum, activity) => sum + activity.percentOfPool, 0);
                return Math.min(1, totalWithdrawalPercentage);
            }
            catch (error) {
                logger.error(`Error getting whale withdrawals for ${poolAddress}: ${error}`);
                // Return mock data for development/testing when data-service is not available
                logger.warn(`Using mock whale withdrawal data for pool ${poolAddress} as data-service is not available`);
                return 0.03; // 3% recent whale withdrawals
            }
        });
    }
    /**
     * Calculate token imbalance ratio
     * @param poolData Current pool data
     * @returns Token imbalance ratio (-1 to 1, 0 is balanced)
     */
    calculateTokenImbalance(poolData) {
        const tokenXValue = poolData.tokenX.reserve * poolData.tokenX.price;
        const tokenYValue = poolData.tokenY.reserve * poolData.tokenY.price;
        const totalValue = tokenXValue + tokenYValue;
        if (totalValue === 0)
            return 0;
        // Calculate imbalance ratio (-1 to 1)
        // Positive means more tokenX, negative means more tokenY
        const imbalance = (tokenXValue - tokenYValue) / totalValue;
        return imbalance;
    }
    /**
     * Store health score result
     * @param poolAddress Pool address
     * @param healthScore Health score result
     */
    storeHealthScore(poolAddress, healthScore) {
        // Get existing scores or create new array
        const scores = this.healthScores.get(poolAddress) || [];
        // Add new score at the beginning
        scores.unshift(healthScore);
        // Limit history length
        const maxHistory = 288; // 24 hours at 5-minute intervals
        if (scores.length > maxHistory) {
            scores.length = maxHistory;
        }
        // Update map
        this.healthScores.set(poolAddress, scores);
    }
    /**
     * Store risk assessment result
     * @param poolAddress Pool address
     * @param riskAssessment Risk assessment result
     */
    storeRiskAssessment(poolAddress, riskAssessment) {
        // Get existing assessments or create new array
        const assessments = this.riskAssessments.get(poolAddress) || [];
        // Add new assessment at the beginning
        assessments.unshift(riskAssessment);
        // Limit history length
        const maxHistory = 288; // 24 hours at 5-minute intervals
        if (assessments.length > maxHistory) {
            assessments.length = maxHistory;
        }
        // Update map
        this.riskAssessments.set(poolAddress, assessments);
    }
    /**
     * Store recommendation result
     * @param poolAddress Pool address
     * @param recommendation Decision recommendation
     */
    storeRecommendation(poolAddress, recommendation) {
        // Get existing recommendations or create new array
        const recommendations = this.recommendations.get(poolAddress) || [];
        // Add new recommendation at the beginning
        recommendations.unshift(recommendation);
        // Limit history length
        const maxHistory = 288; // 24 hours at 5-minute intervals
        if (recommendations.length > maxHistory) {
            recommendations.length = maxHistory;
        }
        // Update map
        this.recommendations.set(poolAddress, recommendations);
    }
    /**
     * Get health scores for a pool
     * @param poolAddress Pool address
     * @param limit Maximum number of scores to return
     * @returns Array of health scores
     */
    getHealthScores(poolAddress, limit) {
        const scores = this.healthScores.get(poolAddress) || [];
        return limit ? scores.slice(0, limit) : scores;
    }
    /**
     * Get risk assessments for a pool
     * @param poolAddress Pool address
     * @param limit Maximum number of assessments to return
     * @returns Array of risk assessments
     */
    getRiskAssessments(poolAddress, limit) {
        const assessments = this.riskAssessments.get(poolAddress) || [];
        return limit ? assessments.slice(0, limit) : assessments;
    }
    /**
     * Get recommendations for a pool
     * @param poolAddress Pool address
     * @param limit Maximum number of recommendations to return
     * @returns Array of recommendations
     */
    getRecommendations(poolAddress, limit) {
        const recommendations = this.recommendations.get(poolAddress) || [];
        return limit ? recommendations.slice(0, limit) : recommendations;
    }
    /**
     * Get latest health score for a pool
     * @param poolAddress Pool address
     * @returns Latest health score or null if not available
     */
    getLatestHealthScore(poolAddress) {
        const scores = this.healthScores.get(poolAddress) || [];
        return scores.length > 0 ? scores[0] : null;
    }
    /**
     * Get latest risk assessment for a pool
     * @param poolAddress Pool address
     * @returns Latest risk assessment or null if not available
     */
    getLatestRiskAssessment(poolAddress) {
        const assessments = this.riskAssessments.get(poolAddress) || [];
        return assessments.length > 0 ? assessments[0] : null;
    }
    /**
     * Get latest recommendation for a pool
     * @param poolAddress Pool address
     * @returns Latest recommendation or null if not available
     */
    getLatestRecommendation(poolAddress) {
        const recommendations = this.recommendations.get(poolAddress) || [];
        return recommendations.length > 0 ? recommendations[0] : null;
    }
}
