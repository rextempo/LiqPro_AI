/**
 * 信号类型枚举
 */
export enum SignalType {
  ENTRY = 'entry',
  EXIT = 'exit',
  REBALANCE = 'rebalance',
  RISK_WARNING = 'risk_warning',
  OPPORTUNITY = 'opportunity',
}

/**
 * 时间框架枚举
 */
export enum TimeFrame {
  SHORT_TERM = 'short_term',
  MEDIUM_TERM = 'medium_term',
  LONG_TERM = 'long_term',
}

/**
 * 信号强度枚举
 */
export enum SignalStrength {
  VERY_WEAK = 1,
  WEAK = 2,
  MODERATE = 3,
  STRONG = 4,
  VERY_STRONG = 5,
}

/**
 * 信号可靠性枚举
 */
export enum SignalReliability {
  VERY_LOW = 1,
  LOW = 2,
  MEDIUM = 3,
  HIGH = 4,
  VERY_HIGH = 5,
}

/**
 * 信号响应接口
 */
export interface SignalResponse {
  status: string;
  data: {
    signals: Signal[];
    total?: number;
    limit?: number;
    offset?: number;
  };
}

/**
 * 单个信号响应接口
 */
export interface SingleSignalResponse {
  status: string;
  data: {
    signal: Signal;
  };
}

/**
 * 信号接口
 */
export interface Signal {
  id: string;
  type: SignalType;
  poolAddress: string;
  strength: number;
  reliability: number;
  timeframe: TimeFrame;
  timestamp: number;
  expirationTimestamp?: number;
  metadata?: Record<string, any>;
}

/**
 * 信号统计接口
 */
export interface SignalStats {
  totalCount: number;
  byType: Record<SignalType, number>;
  byTimeframe: Record<TimeFrame, number>;
  averageStrength: number;
  averageReliability: number;
  lastUpdated: number;
} 