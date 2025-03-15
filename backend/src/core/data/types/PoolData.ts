export interface Bin {
  binId: string;
  price: string;
  totalLiquidity: string;
}

export interface PoolLiquidity {
  total: string;
}

export interface TokenInfo {
  mint: string;
  reserve: string;
  amount: number;
  symbol: string;
  decimals: number;
  price: number;
}

export interface PoolFees {
  base: string;
  max: string;
  protocol: string;
  today: number;
  last24h: number;
}

export interface PoolVolume {
  last24h: number;
  cumulative: string;
}

export interface PoolRewards {
  mintX: string;
  mintY: string;
  farmApr: number;
  farmApy: number;
}

export interface PoolYields {
  apr: number;
  fees24hTvl: number;
}

export interface PoolParameters {
  currentPrice: string;
  binStep: number;
  hide: boolean;
  isBlacklisted: boolean;
}

export interface PoolData {
  id: string;
  address: string;
  name: string;
  tokens: {
    tokenX: TokenInfo;
    tokenY: TokenInfo;
  };
  fees: PoolFees;
  volume: PoolVolume;
  liquidity: PoolLiquidity;
  rewards: PoolRewards;
  yields: PoolYields;
  parameters: PoolParameters;
  bins: Bin[];
  tags: string[];
  lastUpdate: string;
} 