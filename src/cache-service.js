"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CacheService = void 0;
/**
 * 缓存服务
 * 提供内存缓存和Redis缓存功能
 */
const redis_1 = require("redis");
const node_cache_1 = __importDefault(require("node-cache"));
const logger_1 = require("../utils/logger");
const events_1 = require("events");
/**
 * 缓存服务类
 */
class CacheService extends events_1.EventEmitter {
    /**
     * 创建缓存服务实例
     * @param redisUrl Redis连接URL
     */
    constructor(redisUrl) {
        super();
        this.redisClient = null;
        this.redisEnabled = false;
        this.keyTagsMap = new Map(); // 键到标签的映射
        this.tagKeysMap = new Map(); // 标签到键的映射
        this.stats = {
            hits: 0,
            misses: 0,
            operations: 0
        };
        this.logger = new logger_1.Logger('CacheService');
        // 初始化内存缓存
        this.memoryCache = new node_cache_1.default({
            stdTTL: 300, // 默认5分钟
            checkperiod: 60, // 每分钟检查过期
            useClones: false // 不克隆对象，提高性能
        });
        // 监听缓存过期事件
        this.memoryCache.on('expired', (key, value) => {
            this.emit('expired', key, value);
            this.removeKeyFromTags(key);
            this.logger.debug(`Cache key expired: ${key}`);
        });
        // 如果提供了Redis URL，则初始化Redis客户端
        if (redisUrl) {
            this.initRedisClient(redisUrl);
        }
        this.logger.info('CacheService initialized');
    }
    /**
     * 初始化Redis客户端
     * @param redisUrl Redis连接URL
     */
    async initRedisClient(redisUrl) {
        try {
            this.redisClient = (0, redis_1.createClient)({ url: redisUrl });
            this.redisClient.on('error', (err) => {
                this.logger.error(`Redis client error: ${err.message}`);
                this.redisEnabled = false;
                this.emit('redis:error', err);
            });
            this.redisClient.on('connect', () => {
                this.logger.info('Connected to Redis');
                this.redisEnabled = true;
                this.emit('redis:connect');
            });
            this.redisClient.on('reconnecting', () => {
                this.logger.info('Reconnecting to Redis');
                this.emit('redis:reconnecting');
            });
            await this.redisClient.connect();
        }
        catch (error) {
            this.logger.error(`Failed to initialize Redis client: ${error.message}`);
            this.redisEnabled = false;
            this.emit('redis:error', error);
        }
    }
    /**
     * 将键与标签关联
     * @param key 缓存键
     * @param tags 标签数组
     */
    associateKeyWithTags(key, tags) {
        if (!tags || tags.length === 0)
            return;
        // 存储键与标签的关系
        const keyTags = this.keyTagsMap.get(key) || new Set();
        tags.forEach(tag => keyTags.add(tag));
        this.keyTagsMap.set(key, keyTags);
        // 存储标签与键的关系
        tags.forEach(tag => {
            const tagKeys = this.tagKeysMap.get(tag) || new Set();
            tagKeys.add(key);
            this.tagKeysMap.set(tag, tagKeys);
        });
    }
    /**
     * 从标签映射中移除键
     * @param key 缓存键
     */
    removeKeyFromTags(key) {
        const tags = this.keyTagsMap.get(key);
        if (!tags)
            return;
        // 从每个标签的键集合中移除此键
        tags.forEach(tag => {
            const tagKeys = this.tagKeysMap.get(tag);
            if (tagKeys) {
                tagKeys.delete(key);
                if (tagKeys.size === 0) {
                    this.tagKeysMap.delete(tag);
                }
                else {
                    this.tagKeysMap.set(tag, tagKeys);
                }
            }
        });
        // 移除键的标签映射
        this.keyTagsMap.delete(key);
    }
    /**
     * 获取缓存服务实例
     * @param redisUrl Redis连接URL
     * @returns 缓存服务实例
     */
    static getInstance(redisUrl) {
        if (!CacheService.instance) {
            CacheService.instance = new CacheService(redisUrl);
        }
        return CacheService.instance;
    }
    /**
     * 从缓存中获取数据
     * @param key 缓存键
     * @param options 缓存选项
     * @returns 缓存数据
     */
    async get(key, options = {}) {
        this.stats.operations++;
        // 首先尝试从内存缓存获取
        const memoryValue = this.memoryCache.get(key);
        if (memoryValue !== undefined) {
            this.logger.debug(`Cache hit (memory): ${key}`);
            this.stats.hits++;
            this.emit('hit', key, 'memory');
            return memoryValue;
        }
        // 如果启用了Redis并且选项中指定了使用Redis，则尝试从Redis获取
        if (this.redisEnabled && this.redisClient && options.useRedis) {
            try {
                const redisValue = await this.redisClient.get(key);
                if (redisValue) {
                    this.logger.debug(`Cache hit (Redis): ${key}`);
                    this.stats.hits++;
                    this.emit('hit', key, 'redis');
                    const parsedValue = JSON.parse(redisValue);
                    // 将Redis中的值也存入内存缓存
                    this.memoryCache.set(key, parsedValue, options.ttl);
                    this.associateKeyWithTags(key, options.tags);
                    return parsedValue;
                }
            }
            catch (error) {
                this.logger.error(`Error getting from Redis: ${error.message}`);
                this.emit('error', error, 'redis', 'get');
            }
        }
        this.logger.debug(`Cache miss: ${key}`);
        this.stats.misses++;
        this.emit('miss', key);
        return null;
    }
    /**
     * 将数据存入缓存
     * @param key 缓存键
     * @param value 缓存值
     * @param options 缓存选项
     */
    async set(key, value, options = {}) {
        this.stats.operations++;
        // 存入内存缓存
        this.memoryCache.set(key, value, options.ttl);
        this.associateKeyWithTags(key, options.tags);
        // 如果启用了Redis并且选项中指定了使用Redis，则也存入Redis
        if (this.redisEnabled && this.redisClient && options.useRedis) {
            try {
                const stringValue = JSON.stringify(value);
                if (options.ttl) {
                    await this.redisClient.setEx(key, options.ttl, stringValue);
                }
                else {
                    await this.redisClient.set(key, stringValue);
                }
                // 如果有标签，在Redis中也存储标签信息
                if (options.tags && options.tags.length > 0) {
                    for (const tag of options.tags) {
                        await this.redisClient.sAdd(`tag:${tag}`, key);
                    }
                }
            }
            catch (error) {
                this.logger.error(`Error setting to Redis: ${error.message}`);
                this.emit('error', error, 'redis', 'set');
            }
        }
        this.logger.debug(`Cache set: ${key}`);
        this.emit('set', key);
    }
    /**
     * 从缓存中删除数据
     * @param key 缓存键
     * @param options 缓存选项
     */
    async delete(key, options = {}) {
        // 从内存缓存中删除
        this.memoryCache.del(key);
        this.removeKeyFromTags(key);
        // 如果启用了Redis并且选项中指定了使用Redis，则也从Redis中删除
        if (this.redisEnabled && this.redisClient && options.useRedis) {
            try {
                await this.redisClient.del(key);
                // 从Redis的标签集合中也删除此键
                const tags = await this.redisClient.keys(`tag:*`);
                for (const tagKey of tags) {
                    await this.redisClient.sRem(tagKey, key);
                }
            }
            catch (error) {
                this.logger.error(`Error deleting from Redis: ${error.message}`);
                this.emit('error', error, 'redis', 'delete');
            }
        }
        this.logger.debug(`Cache delete: ${key}`);
        this.emit('delete', key);
    }
    /**
     * 清空缓存
     * @param options 缓存选项
     */
    async clear(options = {}) {
        // 清空内存缓存
        this.memoryCache.flushAll();
        this.keyTagsMap.clear();
        this.tagKeysMap.clear();
        // 如果启用了Redis并且选项中指定了使用Redis，则也清空Redis
        if (this.redisEnabled && this.redisClient && options.useRedis) {
            try {
                await this.redisClient.flushAll();
            }
            catch (error) {
                this.logger.error(`Error clearing Redis: ${error.message}`);
                this.emit('error', error, 'redis', 'clear');
            }
        }
        this.logger.info('Cache cleared');
        this.emit('clear');
    }
    /**
     * 根据标签清除缓存
     * @param tags 标签数组
     * @param options 缓存选项
     */
    async clearByTags(tags, options = {}) {
        if (!tags || tags.length === 0)
            return;
        const keysToDelete = new Set();
        // 收集所有需要删除的键
        for (const tag of tags) {
            const tagKeys = this.tagKeysMap.get(tag);
            if (tagKeys) {
                tagKeys.forEach(key => keysToDelete.add(key));
            }
            // 如果启用了Redis，也从Redis中获取标签对应的键
            if (this.redisEnabled && this.redisClient && options.useRedis) {
                try {
                    const redisTagKeys = await this.redisClient.sMembers(`tag:${tag}`);
                    redisTagKeys.forEach(key => keysToDelete.add(key));
                }
                catch (error) {
                    this.logger.error(`Error getting tag keys from Redis: ${error.message}`);
                    this.emit('error', error, 'redis', 'clearByTags');
                }
            }
        }
        // 删除收集到的所有键
        for (const key of keysToDelete) {
            await this.delete(key, options);
        }
        // 如果启用了Redis，也删除标签集合
        if (this.redisEnabled && this.redisClient && options.useRedis) {
            try {
                for (const tag of tags) {
                    await this.redisClient.del(`tag:${tag}`);
                }
            }
            catch (error) {
                this.logger.error(`Error deleting tag sets from Redis: ${error.message}`);
                this.emit('error', error, 'redis', 'clearByTags');
            }
        }
        this.logger.info(`Cache cleared by tags: ${tags.join(', ')}`);
        this.emit('clearByTags', tags);
    }
    /**
     * 根据前缀清除缓存
     * @param prefix 键前缀
     * @param options 缓存选项
     */
    async clearByPrefix(prefix, options = {}) {
        if (!prefix)
            return;
        // 从内存缓存中删除匹配前缀的键
        const memoryKeys = this.memoryCache.keys();
        const keysToDelete = memoryKeys.filter(key => key.startsWith(prefix));
        for (const key of keysToDelete) {
            this.memoryCache.del(key);
            this.removeKeyFromTags(key);
        }
        // 如果启用了Redis，也从Redis中删除匹配前缀的键
        if (this.redisEnabled && this.redisClient && options.useRedis) {
            try {
                const redisKeys = await this.redisClient.keys(`${prefix}*`);
                if (redisKeys.length > 0) {
                    await this.redisClient.del(redisKeys);
                    // 从标签集合中也删除这些键
                    const tags = await this.redisClient.keys(`tag:*`);
                    for (const tagKey of tags) {
                        for (const key of redisKeys) {
                            await this.redisClient.sRem(tagKey, key);
                        }
                    }
                }
            }
            catch (error) {
                this.logger.error(`Error clearing Redis by prefix: ${error.message}`);
                this.emit('error', error, 'redis', 'clearByPrefix');
            }
        }
        this.logger.info(`Cache cleared by prefix: ${prefix}`);
        this.emit('clearByPrefix', prefix);
    }
    /**
     * 缓存预热
     * @param keys 键值对象，键为缓存键，值为要缓存的数据
     * @param options 缓存选项
     */
    async prewarm(keys, options = {}) {
        const entries = Object.entries(keys);
        if (entries.length === 0)
            return;
        this.logger.info(`Prewarming cache with ${entries.length} keys`);
        this.emit('prewarm:start', entries.length);
        for (const [key, value] of entries) {
            await this.set(key, value, options);
        }
        this.logger.info(`Cache prewarmed with ${entries.length} keys`);
        this.emit('prewarm:complete', entries.length);
    }
    /**
     * 异步缓存预热
     * @param keyFetcher 键获取函数，返回键和获取数据的Promise
     * @param options 缓存选项
     */
    async prewarmAsync(keyFetcher, options = {}) {
        try {
            const keyPromises = await keyFetcher();
            const entries = Object.entries(keyPromises);
            if (entries.length === 0)
                return;
            this.logger.info(`Async prewarming cache with ${entries.length} keys`);
            this.emit('prewarm:start', entries.length);
            const results = await Promise.allSettled(entries.map(async ([key, valuePromise]) => {
                try {
                    const value = await valuePromise;
                    await this.set(key, value, options);
                    return { key, success: true };
                }
                catch (error) {
                    this.logger.error(`Error prewarming key ${key}: ${error}`);
                    return { key, success: false, error };
                }
            }));
            const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
            const failed = results.length - succeeded;
            this.logger.info(`Async cache prewarm completed: ${succeeded} succeeded, ${failed} failed`);
            this.emit('prewarm:complete', { total: entries.length, succeeded, failed });
        }
        catch (error) {
            this.logger.error(`Error in async prewarm: ${error.message}`);
            this.emit('prewarm:error', error);
        }
    }
    /**
     * 获取缓存统计信息
     * @returns 缓存统计信息
     */
    getStats() {
        const memoryStats = this.memoryCache.getStats();
        const hitRate = this.stats.operations > 0
            ? (this.stats.hits / this.stats.operations) * 100
            : 0;
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            keys: memoryStats.keys,
            hitRate: parseFloat(hitRate.toFixed(2)),
            memoryUsage: memoryStats.vsize,
            redisConnected: this.redisEnabled
        };
    }
    /**
     * 重置统计信息
     */
    resetStats() {
        this.stats = {
            hits: 0,
            misses: 0,
            operations: 0
        };
        this.emit('stats:reset');
    }
    /**
     * 关闭缓存服务
     */
    async close() {
        if (this.redisClient) {
            await this.redisClient.quit();
        }
        this.logger.info('CacheService closed');
        this.emit('close');
    }
}
exports.CacheService = CacheService;
//# sourceMappingURL=cache-service.js.map