import { Agent } from '../components/Agent';

// API基础URL
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';

// Agent API服务
export const agentService = {
  /**
   * 获取所有Agent列表
   * @returns Promise<Agent[]>
   */
  async getAgents(): Promise<Agent[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agents: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching agents:', error);
      throw error;
    }
  },

  /**
   * 获取单个Agent详情
   * @param id Agent ID
   * @returns Promise<Agent>
   */
  async getAgentById(id: string): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching agent ${id}:`, error);
      throw error;
    }
  },

  /**
   * 创建新Agent
   * @param agentData Agent创建数据
   * @returns Promise<Agent>
   */
  async createAgent(agentData: Omit<Agent, 'id' | 'createdAt' | 'lastActive' | 'status' | 'healthScore'>): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(agentData)
      });

      if (!response.ok) {
        throw new Error(`Failed to create agent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating agent:', error);
      throw error;
    }
  },

  /**
   * 更新Agent状态
   * @param id Agent ID
   * @param status 新状态
   * @returns Promise<Agent>
   */
  async updateAgentStatus(id: string, status: 'active' | 'paused'): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ status })
      });

      if (!response.ok) {
        throw new Error(`Failed to update agent status: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error updating agent ${id} status:`, error);
      throw error;
    }
  },

  /**
   * 执行紧急停止
   * @param id Agent ID
   * @returns Promise<Agent>
   */
  async emergencyStop(id: string): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}/emergency-stop`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to emergency stop agent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error emergency stopping agent ${id}:`, error);
      throw error;
    }
  },

  /**
   * 执行再平衡操作
   * @param id Agent ID
   * @returns Promise<Agent>
   */
  async rebalance(id: string): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}/rebalance`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to rebalance agent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error rebalancing agent ${id}:`, error);
      throw error;
    }
  },

  /**
   * 存入资金
   * @param id Agent ID
   * @param amount 金额
   * @returns Promise<Agent>
   */
  async deposit(id: string, amount: number): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        throw new Error(`Failed to deposit to agent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error depositing to agent ${id}:`, error);
      throw error;
    }
  },

  /**
   * 提取资金
   * @param id Agent ID
   * @param amount 金额
   * @returns Promise<Agent>
   */
  async withdraw(id: string, amount: number): Promise<Agent> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ amount })
      });

      if (!response.ok) {
        throw new Error(`Failed to withdraw from agent: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error withdrawing from agent ${id}:`, error);
      throw error;
    }
  },

  /**
   * 删除Agent
   * @param id Agent ID
   * @returns Promise<void>
   */
  async deleteAgent(id: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to delete agent: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error deleting agent ${id}:`, error);
      throw error;
    }
  },

  /**
   * 获取Agent健康指标
   * @param id Agent ID
   * @returns Promise<any>
   */
  async getHealthMetrics(id: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${id}/health`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch agent health metrics: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching health metrics for agent ${id}:`, error);
      throw error;
    }
  },

  /**
   * 确认警报
   * @param agentId Agent ID
   * @param alertId 警报ID
   * @returns Promise<void>
   */
  async acknowledgeAlert(agentId: string, alertId: string): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/agents/${agentId}/alerts/${alertId}/acknowledge`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to acknowledge alert: ${response.statusText}`);
      }
    } catch (error) {
      console.error(`Error acknowledging alert ${alertId} for agent ${agentId}:`, error);
      throw error;
    }
  }
}; 