/**
 * 流动性池模型定义
 * 创建于: 2025-03-16
 */

import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsNotEmpty, Min, Max, IsEnum } from 'class-validator';
import { BaseEntity, Status, PoolTier, RiskLevel } from './types/base';
import { Position } from './position.model';
import { ValidationError } from '../errors/validation.error';
import { Decimal } from 'decimal.js';

@Entity('pools')
export class Pool implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  @IsNotEmpty({ message: '池名称不能为空' })
  name: string;

  @Column({ name: 'contract_address' })
  @IsNotEmpty({ message: '合约地址不能为空' })
  contractAddress: string;

  @Column()
  @IsEnum(Status)
  status: Status;

  @Column()
  @IsEnum(PoolTier)
  tier: PoolTier;

  @Column()
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @Column({ name: 'total_liquidity', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  totalLiquidity: Decimal;

  @Column({ name: 'available_liquidity', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  availableLiquidity: Decimal;

  @Column({ name: 'min_position_size', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  minPositionSize: Decimal;

  @Column({ name: 'max_position_size', type: 'decimal', precision: 20, scale: 9 })
  @Min(0)
  maxPositionSize: Decimal;

  @Column({ name: 'current_apy', type: 'decimal', precision: 5, scale: 2 })
  @Min(0)
  @Max(100)
  currentAPY: Decimal;

  @Column({ name: 'utilization_rate', type: 'decimal', precision: 5, scale: 2 })
  @Min(0)
  @Max(100)
  utilizationRate: Decimal;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Position, position => position.pool)
  positions: Position[];

  @BeforeInsert()
  @BeforeUpdate()
  validatePool() {
    // 验证可用流动性不超过总流动性
    if (this.availableLiquidity.greaterThan(this.totalLiquidity)) {
      throw new ValidationError('可用流动性不能超过总流动性');
    }

    // 验证最小仓位规模不超过最大仓位规模
    if (this.minPositionSize.greaterThan(this.maxPositionSize)) {
      throw new ValidationError('最小仓位规模不能超过最大仓位规模');
    }

    // 验证最大仓位规模不超过总流动性
    if (this.maxPositionSize.greaterThan(this.totalLiquidity)) {
      throw new ValidationError('最大仓位规模不能超过总流动性');
    }
  }

  /**
   * 检查是否可以开新仓位
   * @param size 仓位规模
   * @returns 是否可以开仓
   */
  canOpenPosition(size: Decimal): boolean {
    return (
      this.status === 'active' &&
      size.greaterThanOrEqualTo(this.minPositionSize) &&
      size.lessThanOrEqualTo(this.maxPositionSize) &&
      size.lessThanOrEqualTo(this.availableLiquidity)
    );
  }

  /**
   * 计算池的健康度
   * @returns 健康度评分 (1-5)
   */
  calculatePoolHealth(): number {
    // 基于利用率计算健康度
    const utilizationScore = 5 - (this.utilizationRate.toNumber() / 20);
    
    // 基于风险等级调整
    const riskAdjustment = {
      low: 1,
      medium: 0,
      high: -1
    }[this.riskLevel];

    const score = utilizationScore + riskAdjustment;
    return Math.max(1, Math.min(5, score));
  }

  /**
   * 更新池状态
   * @param newStatus 新状态
   */
  updateStatus(newStatus: Status): void {
    this.status = newStatus;
  }
} 