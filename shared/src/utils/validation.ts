import { PoolType, PoolRiskLevel } from '../constants/poolTypes';
import { POOL_CONFIG, RISK_CONFIG } from '../constants/poolTypes';

/**
 * 验证Solana地址
 * @param address Solana地址
 * @returns 是否有效
 */
export function isValidSolanaAddress(address: string): boolean {
  // Solana地址是base58编码的32字节
  const base58Regex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  return base58Regex.test(address);
}

/**
 * 验证金额
 * @param amount 金额
 * @param minAmount 最小金额
 * @param maxAmount 最大金额
 * @returns 是否有效
 */
export function isValidAmount(
  amount: number,
  minAmount: number = 0,
  maxAmount: number = Number.MAX_SAFE_INTEGER
): boolean {
  return amount >= minAmount && amount <= maxAmount;
}

/**
 * 验证池子配置
 * @param config 池子配置
 * @returns 是否有效
 */
export function validatePoolConfig(config: {
  type: PoolType;
  fee: number;
  tickSpacing?: number;
  amp?: number;
  weights?: { token0: number; token1: number };
}): boolean {
  const poolTypeConfig = POOL_CONFIG[config.type];
  
  // 验证手续费
  if (config.fee < poolTypeConfig.MIN_FEE || config.fee > poolTypeConfig.MAX_FEE) {
    return false;
  }
  
  // 根据池子类型验证特定参数
  switch (config.type) {
    case PoolType.CONCENTRATED: {
      const concentratedConfig = poolTypeConfig as typeof POOL_CONFIG[PoolType.CONCENTRATED];
      if (!config.tickSpacing || 
          config.tickSpacing < concentratedConfig.MIN_TICK_SPACING || 
          config.tickSpacing > concentratedConfig.MAX_TICK_SPACING) {
        return false;
      }
      break;
    }
      
    case PoolType.STABLE: {
      const stableConfig = poolTypeConfig as typeof POOL_CONFIG[PoolType.STABLE];
      if (!config.amp || 
          config.amp < stableConfig.MIN_AMP || 
          config.amp > stableConfig.MAX_AMP) {
        return false;
      }
      break;
    }
      
    case PoolType.WEIGHTED: {
      const weightedConfig = poolTypeConfig as typeof POOL_CONFIG[PoolType.WEIGHTED];
      if (!config.weights || 
          config.weights.token0 < weightedConfig.MIN_WEIGHT || 
          config.weights.token0 > weightedConfig.MAX_WEIGHT ||
          config.weights.token1 < weightedConfig.MIN_WEIGHT || 
          config.weights.token1 > weightedConfig.MAX_WEIGHT ||
          Math.abs(config.weights.token0 + config.weights.token1 - 1) > 0.0001) {
        return false;
      }
      break;
    }
  }
  
  return true;
}

/**
 * 验证风险配置
 * @param riskLevel 风险等级
 * @param config 风险配置
 * @returns 是否有效
 */
export function validateRiskConfig(
  riskLevel: PoolRiskLevel,
  config: {
    maxPriceImpact: number;
    maxSlippage: number;
    minLiquidity: number;
    maxExposure: number;
  }
): boolean {
  const riskConfig = RISK_CONFIG[riskLevel];
  
  return (
    config.maxPriceImpact <= riskConfig.maxPriceImpact &&
    config.maxSlippage <= riskConfig.maxSlippage &&
    config.minLiquidity >= riskConfig.minLiquidity &&
    config.maxExposure <= riskConfig.maxExposure
  );
}

/**
 * 验证Agent配置
 * @param config Agent配置
 * @returns 是否有效
 */
export function validateAgentConfig(config: {
  maxPositionSize: number;
  minPositionSize: number;
  targetAPY: number;
  maxSlippage: number;
  rebalanceThreshold: number;
}): boolean {
  return (
    config.maxPositionSize > 0 &&
    config.minPositionSize > 0 &&
    config.maxPositionSize >= config.minPositionSize &&
    config.targetAPY > 0 &&
    config.maxSlippage > 0 &&
    config.maxSlippage <= 1 &&
    config.rebalanceThreshold > 0 &&
    config.rebalanceThreshold <= 1
  );
}

/**
 * 验证API请求参数
 * @param params 请求参数
 * @returns 是否有效
 */
export function validateApiParams(params: {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}): boolean {
  if (params.page !== undefined && params.page < 1) {
    return false;
  }
  
  if (params.pageSize !== undefined && (params.pageSize < 1 || params.pageSize > 100)) {
    return false;
  }
  
  if (params.sortOrder && !['asc', 'desc'].includes(params.sortOrder)) {
    return false;
  }
  
  return true;
} 