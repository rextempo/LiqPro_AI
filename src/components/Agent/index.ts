// 导出所有Agent相关组件
export { default as AgentList } from './AgentList';
export { default as AgentCreate } from './AgentCreate';
export { default as AgentDetail } from './AgentDetail';
export { default as AgentControls } from './AgentControls';
export { default as HealthDashboard } from './HealthDashboard';

// 导出Agent相关类型
export interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  balance: number;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  };
  createdAt: string;
  lastActive: string;
  riskLevel: number;
  healthScore: number;
  description?: string;
  autoRebalance?: boolean;
  maxPositions?: number;
  emergencyThreshold?: number;
}

// 导出Agent相关常量
export const AGENT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  ERROR: 'error'
} as const;

export const RISK_LEVELS = {
  VERY_LOW: 1,
  LOW: 2,
  MEDIUM: 3,
  HIGH: 4,
  VERY_HIGH: 5
} as const; 