import { ApiCache } from '../cache/api-cache';

/**
 * 数据预加载服务
 * 用于预先加载可能需要的数据，减少用户等待时间
 */
export class DataPreloader {
  private static instance: DataPreloader;
  private cache: ApiCache;
  private preloadQueue: Array<() => Promise<void>> = [];
  private isProcessing: boolean = false;
  private concurrentLimit: number = 3; // 并发预加载限制
  private activePreloads: number = 0;
  private lowPriorityDelay: number = 1000; // 低优先级预加载延迟（毫秒）

  /**
   * 构造函数
   */
  private constructor() {
    this.cache = ApiCache.getInstance();
  }

  /**
   * 获取单例实例
   * @returns DataPreloader实例
   */
  public static getInstance(): DataPreloader {
    if (!DataPreloader.instance) {
      DataPreloader.instance = new DataPreloader();
    }
    return DataPreloader.instance;
  }

  /**
   * 添加高优先级预加载任务
   * 立即执行，不受并发限制
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @param ttl 缓存时间（毫秒）
   */
  public preloadHighPriority<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): void {
    // 检查缓存中是否已有数据
    if (this.cache.get(key) !== null) {
      return;
    }

    // 立即执行预加载
    fetchFn()
      .then((data) => {
        this.cache.set(key, data, ttl);
        console.log(`[DataPreloader] High priority preload completed: ${key}`);
      })
      .catch((error) => {
        console.error(`[DataPreloader] Failed to preload ${key}:`, error);
      });
  }

  /**
   * 添加中优先级预加载任务
   * 受并发限制，但立即加入队列
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @param ttl 缓存时间（毫秒）
   */
  public preloadMediumPriority<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): void {
    // 检查缓存中是否已有数据
    if (this.cache.get(key) !== null) {
      return;
    }

    // 添加到预加载队列
    this.preloadQueue.unshift(() => this.executePreload(key, fetchFn, ttl));
    this.processQueue();
  }

  /**
   * 添加低优先级预加载任务
   * 受并发限制，延迟加入队列
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @param ttl 缓存时间（毫秒）
   */
  public preloadLowPriority<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): void {
    // 检查缓存中是否已有数据
    if (this.cache.get(key) !== null) {
      return;
    }

    // 延迟添加到预加载队列
    setTimeout(() => {
      this.preloadQueue.push(() => this.executePreload(key, fetchFn, ttl));
      this.processQueue();
    }, this.lowPriorityDelay);
  }

  /**
   * 执行预加载任务
   * @param key 缓存键
   * @param fetchFn 获取数据的函数
   * @param ttl 缓存时间（毫秒）
   */
  private async executePreload<T>(
    key: string,
    fetchFn: () => Promise<T>,
    ttl?: number
  ): Promise<void> {
    // 再次检查缓存，避免重复加载
    if (this.cache.get(key) !== null) {
      return;
    }

    this.activePreloads++;

    try {
      const data = await fetchFn();
      this.cache.set(key, data, ttl);
      console.log(`[DataPreloader] Preload completed: ${key}`);
    } catch (error) {
      console.error(`[DataPreloader] Failed to preload ${key}:`, error);
    } finally {
      this.activePreloads--;
      this.processQueue();
    }
  }

  /**
   * 处理预加载队列
   */
  private processQueue(): void {
    if (this.isProcessing || this.preloadQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    // 处理队列中的任务，直到达到并发限制或队列为空
    while (this.preloadQueue.length > 0 && this.activePreloads < this.concurrentLimit) {
      const task = this.preloadQueue.shift();
      if (task) {
        task();
      }
    }

    this.isProcessing = false;
  }

  /**
   * 设置并发预加载限制
   * @param limit 并发限制
   */
  public setConcurrentLimit(limit: number): void {
    this.concurrentLimit = limit;
  }

  /**
   * 设置低优先级预加载延迟
   * @param delay 延迟时间（毫秒）
   */
  public setLowPriorityDelay(delay: number): void {
    this.lowPriorityDelay = delay;
  }

  /**
   * 清除所有预加载任务
   */
  public clearQueue(): void {
    this.preloadQueue = [];
  }

  /**
   * 获取当前预加载队列长度
   * @returns 队列长度
   */
  public getQueueLength(): number {
    return this.preloadQueue.length;
  }

  /**
   * 获取当前活跃预加载任务数
   * @returns 活跃任务数
   */
  public getActivePreloads(): number {
    return this.activePreloads;
  }
} 