/**
 * API错误码
 */
export enum ApiErrorCode {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  BAD_REQUEST = 'BAD_REQUEST'
}

/**
 * API错误类
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code: ApiErrorCode
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * API响应接口
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: ApiErrorCode;
    message: string;
  };
}

/**
 * 分页参数接口
 */
export interface PaginationParams {
  limit?: number;
  offset?: number;
}

/**
 * 排序参数接口
 */
export interface SortParams {
  sortBy?: string;
  order?: 'asc' | 'desc';
}

/**
 * 池子查询参数接口
 */
export interface PoolQueryParams extends PaginationParams, SortParams {
  minTvl?: number;
  minVolume?: number;
}

/**
 * 监控池子查询参数接口
 */
export interface MonitoredPoolQueryParams extends PaginationParams {
  status?: 'active' | 'inactive' | 'all';
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