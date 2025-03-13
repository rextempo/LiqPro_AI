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
export function calculateConcentrationScore(distribution: any): number;
/**
 * 计算有效流动性比率
 * @param {Object} distribution - 流动性分布数据
 * @param {Object} activeBin - 当前活跃bin信息
 * @returns {number} 0-100的评分
 */
export function calculateEffectiveRatio(distribution: any, activeBin: any): number;
/**
 * 计算流动性深度评分
 * @param {Object} distribution - 流动性分布数据
 * @returns {number} 0-100的评分
 */
export function calculateDepthScore(distribution: any): number;
/**
 * 计算Bin覆盖率评分
 * @param {Object} distribution - 流动性分布数据
 * @returns {number} 0-100的评分
 */
export function calculateCoverageScore(distribution: any): number;
/**
 * 计算费用适应性评分
 * @param {Object} feeInfo - 费用信息
 * @returns {number} 0-100的评分
 */
export function calculateFeeAdaptabilityScore(feeInfo: any): number;
/**
 * 计算费用收集效率评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateFeeCollectionScore(pool: any): number;
/**
 * 计算费率竞争力评分
 * @param {Object} feeInfo - 费用信息
 * @returns {number} 0-100的评分
 */
export function calculateFeeCompetitivenessScore(feeInfo: any): number;
/**
 * 计算价格波动评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculatePriceVolatilityScore(pool: any): number;
/**
 * 计算收益稳定性评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateYieldStabilityScore(pool: any): number;
/**
 * 计算交易量一致性评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateVolumeConsistencyScore(pool: any): number;
/**
 * 计算流动性稳定性评分
 * @param {Object} pool - 池子数据
 * @returns {number} 0-100的评分
 */
export function calculateLiquidityStabilityScore(pool: any): number;
/**
 * 计算最优价格区间
 * @param {Object} pool - 池子数据
 * @returns {Object} 价格区间建议
 */
export function calculateOptimalPriceRange(pool: any): any;
/**
 * 确定Bin分布策略
 * @param {Object} pool - 池子数据
 * @returns {string} 分布策略
 */
export function determineBinDistribution(pool: any): string;
/**
 * 计算最优Bin步长
 * @param {Object} pool - 池子数据
 * @returns {number} bin步长
 */
export function calculateOptimalBinStep(pool: any): number;
