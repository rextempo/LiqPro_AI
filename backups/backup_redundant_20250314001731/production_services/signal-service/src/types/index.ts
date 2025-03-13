/**
 * 信号接口
 */
export interface Signal {
  id: string;
  timestamp: string;
  poolId: string;
  tokenA: string;
  tokenB: string;
  action: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  price?: number;
  reason?: string;
  metadata?: Record<string, any>;
}

/**
 * 策略接口
 */
export interface Strategy {
  id: string;
  name: string;
  description: string;
  active: boolean;
  parameters: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

/**
 * 池数据接口
 */
export interface PoolData {
  poolId: string;
  tokenA: string;
  tokenB: string;
  price: number;
  liquidity: number;
  volume24h: number;
  priceChange24h: number;
  timestamp: string;
  metadata?: Record<string, any>;
} 