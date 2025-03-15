/**
 * 策略执行历史模型
 * 创建于: 2025-03-16
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert } from 'typeorm';
import { IsNotEmpty, IsEnum } from 'class-validator';
import { BaseEntity, ExecutionStatus, Strategy } from './types/base';
import { Agent } from './agent.model';
import { Pool } from './pool.model';
import { ValidationError } from '../errors/validation.error';
import { Decimal } from 'decimal.js';

@Entity('strategy_executions')
export class StrategyExecution implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Agent)
  agent: Agent;

  @ManyToOne(() => Pool)
  pool: Pool;

  @Column()
  @IsEnum(Strategy)
  strategy: Strategy;

  @Column()
  @IsEnum(ExecutionStatus)
  status: ExecutionStatus;

  @Column({ name: 'execution_params', type: 'jsonb' })
  @IsNotEmpty()
  executionParams: Record<string, any>;

  @Column({ name: 'amount', type: 'decimal', precision: 20, scale: 9 })
  amount: Decimal;

  @Column({ name: 'execution_result', type: 'jsonb', nullable: true })
  executionResult?: Record<string, any>;

  @Column({ name: 'error_message', nullable: true })
  errorMessage?: string;

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  validateExecution() {
    // 验证执行参数
    if (!this.executionParams || Object.keys(this.executionParams).length === 0) {
      throw new ValidationError('执行参数不能为空');
    }

    // 验证金额
    if (this.amount.isNegative() || this.amount.isZero()) {
      throw new ValidationError('执行金额必须大于零');
    }

    // 验证失败状态必须有错误信息
    if (this.status === 'failed' && !this.errorMessage) {
      throw new ValidationError('失败状态必须提供错误信息');
    }
  }

  /**
   * 检查执行是否成功
   * @returns 是否成功
   */
  isSuccessful(): boolean {
    return this.status === 'completed';
  }

  /**
   * 更新执行状态
   * @param newStatus 新状态
   * @param result 执行结果
   * @param error 错误信息
   */
  updateStatus(newStatus: ExecutionStatus, result?: Record<string, any>, error?: string): void {
    this.status = newStatus;
    if (result) {
      this.executionResult = result;
    }
    if (error) {
      this.errorMessage = error;
    }
    this.updatedAt = new Date();
  }

  /**
   * 获取执行描述
   * @returns 执行描述文本
   */
  getExecutionDescription(): string {
    const statusText = {
      pending: '等待执行',
      executing: '执行中',
      completed: '执行完成',
      failed: '执行失败'
    }[this.status];

    return `代理 ${this.agent.name} 在池 ${this.pool.name} 执行 ${this.strategy} 策略，状态：${statusText}，金额：${this.amount}`;
  }
} 