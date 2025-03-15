/**
 * 仓位模型定义
 * 创建于: 2025-03-16
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsNotEmpty, Min, Max, IsEnum } from 'class-validator';
import { BaseEntity, ExecutionStatus } from './types/base';
import { Agent } from './agent.model';
import { Pool } from './pool.model';
import { ValidationError } from '../errors/validation.error';
import { Decimal } from 'decimal.js';

@Entity('positions')
export class Position implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @ManyToOne(() => Agent, (agent: Agent) => agent.positions)
  agent!: Agent;

  @ManyToOne(() => Pool)
  pool!: Pool;

  @Column()
  @IsNotEmpty()
  @IsEnum(ExecutionStatus)
  status!: ExecutionStatus;

  @Column({ name: 'entry_price', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  entryPrice!: Decimal;

  @Column({ name: 'current_price', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  currentPrice!: Decimal;

  @Column({ name: 'position_size', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  positionSize!: Decimal;

  @Column({ name: 'current_value', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  currentValue!: Decimal;

  @Column({ name: 'unrealized_pnl', type: 'decimal', precision: 20, scale: 9 })
  unrealizedPnL!: Decimal;

  @Column({ name: 'health_score' })
  @Min(1)
  @Max(5)
  healthScore!: number;

  @Column({ name: 'liquidation_price', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  liquidationPrice!: Decimal;

  @Column({ name: 'created_at' })
  createdAt!: Date;

  @Column({ name: 'updated_at' })
  updatedAt!: Date;

  constructor() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeInsert()
  @BeforeUpdate()
  validatePosition() {
    // 验证仓位规模
    if (this.positionSize.isZero()) {
      throw new ValidationError('仓位规模不能为零');
    }

    // 验证当前价值计算
    const calculatedValue = this.positionSize.mul(this.currentPrice);
    if (!this.currentValue.equals(calculatedValue)) {
      throw new ValidationError('当前价值计算错误');
    }

    // 验证未实现盈亏
    const pnl = this.currentValue.sub(this.positionSize.mul(this.entryPrice));
    if (!this.unrealizedPnL.equals(pnl)) {
      throw new ValidationError('未实现盈亏计算错误');
    }
  }

  /**
   * 更新仓位状态
   * @param newStatus 新状态
   */
  updateStatus(newStatus: ExecutionStatus): void {
    this.status = newStatus;
  }

  /**
   * 计算仓位收益率
   * @returns 收益率百分比
   */
  calculateROI(): number {
    const initialValue = this.positionSize.mul(this.entryPrice);
    if (initialValue.isZero()) return 0;
    return this.unrealizedPnL.div(initialValue).mul(100).toNumber();
  }

  /**
   * 检查是否需要清算
   * @returns 是否需要清算
   */
  needsLiquidation(): boolean {
    return this.currentPrice.lessThanOrEqualTo(this.liquidationPrice);
  }

  /**
   * 检查是否已完成
   * @returns 是否已完成
   */
  isCompleted(): boolean {
    return this.status === ExecutionStatus.COMPLETED;
  }
} 