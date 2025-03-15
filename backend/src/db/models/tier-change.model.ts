/**
 * 池等级变更历史模型
 * 创建于: 2025-03-16
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert } from 'typeorm';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { BaseEntity, PoolTier } from './types/base';
import { Pool } from './pool.model';
import { ValidationError } from '../errors/validation.error';

@Entity('tier_changes')
export class TierChange implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pool)
  pool: Pool;

  @Column({ name: 'previous_tier' })
  @IsNotEmpty()
  @IsEnum(PoolTier)
  previousTier: PoolTier;

  @Column({ name: 'new_tier' })
  @IsNotEmpty()
  @IsEnum(PoolTier)
  newTier: PoolTier;

  @Column({ name: 'change_reason' })
  @IsNotEmpty({ message: '变更原因不能为空' })
  changeReason: string;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  validateTierChange() {
    // 验证新旧等级不能相同
    if (this.previousTier === this.newTier) {
      throw new ValidationError('新旧等级不能相同');
    }
  }

  /**
   * 检查是否为升级
   * @returns 是否为升级
   */
  isUpgrade(): boolean {
    const tierValues = {
      bronze: 1,
      silver: 2,
      gold: 3,
      platinum: 4
    };
    return tierValues[this.newTier] > tierValues[this.previousTier];
  }

  /**
   * 获取变更描述
   * @returns 变更描述文本
   */
  getChangeDescription(): string {
    const direction = this.isUpgrade() ? '升级' : '降级';
    return `池 ${this.pool.name} 从 ${this.previousTier} ${direction}到 ${this.newTier}，原因：${this.changeReason}`;
  }
} 