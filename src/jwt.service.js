"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.JWTService = void 0;
const jwt = __importStar(require("jsonwebtoken"));
const crypto_1 = require("crypto");
class JWTService {
    constructor() {
        // 在生产环境中，这些值应该从环境变量中获取
        this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || (0, crypto_1.randomBytes)(32).toString('hex');
        this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || (0, crypto_1.randomBytes)(32).toString('hex');
        // 将时间字符串转换为秒数
        this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY
            ? this.parseTimeToSeconds(process.env.JWT_ACCESS_EXPIRY)
            : 15 * 60; // 默认15分钟
        this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY
            ? this.parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRY)
            : 7 * 24 * 60 * 60; // 默认7天
    }
    parseTimeToSeconds(time) {
        const unit = time.slice(-1);
        const value = parseInt(time.slice(0, -1));
        switch (unit) {
            case 's':
                return value;
            case 'm':
                return value * 60;
            case 'h':
                return value * 60 * 60;
            case 'd':
                return value * 24 * 60 * 60;
            default:
                throw new Error('Invalid time unit. Use s, m, h, or d');
        }
    }
    async generateAccessToken(payload) {
        const options = {
            expiresIn: this.accessTokenExpiry,
            algorithm: 'HS512',
        };
        return jwt.sign(payload, this.accessTokenSecret, options);
    }
    async generateRefreshToken(payload) {
        const options = {
            expiresIn: this.refreshTokenExpiry,
            algorithm: 'HS512',
        };
        return jwt.sign(payload, this.refreshTokenSecret, options);
    }
    async verifyAccessToken(token) {
        try {
            const decoded = jwt.verify(token, this.accessTokenSecret);
            return decoded;
        }
        catch (error) {
            throw new Error('Invalid access token');
        }
    }
    async verifyRefreshToken(token) {
        try {
            const decoded = jwt.verify(token, this.refreshTokenSecret);
            return decoded;
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    async generateTokenPair(payload) {
        const [accessToken, refreshToken] = await Promise.all([
            this.generateAccessToken(payload),
            this.generateRefreshToken(payload),
        ]);
        return {
            accessToken,
            refreshToken,
        };
    }
}
exports.JWTService = JWTService;
//# sourceMappingURL=jwt.service.js.map