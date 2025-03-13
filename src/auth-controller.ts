/**
 * 认证控制器
 * 处理用户认证、令牌管理和会话验证
 */

import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { Logger } from '../utils/logger';
import { config } from '../config';

// 创建日志记录器
const logger = new Logger('AuthController');

// 模拟用户数据库
const users = new Map();

// 模拟令牌数据库
const tokens = new Map();

// 用户类型定义
interface User {
  id: string;
  walletAddress?: string;
  apiKey?: string;
  role: string;
  createdAt: Date;
}

// 令牌类型定义
interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

/**
 * 生成JWT令牌
 * @param userId 用户ID
 * @param role 用户角色
 * @returns 令牌对象
 */
const generateTokens = (userId: string, role: string): TokenPair => {
  const accessToken = jwt.sign(
    { userId, role },
    config.auth.jwtSecret,
    { expiresIn: config.auth.accessTokenExpiry }
  );

  const refreshToken = jwt.sign(
    { userId, type: 'refresh' },
    config.auth.jwtSecret,
    { expiresIn: config.auth.refreshTokenExpiry }
  );

  // 存储令牌
  tokens.set(refreshToken, {
    userId,
    accessToken,
    refreshToken,
    expiresIn: config.auth.accessTokenExpiry,
    createdAt: new Date()
  });

  return {
    accessToken,
    refreshToken,
    expiresIn: config.auth.accessTokenExpiry,
    userId
  };
};

/**
 * 验证钱包签名
 * @param walletAddress 钱包地址
 * @param signature 签名
 * @returns 是否有效
 */
const verifyWalletSignature = (walletAddress: string, signature: string): boolean => {
  // 在实际应用中，这里应该实现真正的签名验证逻辑
  // 这里仅作为示例，始终返回true
  logger.info(`验证钱包签名: ${walletAddress}`);
  return true;
};

/**
 * 钱包登录
 * @param req 请求对象
 * @param res 响应对象
 */
export const loginWithWallet = (req: Request, res: Response) => {
  try {
    const { walletAddress, signature } = req.body;

    // 验证请求参数
    if (!walletAddress || !signature) {
      logger.warn('钱包登录失败: 缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 验证钱包签名
    if (!verifyWalletSignature(walletAddress, signature)) {
      logger.warn(`钱包登录失败: 签名无效 (${walletAddress})`);
      return res.status(401).json({
        success: false,
        message: '签名无效'
      });
    }

    // 查找或创建用户
    let user = Array.from(users.values()).find((u: User) => u.walletAddress === walletAddress) as User;

    if (!user) {
      const userId = crypto.randomUUID();
      user = {
        id: userId,
        walletAddress,
        role: 'user',
        createdAt: new Date()
      };
      users.set(userId, user);
      logger.info(`创建新用户: ${userId} (${walletAddress})`);
    }

    // 生成令牌
    const tokens = generateTokens(user.id, user.role);

    logger.info(`钱包登录成功: ${user.id} (${walletAddress})`);
    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`钱包登录错误: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * API密钥登录
 * @param req 请求对象
 * @param res 响应对象
 */
export const loginWithApiKey = (req: Request, res: Response) => {
  try {
    const { apiKey } = req.body;

    // 验证请求参数
    if (!apiKey) {
      logger.warn('API密钥登录失败: 缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 验证API密钥
    if (apiKey !== config.auth.defaultApiKey && !config.apiKeys.includes(apiKey)) {
      logger.warn(`API密钥登录失败: 密钥无效`);
      return res.status(401).json({
        success: false,
        message: 'API密钥无效'
      });
    }

    // 查找或创建用户
    let user = Array.from(users.values()).find((u: User) => u.apiKey === apiKey) as User;

    if (!user) {
      const userId = crypto.randomUUID();
      user = {
        id: userId,
        apiKey,
        role: 'api',
        createdAt: new Date()
      };
      users.set(userId, user);
      logger.info(`创建新API用户: ${userId}`);
    }

    // 生成令牌
    const tokens = generateTokens(user.id, user.role);

    logger.info(`API密钥登录成功: ${user.id}`);
    return res.status(200).json({
      success: true,
      data: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresIn: tokens.expiresIn
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`API密钥登录错误: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * 刷新令牌
 * @param req 请求对象
 * @param res 响应对象
 */
export const refreshToken = (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;

    // 验证请求参数
    if (!refreshToken) {
      logger.warn('刷新令牌失败: 缺少必要参数');
      return res.status(400).json({
        success: false,
        message: '缺少必要参数'
      });
    }

    // 验证刷新令牌
    const tokenData = tokens.get(refreshToken);
    if (!tokenData) {
      logger.warn(`刷新令牌失败: 令牌无效`);
      return res.status(401).json({
        success: false,
        message: '刷新令牌无效'
      });
    }

    // 获取用户
    const user = users.get(tokenData.userId) as User;
    if (!user) {
      logger.warn(`刷新令牌失败: 用户不存在 (${tokenData.userId})`);
      return res.status(401).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 删除旧令牌
    tokens.delete(refreshToken);

    // 生成新令牌
    const newTokens = generateTokens(user.id, user.role);

    logger.info(`刷新令牌成功: ${user.id}`);
    return res.status(200).json({
      success: true,
      data: {
        accessToken: newTokens.accessToken,
        refreshToken: newTokens.refreshToken,
        expiresIn: newTokens.expiresIn
      }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`刷新令牌错误: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * 登出
 * @param req 请求对象
 * @param res 响应对象
 */
export const logout = (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(200).json({ success: true });
    }

    const token = authHeader.split(' ')[1];
    
    // 查找并删除所有与此访问令牌相关的刷新令牌
    for (const [key, value] of tokens.entries()) {
      if (value.accessToken === token) {
        tokens.delete(key);
      }
    }

    logger.info(`用户登出成功`);
    return res.status(200).json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`登出错误: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * 验证会话
 * @param req 请求对象
 * @param res 响应对象
 */
export const validateSession = (req: Request, res: Response) => {
  try {
    // 如果请求到达这里，说明JWT已经被验证
    const valid = !!req.user;
    
    return res.status(200).json({
      success: true,
      data: { valid }
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`验证会话错误: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
};

/**
 * 获取当前用户信息
 * @param req 请求对象
 * @param res 响应对象
 */
export const getCurrentUser = (req: Request, res: Response) => {
  try {
    // 如果请求到达这里，说明用户已经通过认证
    const userId = (req.user as any).userId;
    const user = users.get(userId);

    if (!user) {
      logger.warn(`获取用户信息失败: 用户不存在 (${userId})`);
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }

    // 返回用户信息（排除敏感字段）
    const userProfile = {
      id: user.id,
      role: user.role,
      walletAddress: user.walletAddress,
      createdAt: user.createdAt
    };

    logger.info(`获取用户信息成功: ${userId}`);
    return res.status(200).json({
      success: true,
      data: userProfile
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`获取用户信息错误: ${errorMessage}`);
    return res.status(500).json({
      success: false,
      message: '服务器错误'
    });
  }
}; 