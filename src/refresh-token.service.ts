import { Redis } from 'ioredis';
import { randomBytes } from 'crypto';

export class RefreshTokenService {
  private readonly redis: Redis;
  private readonly blacklistPrefix = 'token:blacklist:';
  private readonly refreshTokenPrefix = 'refresh:';

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  async createRefreshToken(userId: string): Promise<string> {
    const tokenId = randomBytes(32).toString('hex');
    const token = `${tokenId}.${userId}`;

    // 存储刷新令牌，设置7天过期
    await this.redis.setex(
      `${this.refreshTokenPrefix}${tokenId}`,
      7 * 24 * 60 * 60, // 7 days
      userId
    );

    return token;
  }

  async validateRefreshToken(token: string): Promise<string | null> {
    const [tokenId, userId] = token.split('.');

    // 检查令牌是否在黑名单中
    const isBlacklisted = await this.redis.exists(`${this.blacklistPrefix}${tokenId}`);
    if (isBlacklisted) {
      return null;
    }

    // 验证令牌
    const storedUserId = await this.redis.get(`${this.refreshTokenPrefix}${tokenId}`);
    if (!storedUserId || storedUserId !== userId) {
      return null;
    }

    return userId;
  }

  async revokeRefreshToken(token: string): Promise<void> {
    const [tokenId] = token.split('.');

    // 将令牌加入黑名单，设置与原令牌相同的过期时间
    await this.redis.setex(
      `${this.blacklistPrefix}${tokenId}`,
      7 * 24 * 60 * 60, // 7 days
      '1'
    );

    // 删除刷新令牌
    await this.redis.del(`${this.refreshTokenPrefix}${tokenId}`);
  }

  async revokeAllUserTokens(userId: string): Promise<void> {
    const pattern = `${this.refreshTokenPrefix}*`;
    const stream = this.redis.scanStream({
      match: pattern,
      count: 100,
    });

    for await (const keys of stream) {
      for (const key of keys) {
        const storedUserId = await this.redis.get(key);
        if (storedUserId === userId) {
          const tokenId = key.replace(this.refreshTokenPrefix, '');
          await this.redis.setex(`${this.blacklistPrefix}${tokenId}`, 7 * 24 * 60 * 60, '1');
          await this.redis.del(key);
        }
      }
    }
  }
}
