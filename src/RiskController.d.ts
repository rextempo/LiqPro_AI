import { RiskAssessment } from '../types';
import { AgentStateMachine } from './AgentStateMachine';
import { TransactionExecutor } from './TransactionExecutor';
import { FundsManager } from './FundsManager';
import { Logger } from '../utils/logger';
/**
 * 风险控制器接口
 */
export interface RiskController {
    /**
     * 评估风险
     */
    assessRisk(agentId: string): Promise<RiskAssessment>;
    /**
     * 处理风险
     */
    handleRisk(agentId: string, assessment: RiskAssessment): Promise<void>;
    /**
     * 执行紧急退出
     */
    executeEmergencyExit(agentId: string, reason: string): Promise<boolean>;
    /**
     * 执行部分减仓
     */
    executePartialReduction(agentId: string, percentage: number): Promise<boolean>;
}
/**
 * 风险控制器实现
 */
export declare class AgentRiskController implements RiskController {
    private logger;
    private stateMachines;
    private transactionExecutor;
    private fundsManager;
    private riskThresholds;
    private monitoringTimers;
    constructor(logger: Logger, transactionExecutor: TransactionExecutor, fundsManager: FundsManager);
    /**
     * 注册Agent状态机
     */
    registerAgent(agentId: string, stateMachine: AgentStateMachine): void;
    /**
     * 注销Agent
     */
    unregisterAgent(agentId: string): void;
    /**
     * 开始风险监控
     */
    private startMonitoring;
    /**
     * 停止风险监控
     */
    private stopMonitoring;
    /**
     * 评估风险
     */
    assessRisk(agentId: string): Promise<RiskAssessment>;
    /**
     * 处理风险
     */
    handleRisk(agentId: string, assessment: RiskAssessment): Promise<void>;
    /**
     * 执行紧急退出
     */
    executeEmergencyExit(agentId: string, reason: string): Promise<boolean>;
    /**
     * 执行部分减仓
     */
    executePartialReduction(agentId: string, percentage: number): Promise<boolean>;
    /**
     * 按风险从高到低排序仓位
     */
    private sortPositionsByRisk;
}
