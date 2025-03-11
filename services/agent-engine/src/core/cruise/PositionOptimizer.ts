import { Logger } from '../../utils/logger';
import { AgentConfig, FundsStatus, RiskAssessment } from '../../types';

/**
 * 操作类型定义
 */
type ActionType = 'add' | 'remove' | 'adjust';

/**
 * 优化操作接口
 */
interface OptimizationAction {
  type: ActionType;
  poolAddress: string;
  // 针对添加流动性
  amountSol?: number;
  targetBins?: {
    binId: number;
    percentage: number;
  }[];
  // 针对调整流动性
  currentAmountSol?: number;
  targetAmountSol?: number;
}

/**
 * 优化计划接口
 */
interface OptimizationPlan {
  agentId: string;
  totalValueSol: number;
  actions: OptimizationAction[];
  expectedHealthImprovement: number;
}

/**
 * 仓位优化器
 * 负责计算最优仓位分配和调整策略
 */
export class PositionOptimizer {
  private logger: Logger;
  private getPoolRecommendations: (poolAddress: string) => Promise<any>;
  private priceHistoryCache: Map<string, { timestamp: number; data: any }> = new Map();
  private recentPriceChanges: Map<string, { change: number; timestamp: number }> = new Map();

  /**
   * 构造函数
   */
  constructor(
    logger: Logger,
    getPoolRecommendations: (poolAddress: string) => Promise<any>
  ) {
    this.logger = logger;
    this.getPoolRecommendations = getPoolRecommendations;
  }

