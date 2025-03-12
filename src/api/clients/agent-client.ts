import { ApiClient } from './api-client';

// Agent类型定义
export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  createdAt: string;
  lastActive: string;
  balance?: {
    sol: number;
    usd: number;
  };
  performance?: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  health?: {
    score: number;
    status: 'healthy' | 'warning' | 'critical';
    factors: {
      name: string;
      score: number;
    }[];
  };
}

// Agent创建参数
export interface CreateAgentParams {
  name: string;
  initialFunding: number;
  riskLevel: number;
  advanced?: {
    maxPositions?: number;
    maxSlippage?: number;
    rebalanceThreshold?: number;
  };
}

// Agent更新参数
export interface UpdateAgentParams {
  name?: string;
  riskLevel?: number;
  status?: 'active' | 'inactive';
  advanced?: {
    maxPositions?: number;
    maxSlippage?: number;
    rebalanceThreshold?: number;
  };
}

/**
 * Agent API客户端
 * 处理Agent相关的API请求
 */
export class AgentClient extends ApiClient {
  /**
   * 构造函数
   * @param baseUrl API基础URL
   */
  constructor(baseUrl?: string) {
    super(baseUrl, '/agents');
  }

  /**
   * 获取Agent列表
   * @param status 可选的状态过滤
   * @returns Agent列表
   */
  public async getAgents(status?: 'active' | 'inactive' | 'error'): Promise<Agent[]> {
    try {
      const params = status ? { status } : {};
      const response = await this.api.get('', { params });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      throw error;
    }
  }

  /**
   * 获取Agent详情
   * @param id Agent ID
   * @returns Agent详情
   */
  public async getAgentById(id: string): Promise<Agent> {
    try {
      const response = await this.api.get(`/${id}`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 创建Agent
   * @param params 创建参数
   * @returns 创建的Agent
   */
  public async createAgent(params: CreateAgentParams): Promise<Agent> {
    try {
      const response = await this.api.post('', params);
      return response.data;
    } catch (error) {
      console.error('Failed to create agent:', error);
      throw error;
    }
  }

  /**
   * 更新Agent
   * @param id Agent ID
   * @param params 更新参数
   * @returns 更新后的Agent
   */
  public async updateAgent(id: string, params: UpdateAgentParams): Promise<Agent> {
    try {
      const response = await this.api.put(`/${id}`, params);
      return response.data;
    } catch (error) {
      console.error(`Failed to update agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 删除Agent
   * @param id Agent ID
   * @returns 操作结果
   */
  public async deleteAgent(id: string): Promise<void> {
    try {
      await this.api.delete(`/${id}`);
    } catch (error) {
      console.error(`Failed to delete agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 启动Agent
   * @param id Agent ID
   * @returns 更新后的Agent
   */
  public async startAgent(id: string): Promise<Agent> {
    try {
      const response = await this.api.post(`/${id}/start`);
      return response.data;
    } catch (error) {
      console.error(`Failed to start agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 暂停Agent
   * @param id Agent ID
   * @returns 更新后的Agent
   */
  public async pauseAgent(id: string): Promise<Agent> {
    try {
      const response = await this.api.post(`/${id}/pause`);
      return response.data;
    } catch (error) {
      console.error(`Failed to pause agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 紧急清仓
   * @param id Agent ID
   * @returns 操作结果
   */
  public async emergencyExit(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await this.api.post(`/${id}/emergency-exit`);
      return response.data;
    } catch (error) {
      console.error(`Failed to execute emergency exit for agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 获取Agent健康状态
   * @param id Agent ID
   * @returns 健康状态
   */
  public async getAgentHealth(id: string): Promise<Agent['health']> {
    try {
      const response = await this.api.get(`/${id}/health`);
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch health for agent with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * 获取Agent性能数据
   * @param id Agent ID
   * @param period 时间段 (daily, weekly, monthly)
   * @returns 性能数据
   */
  public async getAgentPerformance(
    id: string,
    period: 'daily' | 'weekly' | 'monthly' = 'daily'
  ): Promise<{ data: { timestamp: string; value: number }[] }> {
    try {
      const response = await this.api.get(`/${id}/performance`, { params: { period } });
      return response.data;
    } catch (error) {
      console.error(`Failed to fetch performance for agent with ID ${id}:`, error);
      throw error;
    }
  }
} 