import { EventEmitter } from 'events';
/**
 * 缓存选项接口
 */
export interface CacheOptions {
    ttl?: number;
    useRedis?: boolean;
    tags?: string[];
}
/**
 * 缓存统计信息接口
 */
export interface CacheStats {
    hits: number;
    misses: number;
    keys: number;
    hitRate: number;
    memoryUsage: number;
    redisConnected: boolean;
}
/**
 * 缓存服务类
 */
export declare class CacheService extends EventEmitter {
    private static instance;
    private memoryCache;
    private redisClient;
    private redisEnabled;
    private logger;
    private keyTagsMap;
    private tagKeysMap;
    private stats;
    /**
     * 创建缓存服务实例
     * @param redisUrl Redis连接URL
     */
    private constructor();
    /**
     * 初始化Redis客户端
     * @param redisUrl Redis连接URL
     */
    private initRedisClient;
    /**
     * 将键与标签关联
     * @param key 缓存键
     * @param tags 标签数组
     */
    private associateKeyWithTags;
    /**
     * 从标签映射中移除键
     * @param key 缓存键
     */
    private removeKeyFromTags;
    /**
     * 获取缓存服务实例
     * @param redisUrl Redis连接URL
     * @returns 缓存服务实例
     */
    static getInstance(redisUrl?: string): CacheService;
    /**
     * 从缓存中获取数据
     * @param key 缓存键
     * @param options 缓存选项
     * @returns 缓存数据
     */
    get<T>(key: string, options?: CacheOptions): Promise<T | null>;
    /**
     * 将数据存入缓存
     * @param key 缓存键
     * @param value 缓存值
     * @param options 缓存选项
     */
    set<T>(key: string, value: T, options?: CacheOptions): Promise<void>;
    /**
     * 从缓存中删除数据
     * @param key 缓存键
     * @param options 缓存选项
     */
    delete(key: string, options?: CacheOptions): Promise<void>;
    /**
     * 清空缓存
     * @param options 缓存选项
     */
    clear(options?: CacheOptions): Promise<void>;
    /**
     * 根据标签清除缓存
     * @param tags 标签数组
     * @param options 缓存选项
     */
    clearByTags(tags: string[], options?: CacheOptions): Promise<void>;
    /**
     * 根据前缀清除缓存
     * @param prefix 键前缀
     * @param options 缓存选项
     */
    clearByPrefix(prefix: string, options?: CacheOptions): Promise<void>;
    /**
     * 缓存预热
     * @param keys 键值对象，键为缓存键，值为要缓存的数据
     * @param options 缓存选项
     */
    prewarm<T>(keys: Record<string, T>, options?: CacheOptions): Promise<void>;
    /**
     * 异步缓存预热
     * @param keyFetcher 键获取函数，返回键和获取数据的Promise
     * @param options 缓存选项
     */
    prewarmAsync<T>(keyFetcher: () => Promise<Record<string, Promise<T>>>, options?: CacheOptions): Promise<void>;
    /**
     * 获取缓存统计信息
     * @returns 缓存统计信息
     */
    getStats(): CacheStats;
    /**
     * 重置统计信息
     */
    resetStats(): void;
    /**
     * 关闭缓存服务
     */
    close(): Promise<void>;
}
