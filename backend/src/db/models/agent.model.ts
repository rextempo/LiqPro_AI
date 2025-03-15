/**
 * 代理模型定义
 * 创建于: 2025-03-16
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsNotEmpty, Min, Max, IsEnum, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseEntity, Strategy, Status } from './types/base';
import { User } from './user.model';
import { Position } from './position.model';
import { ValidationError } from '../errors/validation.error';
import { Decimal } from 'decimal.js';

/** 策略参数接口 */
export interface StrategyParams {
  riskTolerance: number;      // 风险承受度 (0-1)
  maxPositionSize: number;    // 最大仓位规模
  minLiquidityRequired: number; // 最小流动性要求
  targetAPR: number;          // 目标年化收益率
  rebalanceThreshold: number; // 再平衡阈值
}

@Entity('agents')
export class Agent implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => User, user => user.agents)
  user: User;

  @Column()
  @IsNotEmpty({ message: '代理名称不能为空' })
  name: string;

  @Column()
  @IsEnum(Status)
  status: Status;

  @Column()
  @IsEnum(Strategy)
  strategy: Strategy;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  depositAmount: Decimal;

  @Column({ name: 'current_value', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  currentValue: Decimal;

  @Column({ name: 'profit_loss', type: 'decimal', precision: 20, scale: 9 })
  profitLoss: Decimal;

  @Column({ name: 'available_balance', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  availableBalance: Decimal;

  @Column({ name: 'positions_limit' })
  @Min(1)
  @Max(10)
  positionsLimit: number;

  @Column({ name: 'reserved_balance', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  @Max(1)
  reservedBalance: Decimal;

  @Column({ name: 'strategy_params', type: 'jsonb' })
  @ValidateNested()
  @Type(() => Object)
  strategyParams: StrategyParams;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Position, position => position.agent)
  positions: Position[];

  @BeforeInsert()
  @BeforeUpdate()
  validateBalances() {
    // 验证可用余额不超过当前价值
    if (this.availableBalance.greaterThan(this.currentValue)) {
      throw new ValidationError('可用余额不能超过当前价值');
    }

    // 验证保留余额比例
    const minRequired = this.currentValue.mul(this.reservedBalance);
    if (this.availableBalance.lessThan(minRequired)) {
      throw new ValidationError('可用余额不能低于保留余额要求');
    }
  }

  /**
   * 计算代理的投资能力
   * @returns 当前可投资金额
   */
  calculateInvestmentCapacity(): Decimal {
    const reservedAmount = this.currentValue.mul(this.reservedBalance);
    return this.availableBalance.sub(reservedAmount);
  }

  /**
   * 检查是否可以开新仓位
   * @returns 是否可以开新仓位
   */
  canOpenNewPosition(): boolean {
    return (
      this.status === 'active' &&
      this.positions.length < this.positionsLimit &&
      this.calculateInvestmentCapacity().greaterThan(0)
    );
  }

  /**
   * 计算代理的综合健康度
   * @returns 健康度评分 (1-5)
   */
  calculateOverallHealth(): number {
    if (!this.positions.length) return 5.0;

    // 计算加权平均健康度
    const totalValue = this.positions.reduce((sum, pos) => sum.add(pos.currentValue), new Decimal(0));
    const weightedHealth = this.positions.reduce((sum, pos) => {
      const weight = pos.currentValue.div(totalValue);
      return sum + (pos.healthScore * weight.toNumber());
    }, 0);

    return Number(weightedHealth.toFixed(1));
  }

  /**
   * 更新代理状态
   * @param newStatus 新状态
   */
  updateStatus(newStatus: Status): void {
    this.status = newStatus;
    // 如果停止，清空可用余额
    if (newStatus === 'stopped') {
      this.availableBalance = new Decimal(0);
    }
  }

  /**
   * 计算收益率
   * @returns 年化收益率
   */
  calculateAPR(): number {
    if (this.depositAmount.isZero()) return 0;
    return this.profitLoss.div(this.depositAmount).mul(100).toNumber();
  }
} 