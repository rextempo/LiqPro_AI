import { z } from 'zod';
import { PublicKey } from '@solana/web3.js';

// 获取推荐池子列表的查询参数schema
export const getRecommendedPoolsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 100),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  minTvl: z.string().optional().transform(val => val ? parseFloat(val) : 10000),
  minVolume: z.string().optional().transform(val => val ? parseFloat(val) : 20000),
  sortBy: z.enum(['volume', 'apy', 'tvl']).optional().default('volume'),
  order: z.enum(['asc', 'desc']).optional().default('desc')
});

// 获取池子详情的参数schema
export const getPoolDetailSchema = z.object({
  address: z.string().refine(
    (val) => {
      try {
        new PublicKey(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: 'Invalid Solana address' }
  )
});

// 获取监控池子列表的查询参数schema
export const getMonitoredPoolsSchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val) : 50),
  offset: z.string().optional().transform(val => val ? parseInt(val) : 0),
  status: z.enum(['active', 'inactive', 'all']).optional().default('all')
});

export const poolSchemas = {
  getRecommendedPoolsSchema,
  getPoolDetailSchema,
  getMonitoredPoolsSchema
}; 