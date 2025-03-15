interface CacheItem<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export class Cache {
  private static instance: Cache;
  private cache: Map<string, CacheItem<any>> = new Map();
  private cleanupInterval: NodeJS.Timeout;

  private constructor() {
    // 每5分钟清理一次过期缓存
    this.cleanupInterval = setInterval(() => this.cleanup(), 300000);
  }

  static getInstance(): Cache {
    if (!Cache.instance) {
      Cache.instance = new Cache();
    }
    return Cache.instance;
  }

  set<T>(key: string, value: T, ttl: number = 300000): void { // 默认5分钟
    this.cache.set(key, {
      value,
      timestamp: Date.now(),
      ttl
    });
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (this.isExpired(item)) {
      this.cache.delete(key);
      return null;
    }

    return item.value as T;
  }

  delete(key: string): void {
    this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private isExpired(item: CacheItem<any>): boolean {
    return Date.now() - item.timestamp > item.ttl;
  }

  private cleanup(): void {
    for (const [key, item] of this.cache.entries()) {
      if (this.isExpired(item)) {
        this.cache.delete(key);
      }
    }
  }

  // 获取缓存统计信息
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  // 检查键是否存在且未过期
  has(key: string): boolean {
    const item = this.cache.get(key);
    return item ? !this.isExpired(item) : false;
  }

  // 获取剩余过期时间（毫秒）
  getTTL(key: string): number {
    const item = this.cache.get(key);
    if (!item) return 0;
    if (this.isExpired(item)) return 0;
    return item.ttl - (Date.now() - item.timestamp);
  }
} 