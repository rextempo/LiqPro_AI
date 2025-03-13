import { logger } from '../logger';
import { Signal, PoolData } from '../types';
import { publishSignal } from '../rabbitmq';

/**
 * 处理池数据并生成信号
 * @param poolData 池数据
 */
export const processPoolData = async (poolData: PoolData): Promise<void> => {
  try {
    logger.info(`处理池数据: ${poolData.poolId}`);
    
    // 生成信号
    const signals = await generateSignalsFromPoolData(poolData);
    
    // 发布信号
    for (const signal of signals) {
      await publishSignal(signal);
      logger.info(`信号已发布: ${signal.id}`);
    }
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
export const generateSignalsFromPoolData = async (poolData: PoolData): Promise<Partial<Signal>[]> => {
  try {
    logger.info(`从池数据生成信号: ${poolData.poolId}`);
    
    const signals: Partial<Signal>[] = [];
    
    // 简单的信号生成逻辑
    // 这里只是一个示例，实际应用中应该有更复杂的算法
    
    // 价格变化超过5%时生成信号
    if (Math.abs(poolData.priceChange24h) > 0.05) {
      const action = poolData.priceChange24h > 0 ? 'BUY' : 'SELL';
      const confidence = Math.min(Math.abs(poolData.priceChange24h) * 10, 1); // 0-1之间的置信度
      
      signals.push({
        poolId: poolData.poolId,
        tokenA: poolData.tokenA,
        tokenB: poolData.tokenB,
        action: action as 'BUY' | 'SELL',
        confidence,
        price: poolData.price,
        reason: `价格24小时变化: ${(poolData.priceChange24h * 100).toFixed(2)}%`,
        metadata: {
          volume24h: poolData.volume24h,
          liquidity: poolData.liquidity
        }
      });
      
      logger.info(`为池 ${poolData.poolId} 生成了 ${action} 信号，置信度: ${confidence}`);
    } else {
      logger.info(`池 ${poolData.poolId} 的价格变化不足以生成信号`);
    }
    
    return signals;
  } catch (error) {
    logger.error('生成信号失败:', error);
    return [];
  }
}; 