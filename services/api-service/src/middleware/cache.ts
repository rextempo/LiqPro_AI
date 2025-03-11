/**
 * 缓存中间件
 * 用于在API请求中使用缓存
 */
import { Request, Response, NextFunction } from 'express';
import { CacheService, CacheOptions } from '../services/cache-service';
import { Logger } from '../utils/logger';
import { config } from '../config';

const logger = new Logger('CacheMiddleware');

/**
 * 缓存中间件选项接口
 */
export interface CacheMiddlewareOptions extends CacheOptions {
  keyPrefix?: string;
  keyGenerator?: (req: Request) => string;
  tags?: string[];
  condition?: (req: Request) => boolean;
  responseValidator?: (statusCode: number, body: any) => boolean;
}

/**
 * 缓存中间件
 * 用于缓存API响应
 * @param options 缓存选项
 * @returns 中间件函数
 */
export const cacheMiddleware = (options: CacheMiddlewareOptions = {}) => {
  const cacheService = CacheService.getInstance();
  const ttl = options.ttl || config.cache.defaultTtl;
  const keyPrefix = options.keyPrefix || 'api:';
  
  return async (req: Request, res: Response, next: NextFunction) => {
    // 跳过非GET请求
    if (req.method !== 'GET') {
      return next();
    }
    
    // 如果提供了条件函数，则根据条件决定是否使用缓存
    if (options.condition && !options.condition(req)) {
      return next();
    }
    
    // 生成缓存键
    const cacheKey = options.keyGenerator 
      ? options.keyGenerator(req) 
      : `${keyPrefix}${req.originalUrl || req.url}`;
    
    try {
      // 尝试从缓存获取数据
      const cachedData = await cacheService.get(cacheKey, options);
      
      if (cachedData) {
        logger.debug(`Cache hit: ${cacheKey}`);
        return res.json(cachedData);
      }
      
      // 缓存未命中，继续处理请求
      logger.debug(`Cache miss: ${cacheKey}`);
      
      // 保存原始的res.json方法
      const originalJson = res.json;
      
      // 重写res.json方法，以便在发送响应前缓存数据
      res.json = function(body: any): Response {
        // 恢复原始的res.json方法
        res.json = originalJson;
        
        // 验证响应是否应该被缓存
        const shouldCache = options.responseValidator 
          ? options.responseValidator(res.statusCode, body)
          : res.statusCode >= 200 && res.statusCode < 300;
        
        if (shouldCache) {
          // 异步缓存数据，不阻塞响应
          cacheService.set(cacheKey, body, options)
            .catch(error => {
              logger.error(`Error caching response: ${error.message}`);
            });
        }
        
        // 调用原始的res.json方法发送响应
        return originalJson.call(this, body);
      };
      
      next();
    } catch (error: any) {
      logger.error(`Cache middleware error: ${error.message}`);
      next();
    }
  };
};

/**
 * 清除缓存中间件
 * 用于清除特定前缀的缓存
 * @param keyPrefix 缓存键前缀
 * @param options 缓存选项
 * @returns 中间件函数
 */
export const clearCacheMiddleware = (keyPrefix: string, options: CacheOptions = {}) => {
  const cacheService = CacheService.getInstance();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 在请求处理完成后清除缓存
      res.on('finish', async () => {
        // 只有成功的请求才清除缓存
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // 清除特定前缀的缓存
            await cacheService.clearByPrefix(keyPrefix, options);
            logger.debug(`Cache cleared with prefix: ${keyPrefix}`);
          } catch (error: any) {
            logger.error(`Error clearing cache: ${error.message}`);
          }
        }
      });
      
      next();
    } catch (error: any) {
      logger.error(`Clear cache middleware error: ${error.message}`);
      next();
    }
  };
};

/**
 * 根据标签清除缓存中间件
 * @param tags 缓存标签数组
 * @param options 缓存选项
 * @returns 中间件函数
 */
export const clearCacheByTagsMiddleware = (tags: string[], options: CacheOptions = {}) => {
  const cacheService = CacheService.getInstance();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 在请求处理完成后清除缓存
      res.on('finish', async () => {
        // 只有成功的请求才清除缓存
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try {
            // 清除特定标签的缓存
            await cacheService.clearByTags(tags, options);
            logger.debug(`Cache cleared with tags: ${tags.join(', ')}`);
          } catch (error: any) {
            logger.error(`Error clearing cache by tags: ${error.message}`);
          }
        }
      });
      
      next();
    } catch (error: any) {
      logger.error(`Clear cache by tags middleware error: ${error.message}`);
      next();
    }
  };
};

/**
 * 缓存预热中间件
 * @param keyFetcher 键获取函数，返回键和获取数据的Promise
 * @param options 缓存选项
 * @returns 中间件函数
 */
export const prewarmCacheMiddleware = <T>(
  keyFetcher: () => Promise<Record<string, Promise<T>>>,
  options: CacheOptions = {}
) => {
  const cacheService = CacheService.getInstance();
  
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // 异步预热缓存，不阻塞请求
      cacheService.prewarmAsync(keyFetcher, options)
        .catch(error => {
          logger.error(`Error prewarming cache: ${error.message}`);
        });
      
      next();
    } catch (error: any) {
      logger.error(`Prewarm cache middleware error: ${error.message}`);
      next();
    }
  };
}; 