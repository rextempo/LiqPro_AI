/**
 * 认证中间件
 * 用于验证JWT令牌和设置用户信息
 */

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { Logger } from '../utils/logger';
import { config } from '../config';

// 创建日志记录器
const logger = new Logger('AuthMiddleware');

// 扩展Request类型以包含用户信息
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        role: string;
      };
    }
  }
}

/**
 * JWT认证中间件
 * 验证请求头中的JWT令牌，并将用户信息设置到req.user
 */
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // 验证JWT
        const decoded = jwt.verify(token, config.auth.jwtSecret) as { userId: string; role: string };
        
        // 设置用户信息
        req.user = {
          userId: decoded.userId,
          role: decoded.role
        };
        
        logger.debug(`JWT认证成功: ${decoded.userId}`);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.warn(`JWT认证失败: ${errorMessage}`);
        // 不设置req.user，继续处理请求
      }
    }
    
    // 继续处理请求，无论认证是否成功
    next();
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`JWT认证错误: ${errorMessage}`);
    next();
  }
};

/**
 * 要求认证中间件
 * 检查用户是否已认证，如果未认证则返回401错误
 */
export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.user) {
    logger.warn('访问受限资源: 未认证');
    return res.status(401).json({
      success: false,
      message: '未认证'
    });
  }
  
  next();
};

/**
 * 要求角色中间件
 * 检查用户是否具有指定角色，如果没有则返回403错误
 */
export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      logger.warn('访问受限资源: 未认证');
      return res.status(401).json({
        success: false,
        message: '未认证'
      });
    }
    
    if (req.user.role !== role) {
      logger.warn(`访问受限资源: 权限不足 (${req.user.userId}, ${req.user.role})`);
      return res.status(403).json({
        success: false,
        message: '权限不足'
      });
    }
    
    next();
  };
}; 