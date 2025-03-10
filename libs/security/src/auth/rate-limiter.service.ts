import { Redis } from 'ioredis';

export interface RateLimitConfig {
  windowSize: number; // 时间窗口大小（秒）
  maxRequests: number; // 最大请求数
}

export class RateLimiterService {
  private readonly redis: Redis;
  private readonly defaultConfig: RateLimitConfig = {
    windowSize: 60, // 1分钟
    maxRequests: 100, // 每分钟100个请求
  };

  constructor(redisClient: Redis) {
    this.redis = redisClient;
  }

  private getKey(identifier: string, type: string): string {
    return `ratelimit:${type}:${identifier}`;
  }

  async isRateLimited(
    identifier: string,
    type = 'default',
    config: RateLimitConfig = this.defaultConfig
  ): Promise<{
    isLimited: boolean;
    remaining: number;
    resetTime: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const key = this.getKey(identifier, type);
    const windowStart = now - config.windowSize;

    // 使用 Redis pipeline 优化性能
    const pipeline = this.redis.pipeline();

    // 移除窗口外的请求记录
    pipeline.zremrangebyscore(key, 0, windowStart);

    // 获取当前窗口内的请求数
    pipeline.zcard(key);

    // 添加新的请求记录
    pipeline.zadd(key, now, `${now}-${Math.random()}`);

    // 设置过期时间
    pipeline.expire(key, config.windowSize);

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    // 获取当前请求数（不包括刚添加的请求）
    const requestCount = results[1][1] as number;
    const isLimited = requestCount >= config.maxRequests;

    // 计算剩余配额（包括刚添加的请求）
    const remaining = Math.max(0, config.maxRequests - (requestCount + 1));
    const resetTime = now + config.windowSize;

    return {
      isLimited,
      remaining,
      resetTime,
    };
  }

  async getRemainingQuota(
    identifier: string,
    type = 'default',
    config: RateLimitConfig = this.defaultConfig
  ): Promise<{
    remaining: number;
    resetTime: number;
  }> {
    const now = Math.floor(Date.now() / 1000);
    const key = this.getKey(identifier, type);
    const windowStart = now - config.windowSize;

    // 清理过期记录并获取当前请求数
    const pipeline = this.redis.pipeline();
    pipeline.zremrangebyscore(key, 0, windowStart);
    pipeline.zcard(key);

    const results = await pipeline.exec();
    if (!results) {
      throw new Error('Redis pipeline execution failed');
    }

    const requestCount = results[1][1] as number;
    const remaining = Math.max(0, config.maxRequests - requestCount);
    const resetTime = now + config.windowSize;

    return {
      remaining,
      resetTime,
    };
  }

  // 自定义限流规则
  async createCustomLimit(type: string, config: RateLimitConfig): Promise<void> {
    const key = `ratelimit:config:${type}`;
    await this.redis.hmset(key, {
      windowSize: config.windowSize,
      maxRequests: config.maxRequests,
    });
  }

  // 获取限流规则
  async getCustomLimit(type: string): Promise<RateLimitConfig | null> {
    const key = `ratelimit:config:${type}`;
    const config = await this.redis.hgetall(key);

    if (!config.windowSize || !config.maxRequests) {
      return null;
    }

    return {
      windowSize: parseInt(config.windowSize),
      maxRequests: parseInt(config.maxRequests),
    };
  }
}
