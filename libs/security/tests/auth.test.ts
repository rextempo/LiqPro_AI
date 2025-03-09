import { JWTService } from '../src/auth/jwt.service';
import { RefreshTokenService } from '../src/auth/refresh-token.service';
import { RateLimiterService } from '../src/auth/rate-limiter.service';
import Redis from 'ioredis';
import { promisify } from 'util';

const sleep = promisify(setTimeout);

describe('Authentication System Tests', () => {
  let jwtService: JWTService;
  let refreshTokenService: RefreshTokenService;
  let rateLimiterService: RateLimiterService;
  let redis: Redis;

  beforeAll(async () => {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: parseInt(process.env.REDIS_PORT || '6379'),
      password: process.env.REDIS_PASSWORD
    });
    
    jwtService = new JWTService();
    refreshTokenService = new RefreshTokenService(redis);
    rateLimiterService = new RateLimiterService(redis);
  });

  afterAll(async () => {
    await redis.quit();
  });

  describe('JWT Service', () => {
    const testPayload = {
      userId: '123',
      role: 'user',
      sessionId: '456'
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
      await expect(jwtService.verifyAccessToken('invalid-token'))
        .rejects.toThrow('Invalid access token');
    });
  });

  describe('Refresh Token Service', () => {
    const userId = 'test-user-123';

    it('should create and validate refresh token', async () => {
      const token = await refreshTokenService.createRefreshToken(userId);
      expect(token).toBeTruthy();
      
      const validatedUserId = await refreshTokenService.validateRefreshToken(token);
      expect(validatedUserId).toBe(userId);
    });

    it('should revoke refresh token', async () => {
      const token = await refreshTokenService.createRefreshToken(userId);
      await refreshTokenService.revokeRefreshToken(token);
      
      const validatedUserId = await refreshTokenService.validateRefreshToken(token);
      expect(validatedUserId).toBeNull();
    });

    it('should revoke all user tokens', async () => {
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
      windowSize: 1,  // 1 second
      maxRequests: 2  // 2 requests per second
    };

    beforeEach(async () => {
      // 清理之前的测试数据
      await redis.del(`ratelimit:${type}:${identifier}`);
    });

    it('should limit requests according to configuration', async () => {
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
      const customConfig = {
        windowSize: 1,
        maxRequests: 5
      };

      await rateLimiterService.createCustomLimit(type, customConfig);
      const retrievedConfig = await rateLimiterService.getCustomLimit(type);
      
      expect(retrievedConfig).toMatchObject(customConfig);
    });
  });
}); 