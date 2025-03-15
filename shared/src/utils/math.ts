import { APYCalculationParams } from '../types/pool';
import { PoolRiskLevel } from '../constants/poolTypes';
import { RISK_CONFIG } from '../constants/poolTypes';

/**
 * 计算APY
 * @param params APY计算参数
 * @returns 年化收益率
 */
export function calculateAPY(params: APYCalculationParams): number {
  const { fees24h, rewards24h, totalLiquidity, priceImpact } = params;
  
  if (totalLiquidity <= 0) {
    throw new Error('总流动性必须大于0');
  }
  
  // 计算24小时总收益（手续费 + 奖励）
  const totalEarnings24h = fees24h + rewards24h;
  
  // 计算年化收益率
  const apy = (totalEarnings24h * 365) / totalLiquidity;
  
  // 考虑价格影响
  return apy * (1 - priceImpact);
}

/**
 * 计算价格影响
 * @param amount 交易金额
 * @param liquidity 流动性
 * @returns 价格影响百分比
 */
export function calculatePriceImpact(amount: number, liquidity: number): number {
  if (liquidity <= 0) {
    throw new Error('流动性必须大于0');
  }
  
  return amount / liquidity;
}

/**
 * 计算滑点
 * @param expectedPrice 预期价格
 * @param actualPrice 实际价格
 * @returns 滑点百分比
 */
export function calculateSlippage(expectedPrice: number, actualPrice: number): number {
  if (expectedPrice <= 0) {
    throw new Error('预期价格必须大于0');
  }
  
  return Math.abs(actualPrice - expectedPrice) / expectedPrice;
}

/**
 * 计算风险分数
 * @param riskLevel 风险等级
 * @param priceImpact 价格影响
 * @param slippage 滑点
 * @param liquidity 流动性
 * @returns 风险分数 (0-100)
 */
export function calculateRiskScore(
  riskLevel: PoolRiskLevel,
  priceImpact: number,
  slippage: number,
  liquidity: number
): number {
  const config = RISK_CONFIG[riskLevel];
  
  // 计算各项指标得分
  const priceImpactScore = Math.max(0, 100 - (priceImpact / config.maxPriceImpact) * 100);
  const slippageScore = Math.max(0, 100 - (slippage / config.maxSlippage) * 100);
  const liquidityScore = Math.min(100, (liquidity / config.minLiquidity) * 100);
  
  // 加权平均
  return (priceImpactScore * 0.4 + slippageScore * 0.3 + liquidityScore * 0.3);
}

/**
 * 计算最优价格范围
 * @param currentPrice 当前价格
 * @param volatility 波动率
 * @param riskLevel 风险等级
 * @returns 最优价格范围
 */
export function calculateOptimalPriceRange(
  currentPrice: number,
  volatility: number,
  riskLevel: PoolRiskLevel
): { min: number; max: number } {
  const config = RISK_CONFIG[riskLevel];
  
  // 根据风险等级和波动率计算价格范围
  const range = volatility * (1 + config.maxPriceImpact);
  
  return {
    min: currentPrice * (1 - range),
    max: currentPrice * (1 + range)
  };
}

/**
 * 计算复利
 * @param principal 本金
 * @param rate 年化利率
 * @param time 时间（年）
 * @param frequency 复利频率（每年次数）
 * @returns 最终金额
 */
export function calculateCompoundInterest(
  principal: number,
  rate: number,
  time: number,
  frequency: number = 365
): number {
  if (principal <= 0 || rate <= 0 || time <= 0 || frequency <= 0) {
    throw new Error('参数必须大于0');
  }
  
  return principal * Math.pow(1 + rate / frequency, frequency * time);
} 