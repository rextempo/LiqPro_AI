/**
 * 认证中间件
 */
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { logger } from '../utils/logger';

/**
 * API密钥验证中间件
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction) => {
  // 如果没有配置API密钥，则跳过验证
  if (config.apiKeys.length === 0) {
    return next();
  }
  
  // 从请求头获取API密钥
  const apiKey = req.header('X-API-Key');
  
  // 如果没有提供API密钥
  if (!apiKey) {
    logger.warn('API请求未提供密钥', {
      ip: req.ip,
      path: req.path,
    });
    
    return res.status(401).json({
      error: '未授权',
      message: '缺少API密钥',
    });
  }
  
  // 验证API密钥
  if (!config.apiKeys.includes(apiKey)) {
    logger.warn('API请求使用了无效的密钥', {
      ip: req.ip,
      path: req.path,
    });
    
    return res.status(403).json({
      error: '禁止访问',
      message: 'API密钥无效',
    });
  }
  
  // API密钥有效，继续处理请求
  next();
}; 