/**
 * Meteora 池数据快照模型
 * 用于存储不同时间粒度的池数据快照
 */

const mongoose = require('mongoose');

// 小时快照 Schema
const HourlySnapshotSchema = new mongoose.Schema(
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
const DailySnapshotSchema = new mongoose.Schema(
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
const WeeklySnapshotSchema = new mongoose.Schema(
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
const HourlySnapshot = mongoose.model('PoolHourlySnapshot', HourlySnapshotSchema);
const DailySnapshot = mongoose.model('PoolDailySnapshot', DailySnapshotSchema);
const WeeklySnapshot = mongoose.model('PoolWeeklySnapshot', WeeklySnapshotSchema);

module.exports = {
  HourlySnapshot,
  DailySnapshot,
  WeeklySnapshot
}; 