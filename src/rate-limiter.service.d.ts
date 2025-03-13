import { Redis } from 'ioredis';
export interface RateLimitConfig {
  windowSize: number;
  maxRequests: number;
}
export declare class RateLimiterService {
  private readonly redis;
  private readonly defaultConfig;
  constructor(redisClient: Redis);
  private getKey;
  isRateLimited(
    identifier: string,
    type?: string,
    config?: RateLimitConfig
  ): Promise<{
    isLimited: boolean;
    remaining: number;
    resetTime: number;
  }>;
  getRemainingQuota(
    identifier: string,
    type?: string,
    config?: RateLimitConfig
  ): Promise<{
    remaining: number;
    resetTime: number;
  }>;
  createCustomLimit(type: string, config: RateLimitConfig): Promise<void>;
  getCustomLimit(type: string): Promise<RateLimitConfig | null>;
}
//# sourceMappingURL=rate-limiter.service.d.ts.map