  /**
   * 计算最优仓位分配
   */
  public async calculateOptimalPositions(
    agentId: string,
    funds: FundsStatus,
    config: AgentConfig
  ): Promise<OptimizationPlan | null> {
    try {
      this.logger.info(`Calculating optimal positions for agent ${agentId}`);
      
      // 创建优化计划
      const plan: OptimizationPlan = {
        agentId,
        totalValueSol: funds.totalValueSol,
        actions: [],
        expectedHealthImprovement: 0
      };
      
      // 如果没有可用资金，则返回空计划
      if (funds.availableSol <= config.minSolBalance) {
        this.logger.info(`Insufficient funds for optimization - agent ${agentId}, available: ${funds.availableSol}, min required: ${config.minSolBalance}`);
        return plan;
      }
      
      // 获取当前所有池子的推荐
      const currentPools = funds.positions.map(p => p.poolAddress);
      const recommendations: Map<string, any> = new Map();
      
      for (const poolAddress of currentPools) {
        const recommendation = await this.getPoolRecommendations(poolAddress);
        if (recommendation) {
          recommendations.set(poolAddress, recommendation);
        }
      }
      
      // 识别需要减少的仓位（得分低或风险高）
      const reductionActions = await this.identifyReductionActions(funds.positions, recommendations);
      plan.actions.push(...reductionActions);
      
      // 识别需要调整的仓位（流动性分布不合理）
      const adjustmentActions = await this.identifyAdjustmentActions(funds.positions, recommendations);
      plan.actions.push(...adjustmentActions);
      
      // 剩余可用资金加上减仓获得的资金
      let availableSol = funds.availableSol;
      reductionActions.forEach(action => {
        if (action.type === 'remove' && action.amountSol) {
          availableSol += action.amountSol;
        }
      });
      
      // 保留最小SOL余额
      availableSol -= config.minSolBalance;
      
      if (availableSol > 0) {
        // 识别可添加仓位的好池子
        const addActions = await this.identifyAdditionActions(
          agentId,
          currentPools,
          availableSol,
          config.maxPositions - currentPools.length + reductionActions.length
        );
        
        plan.actions.push(...addActions);
      }
      
      // 计算预期健康度改善
      plan.expectedHealthImprovement = this.calculateExpectedImprovement(plan.actions);
      
      this.logger.info(`Optimization plan created for agent ${agentId} - Actions: ${plan.actions.length}, Expected improvement: ${plan.expectedHealthImprovement}`);
      
      return plan;
      
    } catch (error) {
      this.logger.error(`Failed to calculate optimal positions for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * 识别不健康的仓位
   */
  public async identifyUnhealthyPositions(
    positions: Array<{poolAddress: string, valueUsd: number, valueSol: number}>,
    assessment: RiskAssessment
  ): Promise<Array<{poolAddress: string, valueSol: number}>> {
    try {
      if (positions.length === 0) return [];
      
      const unhealthyPositions: Array<{poolAddress: string, valueSol: number}> = [];
      const poolRecommendations: Map<string, any> = new Map();
      
      // 获取每个池子的健康度评分
      for (const position of positions) {
        const recommendation = await this.getPoolRecommendations(position.poolAddress);
        
        if (recommendation) {
          poolRecommendations.set(position.poolAddress, recommendation);
          
          if (recommendation.healthScore < 3.0 || recommendation.action === 'reduce') {
            unhealthyPositions.push({
              poolAddress: position.poolAddress,
              valueSol: position.valueSol
            });
          }
        }
      }
      
      // 按健康度从低到高排序
      unhealthyPositions.sort((a, b) => {
        const recA = poolRecommendations.get(a.poolAddress);
        const recB = poolRecommendations.get(b.poolAddress);
        return (recA?.healthScore || 5) - (recB?.healthScore || 5);
      });
      
      return unhealthyPositions;
      
    } catch (error) {
      this.logger.error(`Failed to identify unhealthy positions: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 检查是否有显著变化需要调整
   */
  public async checkForSignificantChanges(
    agentId: string,
    positions: Array<{poolAddress: string, valueUsd: number, valueSol: number}>
  ): Promise<Array<{poolAddress: string, valueSol: number}> | null> {
    try {
      if (positions.length === 0) return null;
      
      const significantChanges: Array<{poolAddress: string, valueSol: number}> = [];
      
      for (const position of positions) {
        // 获取池子的推荐
        const recommendation = await this.getPoolRecommendations(position.poolAddress);
        
        if (!recommendation) continue;
        
        const priceChange = await this.checkPriceChange(position.poolAddress);
        const volumeChange = recommendation.volumeChange || 0;
        const liquidityChange = recommendation.liquidityChange || 0;
        
        // 判断是否有显著变化
        const hasSignificantChange = 
          Math.abs(priceChange) > 0.05 || // 价格变化超过5%
          Math.abs(volumeChange) > 0.2 || // 交易量变化超过20%
          Math.abs(liquidityChange) > 0.1; // 流动性变化超过10%
        
        if (hasSignificantChange) {
          this.logger.info(`Significant change detected in position for agent ${agentId} - Pool: ${position.poolAddress}, Price change: ${priceChange}, Volume change: ${volumeChange}, Liquidity change: ${liquidityChange}`);
          
          significantChanges.push({
            poolAddress: position.poolAddress,
            valueSol: position.valueSol
          });
        }
      }
      
      return significantChanges.length > 0 ? significantChanges : null;
      
    } catch (error) {
      this.logger.error(`Failed to check for significant changes for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  }

  /**
   * 检查池子的最近价格变化
   */
  private async checkPriceChange(poolAddress: string): Promise<number> {
    try {
      const now = Date.now();
      const cachedData = this.priceHistoryCache.get(poolAddress);
      const recentChange = this.recentPriceChanges.get(poolAddress);
      
      // 如果有最近的价格变化记录且不超过30分钟，直接使用
      if (recentChange && now - recentChange.timestamp < 30 * 60 * 1000) {
        return recentChange.change;
      }
      
      // 获取池子推荐
      const recommendation = await this.getPoolRecommendations(poolAddress);
      
      if (!recommendation) {
        return 0;
      }
      
      // 计算价格变化
      const priceChange = recommendation.priceChange24h || 0;
      
      // 更新缓存
      this.recentPriceChanges.set(poolAddress, {
        change: priceChange,
        timestamp: now
      });
      
      return priceChange;
      
    } catch (error) {
      this.logger.error(`Failed to check price change for pool ${poolAddress}: ${error instanceof Error ? error.message : String(error)}`);
      return 0;
    }
  }

  /**
   * 识别需要减少的仓位
   */
  private async identifyReductionActions(
    positions: Array<{poolAddress: string, valueUsd: number, valueSol: number}>,
    recommendations: Map<string, any>
  ): Promise<OptimizationAction[]> {
    const reductionActions: OptimizationAction[] = [];
    
    for (const position of positions) {
      const recommendation = recommendations.get(position.poolAddress);
      
      if (!recommendation) continue;
      
      // 如果推荐减少仓位
      if (
        recommendation.action === 'reduce' ||
        recommendation.healthScore < 2.0
      ) {
        // 默认减少30%，或者使用推荐的减少比例
        const reductionPercentage = recommendation.adjustmentPercentage || 0.3;
        const reductionAmount = position.valueSol * reductionPercentage;
        
        reductionActions.push({
          type: 'remove',
          poolAddress: position.poolAddress,
          amountSol: reductionAmount
        });
      }
    }
    
    return reductionActions;
  }

  /**
   * 识别需要调整的仓位
   */
  private async identifyAdjustmentActions(
    positions: Array<{poolAddress: string, valueUsd: number, valueSol: number}>,
    recommendations: Map<string, any>
  ): Promise<OptimizationAction[]> {
    const adjustmentActions: OptimizationAction[] = [];
    
    for (const position of positions) {
      const recommendation = recommendations.get(position.poolAddress);
      
      if (!recommendation) continue;
      
      // 如果推荐重新平衡仓位
      if (
        recommendation.action === 'rebalance' &&
        recommendation.targetBins &&
        recommendation.targetBins.length > 0
      ) {
        // 使用当前金额或推荐的新金额
        const currentAmount = position.valueSol;
        const targetAmount = currentAmount * (recommendation.adjustmentPercentage || 1.0);
        
        adjustmentActions.push({
          type: 'adjust',
          poolAddress: position.poolAddress,
          currentAmountSol: currentAmount,
          targetAmountSol: targetAmount,
          targetBins: recommendation.targetBins
        });
      }
    }
    
    return adjustmentActions;
  }

  /**
   * 识别可添加仓位的池子
   */
  private async identifyAdditionActions(
    agentId: string,
    currentPools: string[],
    availableSol: number,
    maxNewPositions: number
  ): Promise<OptimizationAction[]> {
    try {
      if (availableSol <= 0 || maxNewPositions <= 0) {
        return [];
      }
      
      // 这里应该调用信号服务获取推荐的新池子
      // 目前简化处理，仅返回空数组
      return [];
      
    } catch (error) {
      this.logger.error(`Failed to identify addition actions for agent ${agentId}: ${error instanceof Error ? error.message : String(error)}`);
      return [];
    }
  }

  /**
   * 计算预期健康度改善
   */
  private calculateExpectedImprovement(actions: OptimizationAction[]): number {
    // 简单估算，每个调整动作增加0.2分健康度
    return actions.length * 0.2;
  }
} 