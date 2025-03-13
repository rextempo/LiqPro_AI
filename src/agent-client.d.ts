import { BaseClient } from './base-client';
/**
 * Agent状态枚举
 */
export declare enum AgentStatus {
    RUNNING = "running",
    PAUSED = "paused",
    STOPPED = "stopped",
    RISK_CONTROL = "risk_control",
    OBSERVING = "observing"
}
/**
 * Agent类型枚举
 */
export declare enum AgentType {
    CONSERVATIVE = "conservative",
    BALANCED = "balanced",
    AGGRESSIVE = "aggressive",
    CUSTOM = "custom"
}
/**
 * Agent创建参数接口
 */
export interface AgentCreateParams {
    name: string;
    type: AgentType;
    initialFunds: number;
    riskLevel: number;
    parameters?: Record<string, any>;
    autoStart?: boolean;
}
/**
 * Agent接口
 */
export interface Agent {
    id: string;
    name: string;
    type: AgentType;
    status: AgentStatus;
    createdAt: number;
    updatedAt: number;
    riskLevel: number;
    funds: {
        total: number;
        available: number;
        invested: number;
    };
    performance: {
        totalReturn: number;
        totalReturnPercentage: number;
        dailyReturn: number;
        dailyReturnPercentage: number;
        weeklyReturn: number;
        weeklyReturnPercentage: number;
    };
    positions: AgentPosition[];
    parameters: Record<string, any>;
}
/**
 * Agent仓位接口
 */
export interface AgentPosition {
    poolAddress: string;
    tokenPair: string;
    amount: number;
    value: number;
    entryTimestamp: number;
    entryPrice: number;
    currentPrice: number;
    pnl: number;
    pnlPercentage: number;
}
/**
 * Agent交易接口
 */
export interface AgentTransaction {
    id: string;
    agentId: string;
    type: 'add_liquidity' | 'remove_liquidity' | 'swap';
    poolAddress: string;
    amount: number;
    timestamp: number;
    status: 'pending' | 'completed' | 'failed';
    txHash?: string;
    details: Record<string, any>;
}
/**
 * Agent引擎客户端
 * 用于与Agent服务通信
 */
export declare class AgentClient extends BaseClient {
    /**
     * 创建Agent引擎客户端实例
     * @param baseUrl Agent服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(baseUrl: string, timeout?: number);
    /**
     * 获取Agent列表
     * @param userId 用户ID
     * @param status 状态过滤
     * @returns Agent列表
     */
    getAgents(userId: string, status?: AgentStatus): Promise<Agent[]>;
    /**
     * 获取单个Agent
     * @param agentId Agent ID
     * @returns Agent详情
     */
    getAgent(agentId: string): Promise<Agent>;
    /**
     * 创建Agent
     * @param userId 用户ID
     * @param params 创建参数
     * @returns 创建的Agent
     */
    createAgent(userId: string, params: AgentCreateParams): Promise<Agent>;
    /**
     * 更新Agent状态
     * @param agentId Agent ID
     * @param status 新状态
     * @returns 更新后的Agent
     */
    updateAgentStatus(agentId: string, status: AgentStatus): Promise<Agent>;
    /**
     * 获取Agent交易历史
     * @param agentId Agent ID
     * @param limit 限制数量
     * @param offset 偏移量
     * @returns 交易历史
     */
    getAgentTransactions(agentId: string, limit?: number, offset?: number): Promise<AgentTransaction[]>;
    /**
     * 充值资金到Agent
     * @param agentId Agent ID
     * @param amount 金额
     * @returns 更新后的Agent
     */
    depositFunds(agentId: string, amount: number): Promise<Agent>;
    /**
     * 从Agent提取资金
     * @param agentId Agent ID
     * @param amount 金额
     * @returns 更新后的Agent
     */
    withdrawFunds(agentId: string, amount: number): Promise<Agent>;
    /**
     * 紧急清仓
     * @param agentId Agent ID
     * @returns 操作结果
     */
    emergencyExit(agentId: string): Promise<{
        success: boolean;
        message: string;
    }>;
}
