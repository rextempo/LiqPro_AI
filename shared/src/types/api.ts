/**
 * API错误码
 */
export enum ApiErrorCode {
  // 系统错误 (1000-1999)
  SYSTEM_ERROR = 1000,
  INVALID_REQUEST = 1001,
  UNAUTHORIZED = 1002,
  FORBIDDEN = 1003,
  NOT_FOUND = 1004,
  RATE_LIMIT = 1005,
  
  // 业务错误 (2000-2999)
  INVALID_PARAMS = 2000,
  INSUFFICIENT_BALANCE = 2001,
  INVALID_POSITION = 2002,
  PRICE_IMPACT_TOO_HIGH = 2003,
  SLIPPAGE_TOO_HIGH = 2004,
  
  // 网络错误 (3000-3999)
  NETWORK_ERROR = 3000,
  TIMEOUT = 3001,
  SERVICE_UNAVAILABLE = 3002
}

/**
 * API错误响应
 */
export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: Record<string, any>;
}

/**
 * 分页参数
 */
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * API响应包装器
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}

/**
 * API请求配置
 */
export interface ApiRequestConfig {
  timeout?: number;
  retries?: number;
  headers?: Record<string, string>;
}

/**
 * API请求上下文
 */
export interface ApiRequestContext {
  userId?: string;
  agentId?: string;
  timestamp: number;
  requestId: string;
} 