/**
 * 风险评估历史模型
 * 创建于: 2025-03-16
 */

import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, BeforeInsert } from 'typeorm';
import { IsNotEmpty, Min, Max, IsEnum } from 'class-validator';
import { BaseEntity, RiskLevel } from './types/base';
import { Pool } from './pool.model';
import { Position } from './position.model';
import { ValidationError } from '../errors/validation.error';
import { Decimal } from 'decimal.js';

@Entity('risk_assessments')
export class RiskAssessment implements BaseEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Pool)
  pool: Pool;

  @ManyToOne(() => Position, { nullable: true })
  position?: Position;

  @Column()
  @IsEnum(RiskLevel)
  riskLevel: RiskLevel;

  @Column({ name: 'risk_score' })
  @Min(0)
  @Max(100)
  riskScore: number;

  @Column({ name: 'market_volatility', type: 'decimal', precision: 5, scale: 2 })
  @Min(0)
  marketVolatility: Decimal;

  @Column({ name: 'liquidity_ratio', type: 'decimal', precision: 5, scale: 2 })
  @Min(0)
  @Max(100)
  liquidityRatio: Decimal;

  @Column({ name: 'assessment_factors', type: 'jsonb' })
  @IsNotEmpty()
  assessmentFactors: {
    marketTrend: 'bullish' | 'bearish' | 'neutral';
    tradingVolume: number;
    priceStability: number;
    liquidityDepth: number;
    additionalRisks?: string[];
  };

  @Column({ name: 'recommendations', type: 'jsonb' })
  recommendations: {
    action: 'increase' | 'decrease' | 'maintain' | 'close';
    reason: string;
    urgency: 'high' | 'medium' | 'low';
  }[];

  @Column({ name: 'created_at' })
  createdAt: Date;

  @Column({ name: 'updated_at' })
  updatedAt: Date;

  @BeforeInsert()
  validateAssessment() {
    // 验证风险评分与风险等级匹配
    const riskRanges = {
      low: { min: 0, max: 30 },
      medium: { min: 31, max: 70 },
      high: { min: 71, max: 100 }
    };

    const range = riskRanges[this.riskLevel];
    if (this.riskScore < range.min || this.riskScore > range.max) {
      throw new ValidationError(`${this.riskLevel} 风险等级的评分应在 ${range.min}-${range.max} 之间`);
    }

    // 验证评估因素
    if (!this.assessmentFactors.marketTrend || 
        !this.assessmentFactors.tradingVolume || 
        !this.assessmentFactors.priceStability || 
        !this.assessmentFactors.liquidityDepth) {
      throw new ValidationError('评估因素不完整');
    }

    // 验证建议
    if (!this.recommendations || this.recommendations.length === 0) {
      throw new ValidationError('必须提供至少一条建议');
    }
  }

  /**
   * 获取风险评估摘要
   * @returns 风险评估摘要文本
   */
  getAssessmentSummary(): string {
    const target = this.position ? 
      `仓位 ${this.position.id}` : 
      `池 ${this.pool.name}`;

    const urgentRecommendations = this.recommendations
      .filter(r => r.urgency === 'high')
      .map(r => r.action)
      .join('、');

    return `${target} 的风险等级为 ${this.riskLevel}，风险评分 ${this.riskScore}，` +
           `市场波动率 ${this.marketVolatility}%，流动性比率 ${this.liquidityRatio}%。` +
           (urgentRecommendations ? `建议立即采取行动：${urgentRecommendations}` : '暂无紧急建议。');
  }

  /**
   * 检查是否需要紧急干预
   * @returns 是否需要紧急干预
   */
  needsUrgentIntervention(): boolean {
    return this.riskScore > 80 || 
           this.marketVolatility.greaterThan(50) || 
           this.liquidityRatio.lessThan(20) ||
           this.recommendations.some(r => r.urgency === 'high');
  }

  /**
   * 获取风险趋势
   * @param previousAssessment 上一次风险评估
   * @returns 风险趋势描述
   */
  getRiskTrend(previousAssessment?: RiskAssessment): string {
    if (!previousAssessment) {
      return '首次评估';
    }

    const scoreDiff = this.riskScore - previousAssessment.riskScore;
    if (Math.abs(scoreDiff) < 5) {
      return '风险水平保持稳定';
    }

    return scoreDiff > 0 ? 
      `风险水平上升 ${scoreDiff.toFixed(1)} 点` : 
      `风险水平下降 ${Math.abs(scoreDiff).toFixed(1)} 点`;
  }
} 