import { createLogger } from './logger';
import metrics, {
  register,
  metricsMiddleware,
  setupMetricsEndpoint,
  httpRequestsTotal,
  httpRequestDurationSeconds,
  mqConnectionStatus,
  mqMessagesPublishedTotal,
  mqMessagesConsumedTotal,
  mqMessageProcessingDurationSeconds,
  mqMessageProcessingErrorsTotal,
  agentsTotal,
  agentOperationsTotal,
  agentOperationDurationSeconds,
  systemHealthStatus,
  resetMetrics
} from './metrics';
import health, {
  initializeHealthMonitoring,
  updateComponentHealth,
  getComponentHealth,
  getAllComponentsHealth,
  getSystemHealth,
  healthCheckMiddleware,
  setupHealthEndpoint,
  checkMessageQueueHealth,
  checkExternalServiceHealth,
  startHealthChecks,
  stopHealthChecks,
  SystemComponent,
  HealthStatus
} from './health';

// 导出所有监控组件
export {
  // Logger
  createLogger,
  
  // Metrics registry and middleware
  register,
  metricsMiddleware,
  setupMetricsEndpoint,
  
  // HTTP metrics
  httpRequestsTotal,
  httpRequestDurationSeconds,
  
  // Message queue metrics
  mqConnectionStatus,
  mqMessagesPublishedTotal,
  mqMessagesConsumedTotal,
  mqMessageProcessingDurationSeconds,
  mqMessageProcessingErrorsTotal,
  
  // Agent metrics
  agentsTotal,
  agentOperationsTotal,
  agentOperationDurationSeconds,
  
  // System metrics
  systemHealthStatus,
  
  // Health monitoring
  initializeHealthMonitoring,
  updateComponentHealth,
  getComponentHealth,
  getAllComponentsHealth,
  getSystemHealth,
  healthCheckMiddleware,
  setupHealthEndpoint,
  checkMessageQueueHealth,
  checkExternalServiceHealth,
  startHealthChecks,
  stopHealthChecks,
  SystemComponent,
  HealthStatus,
  
  // Utilities
  resetMetrics
};

// 导出默认对象
export default {
  logger: { createLogger },
  metrics,
  health
}; 