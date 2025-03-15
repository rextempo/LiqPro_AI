/**
 * 用户模型定义
 * 创建于: 2025-03-16
 */

import { Entity, PrimaryGeneratedColumn, Column, OneToMany, BeforeInsert, BeforeUpdate } from 'typeorm';
import { IsNotEmpty, Length, Matches } from 'class-validator';
import { BaseEntity, isValidSolanaAddress } from './types/base';
import { Agent } from './agent.model';
import { ValidationError } from '../errors/validation.error';

@Entity('users')
export class User implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'wallet_address', unique: true })
  @IsNotEmpty({ message: '钱包地址不能为空' })
  @Matches(/^[1-9A-HJ-NP-Za-km-z]{32,44}$/, { message: '无效的 Solana 钱包地址' })
  walletAddress: string;

  @Column()
  @IsNotEmpty({ message: 'nonce 不能为空' })
  @Length(32, 64, { message: 'nonce 长度必须在 32-64 字符之间' })
  nonce: string;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;

  @OneToMany(() => Agent, agent => agent.user)
  agents: Agent[];

  @BeforeInsert()
  @BeforeUpdate()
  validateWalletAddress() {
    if (!isValidSolanaAddress(this.walletAddress)) {
      throw new ValidationError('无效的 Solana 钱包地址');
    }
  }

  /**
   * 获取用户的所有活跃代理
   * @returns 活跃状态的代理列表
   */
  getActiveAgents(): Agent[] {
    return this.agents?.filter(agent => agent.status === 'active') || [];
  }

  /**
   * 计算用户的总资产价值
   * @returns 所有代理的当前资产总和
   */
  getTotalAssetValue(): number {
    return this.agents?.reduce((sum, agent) => sum + agent.currentValue, 0) || 0;
  }

  /**
   * 计算用户的总盈亏
   * @returns 所有代理的盈亏总和
   */
  getTotalProfitLoss(): number {
    return this.agents?.reduce((sum, agent) => sum + agent.profitLoss, 0) || 0;
  }
} 