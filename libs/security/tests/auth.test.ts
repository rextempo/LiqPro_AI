import { JWTService } from '../src/auth/jwt.service';
import { RefreshTokenService } from '../src/auth/refresh-token.service';
import { RateLimiterService } from '../src/auth/rate-limiter.service';
import Redis from 'ioredis';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

// 检查Redis是否可用
const isRedisAvailable = async () => {
  try {
    const redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '',
      connectTimeout: 5000,
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: true
    });
    
    await redis.connect();
    await redis.ping();
    await redis.quit();
    return true;
  } catch (error) {
    console.warn('Redis not available for testing:', error.message);
    return false;
  }
};

describe('Authentication System Tests', () => {
  let jwtService: JWTService;
  let refreshTokenService: RefreshTokenService;
  let rateLimiterService: RateLimiterService;
  let redis: Redis;
  let redisAvailable = false;

  beforeAll(async () => {
    // 检查Redis是否可用
    redisAvailable = await isRedisAvailable();
    
    // 创建Redis客户端，使用更健壮的配置
    redis = new Redis({
      host: process.env.REDIS_HOST || '127.0.0.1',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD || '',
      connectTimeout: 10000,
      maxRetriesPerRequest: 3,
      retryStrategy: (times) => {
        if (times > 3) return null; // 超过3次重试后停止
        return Math.min(times * 200, 1000); // 指数退避策略
      },
      enableOfflineQueue: false
    });

    jwtService = new JWTService();
    refreshTokenService = new RefreshTokenService(redis);
    rateLimiterService = new RateLimiterService(redis);
  });

  afterAll(async () => {
    // 确保Redis连接正确关闭
    try {
      if (redis && redis.status !== 'end') {
        await redis.quit();
        redis.disconnect();
      }
    } catch (error) {
      console.error('Error closing Redis connection:', error);
    }
  });

  describe('JWT Service', () => {
    const testPayload = {
      userId: '123',
      role: 'user',
      sessionId: '456',
    };

    it('should generate and verify access token', async () => {
      const token = await jwtService.generateAccessToken(testPayload);
      expect(token).toBeTruthy();

      const decoded = await jwtService.verifyAccessToken(token);
      expect(decoded).toMatchObject(testPayload);
    });

    it('should generate and verify refresh token', async () => {
      const token = await jwtService.generateRefreshToken(testPayload);
      expect(token).toBeTruthy();

      const decoded = await jwtService.verifyRefreshToken(token);
      expect(decoded).toMatchObject(testPayload);
    });

    it('should reject invalid tokens', async () => {
      await expect(jwtService.verifyAccessToken('invalid-token')).rejects.toThrow(
        'Invalid access token'
      );
    });
  });

  describe('Refresh Token Service', () => {
    const userId = 'test-user-123';

    beforeEach(() => {
      // 如果Redis不可用，跳过这些测试
      if (!redisAvailable) {
        console.warn('Skipping Redis-dependent test');
        return;
      }
    });

    it('should create and validate refresh token', async () => {
      // 如果Redis不可用，跳过测试
      if (!redisAvailable) return;
      
      const token = await refreshTokenService.createRefreshToken(userId);
      expect(token).toBeTruthy();

      const validatedUserId = await refreshTokenService.validateRefreshToken(token);
      expect(validatedUserId).toBe(userId);
    });

    it('should revoke refresh token', async () => {
      // 如果Redis不可用，跳过测试
      if (!redisAvailable) return;
      
      const token = await refreshTokenService.createRefreshToken(userId);
      await refreshTokenService.revokeRefreshToken(token);

      const validatedUserId = await refreshTokenService.validateRefreshToken(token);
      expect(validatedUserId).toBeNull();
    });

    it('should revoke all user tokens', async () => {
      // 如果Redis不可用，跳过测试
      if (!redisAvailable) return;
      
      const token1 = await refreshTokenService.createRefreshToken(userId);
      const token2 = await refreshTokenService.createRefreshToken(userId);

      await refreshTokenService.revokeAllUserTokens(userId);

      const valid1 = await refreshTokenService.validateRefreshToken(token1);
      const valid2 = await refreshTokenService.validateRefreshToken(token2);

      expect(valid1).toBeNull();
      expect(valid2).toBeNull();
    });
  });

  describe('Rate Limiter Service', () => {
    const identifier = 'test-client';
    const type = 'api';
    const config = {
      windowSize: 1, // 1 second
      maxRequests: 2, // 2 requests per second
    };

    beforeEach(async () => {
      // 如果Redis不可用，跳过测试
      if (!redisAvailable) return;
      
      // 清理之前的测试数据
      try {
        await redis.del(`ratelimit:${type}:${identifier}`);
      } catch (error) {
        console.warn('Failed to clean up test data:', error.message);
      }
    });

    it('should limit requests according to configuration', async () => {
      // 如果Redis不可用，跳过测试
      if (!redisAvailable) return;
      
      // 第一个请求
      const result1 = await rateLimiterService.isRateLimited(identifier, type, config);
      expect(result1.isLimited).toBe(false);
      expect(result1.remaining).toBe(1);

      // 第二个请求
      const result2 = await rateLimiterService.isRateLimited(identifier, type, config);
      expect(result2.isLimited).toBe(false);
      expect(result2.remaining).toBe(0);

      // 第三个请求（应该被限制）
      const result3 = await rateLimiterService.isRateLimited(identifier, type, config);
      expect(result3.isLimited).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should reset limits after window expires', async () => {
      // 如果Redis不可用，跳过测试
      if (!redisAvailable) return;
      
      // 发送两个请求
      await rateLimiterService.isRateLimited(identifier, type, config);
      await rateLimiterService.isRateLimited(identifier, type, config);

      // 等待窗口过期
      await sleep(1100);

      // 新的请求应该被允许
      const result = await rateLimiterService.isRateLimited(identifier, type, config);
      expect(result.isLimited).toBe(false);
      expect(result.remaining).toBe(1);
    });

    it('should handle custom rate limits', async () => {
      // 如果Redis不可用，跳过测试
      if (!redisAvailable) return;
      
      const customConfig = {
        windowSize: 1,
        maxRequests: 5,
      };

      await rateLimiterService.createCustomLimit(type, customConfig);
      const retrievedConfig = await rateLimiterService.getCustomLimit(type);

      expect(retrievedConfig).toMatchObject(customConfig);
    });
  });
});
