import { Logger } from '../../utils/logger';
import { AgentConfig, AgentState, PoolRecommendation, FundsStatus, RiskAssessment, TransactionType } from '../../types';
import { PositionOptimizer } from '../../core/cruise/PositionOptimizer';
import { ScheduledTaskManager } from '../../core/cruise/ScheduledTaskManager';
import { CruiseMetrics } from '../../core/cruise/CruiseMetrics';
interface AgentStateMachine {
    getActiveAgents(): Promise<Array<{
        id: string;
        config: AgentConfig;
    }>>;
    getAgentState(agentId: string): Promise<{
        state: AgentState;
        config: AgentConfig;
    }>;
}
interface TransactionExecutor {
    executeTransaction(transaction: {
        type: TransactionType;
        agentId: string;
        data: Record<string, unknown>;
    }): Promise<{
        success: boolean;
        error?: string;
    }>;
}
interface FundsManager {
    getAgentFunds(agentId: string): Promise<FundsStatus>;
}
interface RiskController {
    assessRisk(agentId: string): Promise<RiskAssessment>;
}
interface SignalService {
    getT1Pools(): Promise<PoolRecommendation[]>;
}
/**
 * CruiseModule - 自动巡航模块
 *
 * 负责管理代理的自动健康检查和仓位优化
 * 通过定时任务管理器调度各种任务
 */
export declare class CruiseModule {
    private logger;
    private agentStateMachine;
    private transactionExecutor;
    private fundsManager;
    private riskController;
    private signalService;
    private positionOptimizer;
    private taskManager;
    private metrics;
    private registeredAgents;
    private agentCruiseConfigs;
    private isRunning;
    /**
     * 构造函数
     */
    constructor(logger: Logger, agentStateMachine: AgentStateMachine, transactionExecutor: TransactionExecutor, fundsManager: FundsManager, riskController: RiskController, signalService: SignalService, positionOptimizer: PositionOptimizer, taskManager: ScheduledTaskManager, metrics: CruiseMetrics);
    /**
     * 启动巡航模块
     */
    start(): Promise<void>;
    /**
     * 停止巡航模块
     */
    stop(): Promise<void>;
    /**
     * 注册代理
     */
    registerAgent(agentId: string, config: AgentConfig): Promise<boolean>;
    /**
     * 注销代理
     */
    unregisterAgent(agentId: string): Promise<boolean>;
    /**
     * 获取注册的代理数量
     */
    getRegisteredAgentCount(): number;
    /**
     * 执行代理健康检查
     */
    performHealthCheck(agentId: string): Promise<boolean>;
    /**
     * 补充仓位
     */
    private fillPositions;
    /**
     * 优化代理仓位
     */
    optimizePositions(agentId: string): Promise<boolean>;
    /**
     * 检查市场重大变化
     */
    checkForSignificantChanges(agentId: string): Promise<boolean>;
    /**
     * 记录健康检查指标
     */
    private recordHealthCheckMetrics;
    /**
     * 记录仓位填充指标
     */
    private recordPositionFillMetrics;
    /**
     * 记录优化指标
     */
    private recordOptimizationMetrics;
    /**
     * 设置代理的定时任务
     */
    private setupAgentTasks;
}
export {};
