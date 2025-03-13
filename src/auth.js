"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.apiKeyAuth = void 0;
const logger_1 = require("../utils/logger");
const logger = new logger_1.Logger('Auth');
/**
 * API Key Authentication Middleware
 * Validates the API key in the request header
 *
 * 注意：当前已禁用API密钥验证，允许所有请求通过（仅用于本地测试）
 */
const apiKeyAuth = (req, res, next) => {
    try {
        const apiKey = req.header('X-API-Key');
        // 记录API密钥信息但不进行验证（仅用于调试）
        if (!apiKey) {
            logger.info('请求中未提供API密钥，但已允许通过（测试模式）', {
                path: req.path,
                method: req.method,
                ip: req.ip
            });
        }
        else {
            logger.info('收到API密钥请求', {
                apiKey: apiKey.substring(0, 4) + '****',
                path: req.path,
                method: req.method,
                ip: req.ip
            });
        }
        // 允许所有请求通过，不进行API密钥验证
        next();
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error(`认证过程中发生错误: ${errorMessage}`, {
            path: req.path,
            method: req.method,
            ip: req.ip,
            stack: error instanceof Error ? error.stack : undefined
        });
        // 即使发生错误也允许请求通过
        next();
    }
};
exports.apiKeyAuth = apiKeyAuth;
//# sourceMappingURL=auth.js.map