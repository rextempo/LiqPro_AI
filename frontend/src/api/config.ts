/**
 * API配置文件
 * 包含API基础URL、超时设置和其他配置参数
 */

// API基础URL，根据环境变量设置不同的URL
export const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

// WebSocket URL
export const WS_BASE_URL = process.env.REACT_APP_WS_BASE_URL || 'ws://localhost:3002';

// API请求超时时间（毫秒）
export const API_TIMEOUT = 30000;

// API版本
export const API_VERSION = 'v1';

// 请求重试配置
export const RETRY_CONFIG = {
  maxRetries: 3,
  initialDelayMs: 1000, // 初始延迟1秒
  maxDelayMs: 10000,    // 最大延迟10秒
};

// 缓存配置
export const CACHE_CONFIG = {
  enabled: true,
  maxAge: 5 * 60 * 1000, // 5分钟
  excludePaths: ['/auth', '/user/profile'], // 不缓存的路径
};

// WebSocket配置
export const WS_CONFIG = {
  reconnectInterval: 2000,
  maxReconnectAttempts: 5,
  heartbeatInterval: 30000,
};

// 认证相关配置
export const AUTH_CONFIG = {
  tokenStorageKey: 'liqpro_auth_token',
  refreshTokenStorageKey: 'liqpro_refresh_token',
  tokenExpiryKey: 'liqpro_token_expiry',
};

// 导出默认配置
export default {
  baseUrl: API_BASE_URL,
  wsUrl: WS_BASE_URL,
  timeout: API_TIMEOUT,
  version: API_VERSION,
  retry: RETRY_CONFIG,
  cache: CACHE_CONFIG,
  ws: WS_CONFIG,
  auth: AUTH_CONFIG,
}; 