declare module '*/meteora/sdk' {
  import { Connection } from '@solana/web3.js';

  export class MeteoraDLMMSDK {
    constructor(connection: Connection);
    getAllPools(): Promise<Pool[]>;
    getActiveBinInfo(poolAddress: string): Promise<BinInfo>;
    getBinsDistribution(
      poolAddress: string,
      binId: number,
      range: number
    ): Promise<BinDistribution>;
    getPoolFeeInfo(poolAddress: string): Promise<FeeInfo>;
    getLiquidityDistribution(poolAddress: string): Promise<LiquidityDistribution>;
    getPriceHistory(poolAddress: string, days: number): Promise<PriceHistory[]>;
    getYieldHistory(poolAddress: string, days: number): Promise<YieldHistory[]>;
    getVolumeHistory(poolAddress: string, days: number): Promise<VolumeHistory[]>;
    getLiquidityHistory(poolAddress: string, days: number): Promise<LiquidityHistory[]>;
  }

  interface Pool {
    address: string;
    token_x: Token;
    token_y: Token;
    liquidity: number;
    trade_volume_24h: number;
    daily_yield: number;
    analysis?: {
      scores: {
        final_score: number;
        stability_score: number;
        base_performance_score: number;
      };
    };
  }

  interface Token {
    symbol: string;
    address: string;
  }

  interface BinInfo {
    binId: number;
    price: number;
    liquidity: number;
  }

  interface BinDistribution {
    bins: {
      id: number;
      liquidity: number;
      price: number;
    }[];
  }

  interface FeeInfo {
    fee: number;
    feeGrowth: number;
  }

  interface LiquidityDistribution {
    bins: {
      id: number;
      liquidity: number;
    }[];
  }

  interface PriceHistory {
    timestamp: number;
    price: number;
  }

  interface YieldHistory {
    timestamp: number;
    yield: number;
  }

  interface VolumeHistory {
    timestamp: number;
    volume: number;
  }

  interface LiquidityHistory {
    timestamp: number;
    liquidity: number;
  }
}

declare module '*/utils/logger' {
  export const logger: {
    info: (message: string, ...args: any[]) => void;
    warn: (message: string, ...args: any[]) => void;
    error: (message: string, ...args: any[]) => void;
  };
}

declare module '*/config' {
  export const config: {
    rpc: {
      endpoint: string;
    };
  };
}

declare module '*/signal/service' {
  import { Connection } from '@solana/web3.js';
  import { Pool } from '*/meteora/sdk';

  export class SignalService {
    constructor(
      connection: Connection,
      options?: {
        historyDays?: number;
        updateInterval?: number;
      }
    );

    analyzePools(pools: Pool[]): Promise<{
      timestamp: string;
      t1_pools: Pool[];
      t2_pools: Pool[];
      t3_pools: Pool[];
      stats: {
        avg_daily_yield: number;
        highest_yield_pool: string;
      };
      performance: {
        duration: number;
        poolsAnalyzed: number;
        timestamp: string;
      };
    }>;

    getEnhancedPoolData(pool: Pool): Promise<
      Pool & {
        enhanced: {
          activeBin: any;
          binsDistribution: any;
          feeInfo: any;
          liquidityDistribution: any;
          priceHistory: any[];
          yieldHistory: any[];
          volumeHistory: any[];
          liquidityHistory: any[];
        };
      }
    >;
  }
}
