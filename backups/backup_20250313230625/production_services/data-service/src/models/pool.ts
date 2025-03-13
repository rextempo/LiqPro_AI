/**
 * Meteora 池数据模型
 */

import mongoose, { Document, Schema } from 'mongoose';

// 池数据历史记录接口
interface IPoolHistory {
  timestamp: Date;
  liquidity: number;
  volume24h: number;
  currentPrice: number;
  reserves: {
    tokenA: number;
    tokenB: number;
  };
  fees: {
    total24h: number;
  };
  yields: {
    apr: number;
    feesToTVL: number;
    feesToTVLPercent: number;
  };
}

// 池数据接口
export interface IPool extends Document {
  address: string;
  tokenA: string;
  tokenB: string;
  tokenAAddress: string;
  tokenBAddress: string;
  feeTier: number;
  binStep: number;
  liquidity: number;
  volume24h: number;
  currentPrice: number;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  reserves: {
    tokenA: number;
    tokenB: number;
  };
  fees: {
    base: number;
    max: number;
    total24h: number;
  };
  volumeHistory: {
    cumulative: number;
    fees: number;
  };
  yields: {
    apr: number;
    feesToTVL: number;
    feesToTVLPercent: number;
  };
  tags: string[];
  name: string;
  history: IPoolHistory[];
}

// 池历史记录 Schema
const PoolHistorySchema = new Schema<IPoolHistory>(
  {
    timestamp: { type: Date, required: true },
    liquidity: { type: Number, required: true },
    volume24h: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    reserves: {
      tokenA: { type: Number, required: true },
      tokenB: { type: Number, required: true },
    },
    fees: {
      total24h: { type: Number, required: true },
    },
    yields: {
      apr: { type: Number, required: true },
      feesToTVL: { type: Number, required: true },
      feesToTVLPercent: { type: Number, required: true },
    },
  },
  { _id: false }
);

// 池数据 Schema
const PoolSchema = new Schema<IPool>(
  {
    address: { type: String, required: true, unique: true, index: true },
    tokenA: { type: String, required: true, index: true },
    tokenB: { type: String, required: true, index: true },
    tokenAAddress: { type: String, required: true },
    tokenBAddress: { type: String, required: true },
    feeTier: { type: Number, required: true },
    binStep: { type: Number, required: true },
    liquidity: { type: Number, required: true },
    volume24h: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    status: { type: String, required: true, default: 'enabled' },
    createdAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    reserves: {
      tokenA: { type: Number, required: true },
      tokenB: { type: Number, required: true },
    },
    fees: {
      base: { type: Number, required: true },
      max: { type: Number, required: true },
      total24h: { type: Number, required: true },
    },
    volumeHistory: {
      cumulative: { type: Number, required: true },
      fees: { type: Number, required: true },
    },
    yields: {
      apr: { type: Number, required: true },
      feesToTVL: { type: Number, required: true },
      feesToTVLPercent: { type: Number, required: true },
    },
    tags: [{ type: String }],
    name: { type: String, required: true },
    history: [PoolHistorySchema],
  },
  { timestamps: true }
);

// 创建索引以提高查询性能
PoolSchema.index({ 'yields.apr': -1 });
PoolSchema.index({ volume24h: -1 });
PoolSchema.index({ liquidity: -1 });
PoolSchema.index({ 'fees.total24h': -1 });
PoolSchema.index({ tokenA: 1, tokenB: 1 });
PoolSchema.index({ updatedAt: -1 });

// 创建并导出模型
export const Pool = mongoose.model<IPool>('Pool', PoolSchema); 