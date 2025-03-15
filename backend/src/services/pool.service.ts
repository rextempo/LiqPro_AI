import { PoolData } from '../core/data/types/PoolData';

export interface PoolService {
  getPoolDetail(poolAddress: string): Promise<PoolData>;
} 