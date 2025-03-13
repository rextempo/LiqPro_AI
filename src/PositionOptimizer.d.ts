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
    amountSol?: number;
    targetBins?: {
        binId: number;
        percentage: number;
    }[];
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
export declare class PositionOptimizer {
    private logger;
    private getPoolRecommendations;
    private priceHistoryCache;
    private recentPriceChanges;
    /**
     * 构造函数
     */
    constructor(logger: Logger, getPoolRecommendations: (poolAddress: string) => Promise<any>);
    /**
     * 计算最优仓位分配
     */
    calculateOptimalPositions(agentId: string, funds: FundsStatus, config: AgentConfig): Promise<OptimizationPlan | null>;
    /**
     * 识别不健康的仓位
     */
    identifyUnhealthyPositions(positions: Array<{
        poolAddress: string;
        valueUsd: number;
        valueSol: number;
    }>, assessment: RiskAssessment): Promise<Array<{
        poolAddress: string;
        valueSol: number;
    }>>;
    /**
     * 检查是否有显著变化需要调整
     */
    checkForSignificantChanges(agentId: string, positions: Array<{
        poolAddress: string;
        valueUsd: number;
        valueSol: number;
    }>): Promise<Array<{
        poolAddress: string;
        valueSol: number;
    }> | null>;
    /**
     * 检查池子的最近价格变化
     */
    private checkPriceChange;
    /**
     * 识别需要减少的仓位
     */
    private identifyReductionActions;
    /**
     * 识别需要调整的仓位
     */
    private identifyAdjustmentActions;
    /**
     * 识别可添加仓位的池子
     */
    private identifyAdditionActions;
    /**
     * 计算预期健康度改善
     */
    private calculateExpectedImprovement;
}
export {};
