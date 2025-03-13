/**
 * 认证路由
 * 处理用户认证、令牌管理和会话验证
 */

import { Router } from 'express';
import { Logger } from '../utils/logger';
import * as authController from '../controllers/auth-controller';
import { authenticateJWT, requireAuth } from '../middleware/auth-middleware';

// 创建日志记录器
const logger = new Logger('AuthRoutes');

// 创建路由器
const router = Router();

/**
 * 钱包登录
 * POST /auth/wallet
 * 请求体: { walletAddress: string, signature: string }
 * 响应: { success: true, data: { accessToken: string, refreshToken: string, expiresIn: number } }
 */
router.post('/wallet', authController.loginWithWallet);

/**
 * API密钥登录
 * POST /auth/api-key
 * 请求体: { apiKey: string }
 * 响应: { success: true, data: { accessToken: string, refreshToken: string, expiresIn: number } }
 */
router.post('/api-key', authController.loginWithApiKey);

/**
 * 刷新令牌
 * POST /auth/refresh
 * 请求体: { refreshToken: string }
 * 响应: { success: true, data: { accessToken: string, refreshToken: string, expiresIn: number } }
 */
router.post('/refresh', authController.refreshToken);

/**
 * 登出
 * POST /auth/logout
 * 请求头: Authorization: Bearer <token>
 * 响应: { success: true }
 */
router.post('/logout', authenticateJWT, authController.logout);

/**
 * 验证会话
 * GET /auth/validate
 * 请求头: Authorization: Bearer <token>
 * 响应: { success: true, data: { valid: boolean } }
 */
router.get('/validate', authenticateJWT, authController.validateSession);

/**
 * 获取当前用户信息
 * GET /user/profile
 * 请求头: Authorization: Bearer <token>
 * 响应: { success: true, data: UserProfile }
 */
router.get('/user/profile', authenticateJWT, requireAuth, authController.getCurrentUser);

logger.info('认证路由已注册');

export default router; 