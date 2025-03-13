/**
 * Authentication Middleware
 */
import { Request, Response, NextFunction } from 'express';
/**
 * API Key Authentication Middleware
 * Validates the API key in the request header
 *
 * 注意：当前已禁用API密钥验证，允许所有请求通过（仅用于本地测试）
 */
export declare const apiKeyAuth: (req: Request, res: Response, next: NextFunction) => void;
