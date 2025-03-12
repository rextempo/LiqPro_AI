/**
 * API客户端索引文件
 * 统一导出所有API客户端和工具类
 */

// 配置
import config from './config';
export { default as config } from './config';

// 类型定义
export * from './types';

// 工具类
export { default as httpClient } from './utils/http-client';
export { default as websocketClient } from './utils/websocket-client';

// API客户端
export { default as authClient } from './clients/auth-client';
export { default as signalClient } from './clients/signal-client';
export { default as agentClient } from './clients/agent-client';
export { default as poolClient } from './clients/pool-client';
export { default as marketClient } from './clients/market-client';
export { default as transactionClient } from './clients/transaction-client';
export { default as walletClient } from './clients/wallet-client';

/**
 * 初始化API客户端
 * 在应用启动时调用，设置认证状态和WebSocket连接
 */
export const initApi = async (): Promise<boolean> => {
  try {
    // 导入所有客户端
    const { default: authClient } = await import('./clients/auth-client');
    const { default: websocketClient } = await import('./utils/websocket-client');
    
    // 初始化认证状态
    const isAuthenticated = authClient.initAuth();
    
    // 如果已认证，连接WebSocket
    if (isAuthenticated) {
      // 恢复WebSocket会话
      websocketClient.restoreSession();
      
      // 连接WebSocket
      await websocketClient.connect();
    }
    
    return isAuthenticated;
  } catch (error) {
    console.error('Failed to initialize API:', error);
    return false;
  }
};

// 导出默认对象
export default {
  config,
  initApi,
  authClient: () => import('./clients/auth-client').then(m => m.default),
  signalClient: () => import('./clients/signal-client').then(m => m.default),
  agentClient: () => import('./clients/agent-client').then(m => m.default),
  poolClient: () => import('./clients/pool-client').then(m => m.default),
  marketClient: () => import('./clients/market-client').then(m => m.default),
  transactionClient: () => import('./clients/transaction-client').then(m => m.default),
  walletClient: () => import('./clients/wallet-client').then(m => m.default),
  httpClient: () => import('./utils/http-client').then(m => m.default),
  websocketClient: () => import('./utils/websocket-client').then(m => m.default),
}; 