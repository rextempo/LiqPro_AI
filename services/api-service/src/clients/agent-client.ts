import { BaseClient } from './base-client';

/**
 * Agent状态枚举
 */
export enum AgentStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  STOPPED = 'stopped',
  RISK_CONTROL = 'risk_control',
  OBSERVING = 'observing',
}

/**
 * Agent类型枚举
 */
export enum AgentType {
  CONSERVATIVE = 'conservative',
  BALANCED = 'balanced',
  AGGRESSIVE = 'aggressive',
  CUSTOM = 'custom',
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
export class AgentClient extends BaseClient {
  /**
   * 创建Agent引擎客户端实例
   * @param baseUrl Agent服务基础URL
   * @param timeout 请求超时时间(毫秒)
   */
  constructor(baseUrl: string, timeout = 10000) {
    super('Agent', baseUrl, timeout);
  }

  /**
   * 获取Agent列表
   * @param userId 用户ID
   * @param status 状态过滤
   * @returns Agent列表
   */
  public async getAgents(userId: string, status?: AgentStatus): Promise<Agent[]> {
    return this.get<Agent[]>('/agents', { params: { userId, status } });
  }

  /**
   * 获取单个Agent
   * @param agentId Agent ID
   * @returns Agent详情
   */
  public async getAgent(agentId: string): Promise<Agent> {
    return this.get<Agent>(`/agents/${agentId}`);
  }

  /**
   * 创建Agent
   * @param userId 用户ID
   * @param params 创建参数
   * @returns 创建的Agent
   */
  public async createAgent(userId: string, params: AgentCreateParams): Promise<Agent> {
    return this.post<Agent>('/agents', { userId, ...params });
  }

  /**
   * 更新Agent状态
   * @param agentId Agent ID
   * @param status 新状态
   * @returns 更新后的Agent
   */
  public async updateAgentStatus(agentId: string, status: AgentStatus): Promise<Agent> {
    return this.put<Agent>(`/agents/${agentId}/status`, { status });
  }

  /**
   * 获取Agent交易历史
   * @param agentId Agent ID
   * @param limit 限制数量
   * @param offset 偏移量
   * @returns 交易历史
   */
  public async getAgentTransactions(agentId: string, limit = 10, offset = 0): Promise<AgentTransaction[]> {
    return this.get<AgentTransaction[]>(`/agents/${agentId}/transactions`, {
      params: { limit, offset }
    });
  }

  /**
   * 充值资金到Agent
   * @param agentId Agent ID
   * @param amount 金额
   * @returns 更新后的Agent
   */
  public async depositFunds(agentId: string, amount: number): Promise<Agent> {
    return this.post<Agent>(`/agents/${agentId}/deposit`, { amount });
  }

  /**
   * 从Agent提取资金
   * @param agentId Agent ID
   * @param amount 金额
   * @returns 更新后的Agent
   */
  public async withdrawFunds(agentId: string, amount: number): Promise<Agent> {
    return this.post<Agent>(`/agents/${agentId}/withdraw`, { amount });
  }

  /**
   * 紧急清仓
   * @param agentId Agent ID
   * @returns 操作结果
   */
  public async emergencyExit(agentId: string): Promise<{ success: boolean; message: string }> {
    return this.post<{ success: boolean; message: string }>(`/agents/${agentId}/emergency-exit`, {});
  }
} 