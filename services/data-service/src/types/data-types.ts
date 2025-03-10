import { EventType } from '../modules/collectors/event-collector';

/**
 * Pool data structure
 */
export interface PoolData {
  address: string;
  tokenA: {
    mint: string;
    decimals: number;
    reserve: bigint;
  };
  tokenB: {
    mint: string;
    decimals: number;
    reserve: bigint;
  };
  fee: number;
  tickSpacing: number;
  liquidity: bigint;
  sqrtPrice: bigint;
  currentTick: number;
  feeGrowthGlobalA: bigint;
  feeGrowthGlobalB: bigint;
  timestamp: number;
  slot: number;
}

/**
 * Pool event structure
 */
export interface PoolEvent {
  id: string;
  poolAddress: string;
  type: EventType;
  signature: string;
  blockTime: number;
  slot: number;
  data: any;
}

/**
 * Whale activity structure
 */
export interface WhaleActivity {
  id: string;
  poolAddress: string;
  type: EventType;
  signature: string;
  blockTime: number;
  slot: number;
  tokenA: {
    mint: string;
    amount: string;
    usdValue?: number;
  };
  tokenB: {
    mint: string;
    amount: string;
    usdValue?: number;
  };
  totalUsdValue?: number;
  walletAddress: string;
}

/**
 * Storage statistics structure
 */
export interface StorageStats {
  poolData: number;
  poolMetadata: number;
  events: number;
  tokenPrices: number;
  tokenMetadata: number;
  whaleActivities: number;
  pools: number;
  tokens: number;
  hotDataSize?: number;
  warmDataSize?: number;
  coldDataSize?: number;
  totalDataPoints?: number;
  oldestDataTimestamp?: number;
  newestDataTimestamp?: number;
}

/**
 * Price source enum
 */
export enum PriceSource {
  COINGECKO = 'coingecko',
  COINMARKETCAP = 'coinmarketcap',
  JUPITER = 'jupiter'
}

/**
 * Price volatility structure
 */
export interface PriceVolatility {
  tokenMint: string;
  source: PriceSource;
  oldPrice: number;
  newPrice: number;
  changePercentage: number;
  direction: 'up' | 'down';
  timestamp: number;
}

/**
 * Time period enum for data aggregation
 */
export enum TimePeriod {
  HOUR_1 = '1h',
  HOUR_4 = '4h',
  HOUR_12 = '12h',
  DAY_1 = '1d',
  WEEK_1 = '1w',
  MONTH_1 = '1m'
} 