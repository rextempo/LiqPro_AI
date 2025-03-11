/**
 * 缓存服务测试
 */
import { CacheService } from '../../services/cache-service';

// 模拟redis客户端
jest.mock('redis', () => {
  const mockRedisClient = {
    connect: jest.fn().mockResolvedValue(undefined),
    get: jest.fn(),
    set: jest.fn(),
    setEx: jest.fn(),
    del: jest.fn(),
    flushAll: jest.fn(),
    quit: jest.fn(),
    on: jest.fn()
  };
  
  return {
    createClient: jest.fn(() => mockRedisClient)
  };
});

describe('CacheService', () => {
  let cacheService: CacheService;
  
  beforeEach(() => {
    // 重置单例实例
    (CacheService as any).instance = undefined;
    
    // 创建新的缓存服务实例
    cacheService = CacheService.getInstance();
  });
  
  afterEach(async () => {
    // 清理缓存
    await cacheService.clear();
  });
  
  describe('Memory Cache', () => {
    it('should set and get value from memory cache', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };
      
      await cacheService.set(key, value);
      const result = await cacheService.get(key);
      
      expect(result).toEqual(value);
    });
    
    it('should return null for non-existent key', async () => {
      const result = await cacheService.get('non-existent-key');
      expect(result).toBeNull();
    });
    
    it('should delete value from cache', async () => {
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };
      
      await cacheService.set(key, value);
      await cacheService.delete(key);
      
      const result = await cacheService.get(key);
      expect(result).toBeNull();
    });
    
    it('should clear all values from cache', async () => {
      await cacheService.set('key1', 'value1');
      await cacheService.set('key2', 'value2');
      
      await cacheService.clear();
      
      const result1 = await cacheService.get('key1');
      const result2 = await cacheService.get('key2');
      
      expect(result1).toBeNull();
      expect(result2).toBeNull();
    });
    
    it('should respect TTL option', async () => {
      jest.useFakeTimers();
      
      const key = 'test-key';
      const value = { id: 1, name: 'Test' };
      
      await cacheService.set(key, value, { ttl: 1 }); // 1秒后过期
      
      // 立即获取，应该存在
      let result = await cacheService.get(key);
      expect(result).toEqual(value);
      
      // 前进2秒，超过TTL
      jest.advanceTimersByTime(2000);
      
      // 再次获取，应该为null
      result = await cacheService.get(key);
      expect(result).toBeNull();
      
      jest.useRealTimers();
    });
  });
  
  describe('Redis Cache', () => {
    let redisEnabledCacheService: CacheService;
    
    beforeEach(() => {
      // 重置单例实例
      (CacheService as any).instance = undefined;
      
      // 创建启用Redis的缓存服务实例
      redisEnabledCacheService = CacheService.getInstance('redis://localhost:6379');
      
      // 模拟Redis已连接
      (redisEnabledCacheService as any).redisEnabled = true;
    });
    
    it('should attempt to use Redis when useRedis option is true', async () => {
      const key = 'redis-test-key';
      const value = { id: 1, name: 'Redis Test' };
      
      // 模拟Redis get返回null
      const mockRedisClient = (redisEnabledCacheService as any).redisClient;
      mockRedisClient.get.mockResolvedValue(null);
      
      // 尝试从Redis获取数据
      const result = await redisEnabledCacheService.get(key, { useRedis: true });
      
      // 应该调用Redis客户端的get方法
      expect(mockRedisClient.get).toHaveBeenCalledWith(key);
      
      // 由于模拟返回null，结果应该为null
      expect(result).toBeNull();
    });
    
    it('should set value to Redis when useRedis option is true', async () => {
      const key = 'redis-test-key';
      const value = { id: 1, name: 'Redis Test' };
      
      // 模拟Redis set返回成功
      const mockRedisClient = (redisEnabledCacheService as any).redisClient;
      mockRedisClient.set.mockResolvedValue('OK');
      
      // 设置数据到Redis
      await redisEnabledCacheService.set(key, value, { useRedis: true });
      
      // 应该调用Redis客户端的set方法
      expect(mockRedisClient.set).toHaveBeenCalledWith(key, JSON.stringify(value));
    });
    
    it('should set value to Redis with TTL when useRedis and ttl options are provided', async () => {
      const key = 'redis-test-key';
      const value = { id: 1, name: 'Redis Test' };
      const ttl = 60;
      
      // 模拟Redis setEx返回成功
      const mockRedisClient = (redisEnabledCacheService as any).redisClient;
      mockRedisClient.setEx.mockResolvedValue('OK');
      
      // 设置数据到Redis，带TTL
      await redisEnabledCacheService.set(key, value, { useRedis: true, ttl });
      
      // 应该调用Redis客户端的setEx方法
      expect(mockRedisClient.setEx).toHaveBeenCalledWith(key, ttl, JSON.stringify(value));
    });
  });
  
  describe('Stats', () => {
    it('should return cache statistics', () => {
      const stats = cacheService.getStats();
      
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('redis');
    });
  });
}); 