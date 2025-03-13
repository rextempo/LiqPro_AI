import * as jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { SignOptions, Secret } from 'jsonwebtoken';

export interface JWTPayload {
  userId: string;
  role: string;
  sessionId: string;
}

export class JWTService {
  private readonly accessTokenSecret: Secret;
  private readonly refreshTokenSecret: Secret;
  private readonly accessTokenExpiry: number;
  private readonly refreshTokenExpiry: number;

  constructor() {
    // 在生产环境中，这些值应该从环境变量中获取
    this.accessTokenSecret = process.env.JWT_ACCESS_SECRET || randomBytes(32).toString('hex');
    this.refreshTokenSecret = process.env.JWT_REFRESH_SECRET || randomBytes(32).toString('hex');
    // 将时间字符串转换为秒数
    this.accessTokenExpiry = process.env.JWT_ACCESS_EXPIRY
      ? this.parseTimeToSeconds(process.env.JWT_ACCESS_EXPIRY)
      : 15 * 60; // 默认15分钟
    this.refreshTokenExpiry = process.env.JWT_REFRESH_EXPIRY
      ? this.parseTimeToSeconds(process.env.JWT_REFRESH_EXPIRY)
      : 7 * 24 * 60 * 60; // 默认7天
  }

  private parseTimeToSeconds(time: string): number {
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

  async generateAccessToken(payload: JWTPayload): Promise<string> {
    const options: SignOptions = {
      expiresIn: this.accessTokenExpiry,
      algorithm: 'HS512',
    };
    return jwt.sign(payload, this.accessTokenSecret, options);
  }

  async generateRefreshToken(payload: JWTPayload): Promise<string> {
    const options: SignOptions = {
      expiresIn: this.refreshTokenExpiry,
      algorithm: 'HS512',
    };
    return jwt.sign(payload, this.refreshTokenSecret, options);
  }

  async verifyAccessToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.accessTokenSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid access token');
    }
  }

  async verifyRefreshToken(token: string): Promise<JWTPayload> {
    try {
      const decoded = jwt.verify(token, this.refreshTokenSecret) as JWTPayload;
      return decoded;
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  async generateTokenPair(payload: JWTPayload): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
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
