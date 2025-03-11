/**
 * Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';
import { Logger } from '../utils/logger';

const logger = new Logger('Auth');

/**
 * API Key Authentication Middleware
 * Validates the API key in the request header
 */
export const apiKeyAuth = (req: Request, res: Response, next: NextFunction): void => {
  try {
    const apiKey = req.header('X-API-Key');
    
    // Check if API key is provided
    if (!apiKey) {
      logger.warn('请求中缺少API密钥', {
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      res.status(401).json({
        status: 'error',
        message: '未授权：缺少API密钥'
      });
      return;
    }
    
    // Check if API key is valid
    if (!config.apiKeys.includes(apiKey)) {
      logger.warn('提供了无效的API密钥', { 
        apiKey: apiKey.substring(0, 4) + '****', 
        path: req.path,
        method: req.method,
        ip: req.ip
      });
      
      res.status(401).json({
        status: 'error',
        message: '未授权：无效的API密钥'
      });
      return;
    }
    
    // API key is valid, proceed to next middleware
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`认证过程中发生错误: ${errorMessage}`, {
      path: req.path,
      method: req.method,
      ip: req.ip,
      stack: error instanceof Error ? error.stack : undefined
    });
    
    res.status(500).json({
      status: 'error',
      message: '服务器错误：认证过程中发生错误'
    });
  }
}; 