/**
 * Meteora 池数据快照模型
 * 用于存储不同时间粒度的池数据快照
 */

import mongoose, { Document, Schema } from 'mongoose';

// 基础快照接口
interface IBaseSnapshot {
  poolAddress: string;
  timestamp: Date;
  liquidity: number;
  currentPrice: number;
  reserves: {
    tokenA: number;
    tokenB: number;
  };
  fees: number;
  volume: number;
  apr: number;
  feesToTVL: number;
}

// 小时快照接口
export interface IHourlySnapshot extends Document, IBaseSnapshot {
  hour: number;
  day: number;
  month: number;
  year: number;
  liquidity_change_1h: number;
  price_change_1h: number;
  volume_change_1h: number;
  fee_to_volume_ratio: number;
  capital_efficiency: number;
}

// 日快照接口
export interface IDailySnapshot extends Document, IBaseSnapshot {
  day: number;
  month: number;
  year: number;
  liquidity_change_24h: number;
  price_change_24h: number;
  volume_change_24h: number;
  price_volatility_24h: number;
  fee_apy: number;
  capital_efficiency_24h: number;
}

// 周快照接口
export interface IWeeklySnapshot extends Document, IBaseSnapshot {
  week: number;
  year: number;
  liquidity_change_7d: number;
  price_change_7d: number;
  volume_change_7d: number;
  price_volatility_7d: number;
  liquidity_stability: number;
  avg_capital_efficiency_7d: number;
}

// 小时快照 Schema
const HourlySnapshotSchema = new Schema<IHourlySnapshot>(
  {
    poolAddress: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    hour: { type: Number, required: true },
    day: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    liquidity: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    reserves: {
      tokenA: { type: Number, required: true },
      tokenB: { type: Number, required: true },
    },
    fees: { type: Number, required: true },
    volume: { type: Number, required: true },
    apr: { type: Number, required: true },
    feesToTVL: { type: Number, required: true },
    liquidity_change_1h: { type: Number, default: 0 },
    price_change_1h: { type: Number, default: 0 },
    volume_change_1h: { type: Number, default: 0 },
    fee_to_volume_ratio: { type: Number, default: 0 },
    capital_efficiency: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 日快照 Schema
const DailySnapshotSchema = new Schema<IDailySnapshot>(
  {
    poolAddress: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    day: { type: Number, required: true },
    month: { type: Number, required: true },
    year: { type: Number, required: true },
    liquidity: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    reserves: {
      tokenA: { type: Number, required: true },
      tokenB: { type: Number, required: true },
    },
    fees: { type: Number, required: true },
    volume: { type: Number, required: true },
    apr: { type: Number, required: true },
    feesToTVL: { type: Number, required: true },
    liquidity_change_24h: { type: Number, default: 0 },
    price_change_24h: { type: Number, default: 0 },
    volume_change_24h: { type: Number, default: 0 },
    price_volatility_24h: { type: Number, default: 0 },
    fee_apy: { type: Number, default: 0 },
    capital_efficiency_24h: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 周快照 Schema
const WeeklySnapshotSchema = new Schema<IWeeklySnapshot>(
  {
    poolAddress: { type: String, required: true, index: true },
    timestamp: { type: Date, required: true, index: true },
    week: { type: Number, required: true },
    year: { type: Number, required: true },
    liquidity: { type: Number, required: true },
    currentPrice: { type: Number, required: true },
    reserves: {
      tokenA: { type: Number, required: true },
      tokenB: { type: Number, required: true },
    },
    fees: { type: Number, required: true },
    volume: { type: Number, required: true },
    apr: { type: Number, required: true },
    feesToTVL: { type: Number, required: true },
    liquidity_change_7d: { type: Number, default: 0 },
    price_change_7d: { type: Number, default: 0 },
    volume_change_7d: { type: Number, default: 0 },
    price_volatility_7d: { type: Number, default: 0 },
    liquidity_stability: { type: Number, default: 0 },
    avg_capital_efficiency_7d: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// 创建复合索引以提高查询性能
HourlySnapshotSchema.index({ poolAddress: 1, timestamp: 1 }, { unique: true });
HourlySnapshotSchema.index({ poolAddress: 1, year: 1, month: 1, day: 1, hour: 1 }, { unique: true });

DailySnapshotSchema.index({ poolAddress: 1, timestamp: 1 }, { unique: true });
DailySnapshotSchema.index({ poolAddress: 1, year: 1, month: 1, day: 1 }, { unique: true });

WeeklySnapshotSchema.index({ poolAddress: 1, timestamp: 1 }, { unique: true });
WeeklySnapshotSchema.index({ poolAddress: 1, year: 1, week: 1 }, { unique: true });

// 创建并导出模型
export const HourlySnapshot = mongoose.model<IHourlySnapshot>('PoolHourlySnapshot', HourlySnapshotSchema);
export const DailySnapshot = mongoose.model<IDailySnapshot>('PoolDailySnapshot', DailySnapshotSchema);
export const WeeklySnapshot = mongoose.model<IWeeklySnapshot>('PoolWeeklySnapshot', WeeklySnapshotSchema); 