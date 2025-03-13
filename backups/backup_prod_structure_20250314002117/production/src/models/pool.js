/**
 * Meteora 池数据模型
 */

const mongoose = require('mongoose');

// 池 Schema
const PoolSchema = new mongoose.Schema(
  {
    address: { type: String, required: true, unique: true, index: true },
    tokenA: { type: String, required: true },
    tokenB: { type: String, required: true },
    tokenAAddress: { type: String, required: true },
    tokenBAddress: { type: String, required: true },
    feeTier: { type: Number, required: true },
    binStep: { type: Number, required: true },
    liquidity: { type: Number, required: true },
    volume24h: { type: Number, default: 0 },
    currentPrice: { type: Number, required: true },
    status: { type: String, enum: ['enabled', 'disabled'], default: 'enabled' },
    reserves: {
      tokenA: { type: Number, required: true },
      tokenB: { type: Number, required: true },
    },
    fees: {
      base: { type: Number, required: true },
      max: { type: Number, default: 0 },
      total24h: { type: Number, default: 0 },
    },
    volumeHistory: {
      cumulative: { type: Number, default: 0 },
      fees: { type: Number, default: 0 },
    },
    yields: {
      apr: { type: Number, default: 0 },
      feesToTVL: { type: Number, default: 0 },
      feesToTVLPercent: { type: Number, default: 0 },
    },
    tags: [{ type: String }],
    name: { type: String, required: true },
    lastUpdated: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// 创建索引以提高查询性能
PoolSchema.index({ tokenAAddress: 1, tokenBAddress: 1 });
PoolSchema.index({ volume24h: -1 });
PoolSchema.index({ 'yields.apr': -1 });

// 创建并导出模型
const Pool = mongoose.model('Pool', PoolSchema);

module.exports = { Pool }; 