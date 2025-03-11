import { ServiceConfig } from './types';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

/**
 * 默认健康检查配置
 */
export const DEFAULT_HEALTH_CHECK = {
  interval: 60000, // 1分钟
  timeout: 5000,   // 5秒
};

/**
 * 应用程序配置接口
 */
export interface ServiceConfig {
  // 环境配置
  env: 'development' | 'production' | 'test';
  isDevelopment: boolean;
  isProduction: boolean;
  isTest: boolean;
  
  // 服务器配置
  port: number;
  host: string;
  
  // 日志配置
  logLevel: string;
  
  // 巡航服务配置
  cruise: {
    // 健康检查默认间隔（毫秒）
    defaultHealthCheckInterval: number;
    // 仓位优化默认间隔（毫秒）
    defaultOptimizationInterval: number;
    // 指标报告间隔（毫秒）
    metricsReportingInterval: number;
  };
  
  // 安全配置
  security: {
    // 交易签名超时（毫秒）
    transactionSignatureTimeout: number;
    // 最大交易重试次数
    maxTransactionRetries: number;
  };
}

// 从环境变量加载配置
const env = process.env.NODE_ENV || 'development';

/**
 * 应用程序配置
 */
export const config: ServiceConfig = {
  // 环境配置
  env: env as 'development' | 'production' | 'test',
  isDevelopment: env === 'development',
  isProduction: env === 'production',
  isTest: env === 'test',
  
  // 服务器配置
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || '0.0.0.0',
  
  // 日志配置
  logLevel: process.env.LOG_LEVEL || (env === 'development' ? 'debug' : 'info'),
  
  // 巡航服务配置
  cruise: {
    // 默认每5分钟执行一次健康检查
    defaultHealthCheckInterval: parseInt(process.env.DEFAULT_HEALTH_CHECK_INTERVAL || '300000', 10),
    // 默认每小时执行一次仓位优化
    defaultOptimizationInterval: parseInt(process.env.DEFAULT_OPTIMIZATION_INTERVAL || '3600000', 10),
    // 默认每分钟报告一次指标
    metricsReportingInterval: parseInt(process.env.METRICS_REPORTING_INTERVAL || '60000', 10)
  },
  
  // 安全配置
  security: {
    // 默认交易签名超时30秒
    transactionSignatureTimeout: parseInt(process.env.TRANSACTION_SIGNATURE_TIMEOUT || '30000', 10),
    // 默认最多重试3次
    maxTransactionRetries: parseInt(process.env.MAX_TRANSACTION_RETRIES || '3', 10)
  }
};

/**
 * 默认代理配置
 */
export const DEFAULT_AGENT_CONFIG = {
  maxPositions: 5,
  minSolBalance: 0.1,
  targetHealthScore: 4.0,
  riskTolerance: 'medium' as const,
  healthCheckIntervalMinutes: 30,
  marketChangeCheckIntervalMinutes: 15,
  optimizationIntervalHours: 24,
  emergencyThresholds: {
    minHealthScore: 1.5,
    maxDrawdown: 0.15, // 15%
  },
};

/**
 * 巡航模块配置
 */
export const CRUISE_CONFIG = {
  // 健康检查配置
  healthCheck: {
    defaultIntervalMinutes: 30,
    minIntervalMinutes: 5,
    maxIntervalMinutes: 120,
  },
  
  // 市场变化检测配置
  marketChangeDetection: {
    defaultIntervalMinutes: 15,
    minIntervalMinutes: 5,
    maxIntervalMinutes: 60,
    significantPriceChangeThreshold: 0.05, // 5%
    significantVolumeChangeThreshold: 0.2, // 20%
    significantLiquidityChangeThreshold: 0.1, // 10%
  },
  
  // 仓位优化配置
  positionOptimization: {
    defaultIntervalHours: 24,
    minIntervalHours: 6,
    maxIntervalHours: 72,
    minHealthScoreForOptimization: 3.0,
    defaultReductionPercentage: 0.3, // 30%
  },
  
  // 风险控制配置
  riskControl: {
    emergencyExitHealthScore: 1.5,
    warningHealthScore: 3.0,
    optimalHealthScore: 4.0,
  },
}; 