/**
 * Agent状态枚举
 */
export enum AgentStatus {
  IDLE = 'IDLE',       // 空闲状态
  RUNNING = 'RUNNING', // 运行中
  PAUSED = 'PAUSED'    // 暂停状态
}

/**
 * Agent风险等级
 */
export enum AgentRiskLevel {
  LOW = 'LOW',         // 低风险
  MEDIUM = 'MEDIUM',   // 中等风险
  HIGH = 'HIGH'        // 高风险
}

/**
 * Agent配置接口
 */
export interface AgentConfig {
  id: string;                    // Agent唯一标识
  name: string;                  // Agent名称
  description?: string;          // 描述
  riskLevel: AgentRiskLevel;     // 风险等级
  maxPositionSize: number;       // 最大仓位大小
  minPositionSize: number;       // 最小仓位大小
  targetAPY: number;            // 目标年化收益率
  maxSlippage: number;          // 最大滑点
  rebalanceThreshold: number;   // 再平衡阈值
  poolTypes: string[];          // 支持的池子类型
  createdAt: Date;              // 创建时间
  updatedAt: Date;              // 更新时间
}

/**
 * Agent状态接口
 */
export interface AgentState {
  status: AgentStatus;          // 当前状态
  currentAPY: number;          // 当前年化收益率
  totalValue: number;          // 总价值
  activePositions: number;     // 活跃仓位数量
  lastRebalanceTime?: Date;    // 上次再平衡时间
  lastUpdateTime: Date;        // 最后更新时间
}

/**
 * Agent完整接口
 */
export interface Agent extends AgentConfig, AgentState {
  version: string;             // Agent版本
  metadata?: Record<string, any>; // 元数据
} 