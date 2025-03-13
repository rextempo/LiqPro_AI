/**
 * 缓存中间件
 * 用于在API请求中使用缓存
 */
import { Request, Response, NextFunction } from 'express';
import { CacheOptions } from '../services/cache-service';
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
export declare const cacheMiddleware: (options?: CacheMiddlewareOptions) => (req: Request, res: Response, next: NextFunction) => Promise<any>;
/**
 * 清除缓存中间件
 * 用于清除特定前缀的缓存
 * @param keyPrefix 缓存键前缀
 * @param options 缓存选项
 * @returns 中间件函数
 */
export declare const clearCacheMiddleware: (keyPrefix: string, options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 根据标签清除缓存中间件
 * @param tags 缓存标签数组
 * @param options 缓存选项
 * @returns 中间件函数
 */
export declare const clearCacheByTagsMiddleware: (tags: string[], options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
/**
 * 缓存预热中间件
 * @param keyFetcher 键获取函数，返回键和获取数据的Promise
 * @param options 缓存选项
 * @returns 中间件函数
 */
export declare const prewarmCacheMiddleware: <T>(keyFetcher: () => Promise<Record<string, Promise<T>>>, options?: CacheOptions) => (req: Request, res: Response, next: NextFunction) => Promise<void>;
