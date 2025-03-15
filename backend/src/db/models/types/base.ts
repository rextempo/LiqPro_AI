/**
 * 基础模型类型定义
 * 创建于: 2025-03-16
 */

import { Decimal } from 'decimal.js';

/** 基础实体接口 */
export interface BaseEntity {
  createdAt: Date;
  updatedAt: Date;
}

/** 通用状态枚举 */
export enum Status {
  ACTIVE = 'active',
  PAUSED = 'paused',
  STOPPED = 'stopped'
}

/** 风险等级枚举 */
export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high'
}

/** 池子层级枚举 */
export enum PoolTier {
  T1 = 'T1',
  T2 = 'T2',
  T3 = 'T3',
  NONE = 'none'
}

/** 层级变化枚举 */
export enum TierChange {
  UPGRADE = 'upgrade',
  DOWNGRADE = 'downgrade',
  UNCHANGED = 'unchanged',
  INITIAL = 'initial'
}

/** 执行状态枚举 */
export enum ExecutionStatus {
  PENDING = 'pending',
  EXECUTING = 'executing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled'
}

/** 投资策略枚举 */
export enum Strategy {
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive'
}

/** 健康度评分范围验证 */
export const isValidHealthScore = (score: number): boolean => {
  return score >= 1.0 && score <= 5.0;
};

/** 百分比范围验证 */
export const isValidPercentage = (value: number): boolean => {
  return value >= 0 && value <= 1;
};

/** 金额验证 */
export const isValidAmount = (amount: Decimal): boolean => {
  return amount.isPositive() || amount.isZero();
};

/** 钱包地址验证 */
export const isValidSolanaAddress = (address: string): boolean => {
  return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
}; 