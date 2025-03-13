import { v4 as uuidv4 } from 'uuid';
import { logger } from '../logger';
import { publishSignal } from '../rabbitmq';
import { 
  Signal, 
  SignalType, 
  SignalStrength, 
  SignalTimeframe, 
  SignalReliability,
  PoolData
} from '../types';

/**
 * 处理池数据并生成交易信号
 * @param poolData 池数据
 */
export const processPoolData = async (poolData: any): Promise<void> => {
  try {
    logger.info('处理池数据', { poolAddress: poolData.address });
    
    // 生成信号
    const signals = generateSignalsFromPoolData(poolData);
    
    // 发布信号到队列
    for (const signal of signals) {
      await publishSignal(signal);
    }
    
    logger.info(`信号生成成功，共 ${signals.length} 个信号`, { 
      poolAddress: poolData.address 
    });
  } catch (error) {
    logger.error('处理池数据失败:', error);
    throw error;
  }
};

/**
 * 从池数据生成信号
 * @param poolData 池数据
 * @returns 生成的信号列表
 */
export const generateSignalsFromPoolData = (poolData: any): Signal[] => {
  const signals: Signal[] = [];
  
  // 简单的信号生成逻辑
  // 在实际应用中，这里应该有更复杂的分析和信号生成算法
  
  // 示例：如果流动性大于某个阈值，生成入场信号
  const liquidity = parseFloat(poolData.liquidity);
  if (liquidity > 100000) {
    signals.push(createEntrySignal(poolData));
  }
  
  // 示例：如果价格波动较大，生成风险警报
  if (poolData.priceVolatility && poolData.priceVolatility > 0.05) {
    signals.push(createRiskAlertSignal(poolData));
  }
  
  return signals;
};

/**
 * 创建入场信号
 * @param poolData 池数据
 * @returns 入场信号
 */
const createEntrySignal = (poolData: any): Signal => {
  const tokenPair = `${poolData.tokenXSymbol || 'Unknown'}-${poolData.tokenYSymbol || 'Unknown'}`;
  
  return {
    id: uuidv4(),
    poolAddress: poolData.address,
    tokenPair,
    type: SignalType.ENTRY,
    strength: SignalStrength.MODERATE,
    timeframe: SignalTimeframe.MEDIUM,
    reliability: SignalReliability.MODERATE,
    timestamp: Date.now(),
    expirationTimestamp: Date.now() + 24 * 60 * 60 * 1000, // 24小时后过期
    description: `${tokenPair} 池子流动性充足，建议入场`,
    suggestedAction: `向 ${tokenPair} 池子添加流动性，建议分配在当前价格附近的 bin`,
    factors: [
      {
        id: 'liquidity',
        name: '流动性',
        value: parseFloat(poolData.liquidity),
        weight: 0.7,
        description: '池子流动性充足'
      }
    ],
    metadata: {
      currentPrice: poolData.currentPrice,
      binStep: poolData.binStep,
      currentBinId: poolData.currentBinId
    }
  };
};

/**
 * 创建风险警报信号
 * @param poolData 池数据
 * @returns 风险警报信号
 */
const createRiskAlertSignal = (poolData: any): Signal => {
  const tokenPair = `${poolData.tokenXSymbol || 'Unknown'}-${poolData.tokenYSymbol || 'Unknown'}`;
  
  return {
    id: uuidv4(),
    poolAddress: poolData.address,
    tokenPair,
    type: SignalType.RISK_ALERT,
    strength: SignalStrength.STRONG,
    timeframe: SignalTimeframe.SHORT,
    reliability: SignalReliability.HIGH,
    timestamp: Date.now(),
    expirationTimestamp: Date.now() + 12 * 60 * 60 * 1000, // 12小时后过期
    description: `${tokenPair} 池子价格波动较大，存在风险`,
    suggestedAction: `考虑减少 ${tokenPair} 池子的流动性敞口或调整 bin 范围`,
    factors: [
      {
        id: 'volatility',
        name: '价格波动',
        value: poolData.priceVolatility || 0.05,
        weight: 0.8,
        description: '价格波动较大，可能导致无常损失'
      }
    ],
    metadata: {
      currentPrice: poolData.currentPrice,
      priceChange24h: poolData.priceChange24h
    }
  };
}; 