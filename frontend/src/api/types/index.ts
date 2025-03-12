/**
 * API类型定义
 * 包含API请求、响应和错误的类型定义
 */

// API响应基础接口
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  timestamp?: string;
}

// API错误接口
export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

// API请求选项
export interface ApiRequestOptions {
  headers?: Record<string, string>;
  params?: Record<string, any>;
  timeout?: number;
  cache?: boolean;
  retry?: boolean;
  signal?: AbortSignal;
}

// 分页请求参数
export interface PaginationParams {
  page?: number;
  limit?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

// 分页响应
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// WebSocket消息类型
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: string;
}

// WebSocket订阅选项
export interface WebSocketSubscriptionOptions {
  topic: string;
  options?: Record<string, any>;
}

// 认证相关类型
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

// 用户信息
export interface UserProfile {
  id: string;
  username: string;
  email?: string;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
}

// 信号类型
export enum SignalType {
  BUY = 'buy',
  SELL = 'sell',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  SWAP = 'swap',
}

// 信号接口
export interface Signal {
  id: string;
  type: SignalType;
  poolAddress?: string;
  tokens: {
    symbol: string;
    address: string;
  }[];
  strength: number;
  reliability: number;
  timestamp: string;
  expirationTimestamp?: string;
  metadata?: Record<string, any>;
}

// Agent状态
export enum AgentStatus {
  RUNNING = 'running',
  OBSERVING = 'observing',
  STOPPED = 'stopped',
}

// Agent接口
export interface Agent {
  id: string;
  name: string;
  status: AgentStatus;
  walletAddress: string;
  createdAt: string;
  updatedAt: string;
  assetValueSOL: number;
  assetValueUSD: number;
  yield24h: number;
  yieldTrend: 'up' | 'down' | 'neutral';
  settings?: Record<string, any>;
}

// Agent更新接口
export interface AgentUpdate {
  agentId: string;
  timestamp: string;
  status: AgentStatus;
  assetValueSOL: number;
  assetValueUSD: number;
  yield24h: number;
  yieldTrend: 'up' | 'down' | 'neutral';
  recentTransactions?: Transaction[];
  metadata?: Record<string, any>;
}

// 池子接口
export interface Pool {
  address: string;
  name: string;
  token0: {
    symbol: string;
    address: string;
    icon?: string;
  };
  token1: {
    symbol: string;
    address: string;
    icon?: string;
  };
  tvl: number;
  apr: number;
  volume24h: number;
  volumeChange: number;
  risk: 'low' | 'medium' | 'high';
  recommended: boolean;
}

// 池子更新接口
export interface PoolUpdate {
  poolAddress: string;
  timestamp: string;
  tvl: number;
  apr: number;
  volume24h: number;
  volumeChange: number;
  price0: number;
  price1: number;
  priceChange0: number;
  priceChange1: number;
  metadata?: Record<string, any>;
}

// 交易类型
export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  SWAP = 'swap',
  HARVEST = 'harvest',
}

// 交易状态
export enum TransactionStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  FAILED = 'failed',
}

// 交易接口
export interface Transaction {
  id: string;
  type: TransactionType;
  status: TransactionStatus;
  timestamp: string;
  tokens: {
    symbol: string;
    amount: number;
    usdValue: number;
  }[];
  fee: number;
  txHash: string;
  agentId?: string;
  poolAddress?: string;
}

// 市场数据接口
export interface MarketData {
  solPrice: number;
  solChange: number;
  totalValueLocked: number;
  tvlChange: number;
  volume24h: number;
  volumeChange: number;
  meteoraVolume: number;
  meteoraVolumeChange: number;
}

// 市场更新接口
export interface MarketUpdate {
  symbol: string;
  timestamp: string;
  price: number;
  priceChange: number;
  volume24h: number;
  volumeChange: number;
  high24h: number;
  low24h: number;
  metadata?: Record<string, any>;
}

// 不需要重复导出，因为上面已经使用export声明了
// export type {
//   ApiResponse,
//   ApiError,
//   ApiRequestOptions,
//   PaginationParams,
//   PaginatedResponse,
//   WebSocketMessage,
//   WebSocketSubscriptionOptions,
//   AuthTokens,
//   UserProfile,
//   Signal,
//   Agent,
//   Pool,
//   Transaction,
//   MarketData,
// }; 