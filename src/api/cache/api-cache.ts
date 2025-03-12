/**
 * API缓存服务
 * 用于缓存API响应数据，减少重复请求，提高性能
 */
export class ApiCache {
  private static instance: ApiCache;
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private defaultTTL: number = 5 * 60 * 1000; // 默认缓存5分钟

  /**
   * 获取单例实例
   * @returns ApiCache实例
   */
  public static getInstance(): ApiCache {
    if (!ApiCache.instance) {
      ApiCache.instance = new ApiCache();
    }
    return ApiCache.instance;
  }

  /**
   * 设置缓存
   * @param key 缓存键
   * @param data 缓存数据
   * @param ttl 缓存时间（毫秒）
   */
  public set(key: string, data: any, ttl: number = this.defaultTTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now() + ttl,
    });
  }

  /**
   * 获取缓存
   * @param key 缓存键
   * @returns 缓存数据，如果不存在或已过期则返回null
   */
  public get(key: string): any | null {
    const cached = this.cache.get(key);
    
    // 如果缓存不存在，返回null
    if (!cached) {
      return null;
    }
    
    // 如果缓存已过期，删除缓存并返回null
    if (cached.timestamp < Date.now()) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }

  /**
   * 删除缓存
   * @param key 缓存键
   */
  public delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * 清除所有缓存
   */
  public clear(): void {
    this.cache.clear();
  }

  /**
   * 清除过期缓存
   */
  public clearExpired(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (value.timestamp < now) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 设置默认缓存时间
   * @param ttl 缓存时间（毫秒）
   */
  public setDefaultTTL(ttl: number): void {
    this.defaultTTL = ttl;
  }

  /**
   * 获取缓存大小
   * @returns 缓存大小
   */
  public size(): number {
    return this.cache.size;
  }

  /**
   * 获取缓存键列表
   * @returns 缓存键列表
   */
  public keys(): string[] {
    return Array.from(this.cache.keys());
  }
} 