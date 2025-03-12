/**
 * API请求优化服务
 * 用于优化API请求性能，包括请求批处理、请求去重和请求队列
 */
export class RequestOptimizer {
  private static instance: RequestOptimizer;
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private batchRequests: Map<string, { 
    ids: Set<string>; 
    timer: NodeJS.Timeout | null;
    resolve: (value: any) => void;
    reject: (reason: any) => void;
  }> = new Map();
  private batchDelay: number = 50; // 批处理延迟时间（毫秒）
  private maxBatchSize: number = 50; // 最大批处理大小

  /**
   * 获取单例实例
   * @returns RequestOptimizer实例
   */
  public static getInstance(): RequestOptimizer {
    if (!RequestOptimizer.instance) {
      RequestOptimizer.instance = new RequestOptimizer();
    }
    return RequestOptimizer.instance;
  }

  /**
   * 去重请求
   * 如果相同的请求已经在进行中，则返回已有的Promise
   * @param key 请求唯一标识
   * @param requestFn 请求函数
   * @returns 请求结果
   */
  public deduplicateRequest<T>(key: string, requestFn: () => Promise<T>): Promise<T> {
    // 检查是否有相同的请求正在进行中
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      return pendingRequest as Promise<T>;
    }

    // 创建新的请求
    const request = requestFn().finally(() => {
      // 请求完成后，从pendingRequests中移除
      this.pendingRequests.delete(key);
    });

    // 将请求添加到pendingRequests中
    this.pendingRequests.set(key, request);

    return request;
  }

  /**
   * 批处理请求
   * 将多个请求合并为一个批处理请求
   * @param batchKey 批处理标识
   * @param id 请求ID
   * @param batchRequestFn 批处理请求函数
   * @returns 请求结果
   */
  public batchRequest<T>(
    batchKey: string, 
    id: string, 
    batchRequestFn: (ids: string[]) => Promise<Record<string, T>>
  ): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // 获取或创建批处理请求
      let batch = this.batchRequests.get(batchKey);
      
      if (!batch) {
        batch = {
          ids: new Set<string>(),
          timer: null,
          resolve: (value: any) => {},
          reject: (reason: any) => {}
        };
        this.batchRequests.set(batchKey, batch);
      }
      
      // 添加ID到批处理
      batch.ids.add(id);
      
      // 如果达到最大批处理大小，立即执行批处理
      if (batch.ids.size >= this.maxBatchSize) {
        this.executeBatch(batchKey, batchRequestFn);
      } else if (!batch.timer) {
        // 设置定时器，延迟执行批处理
        batch.timer = setTimeout(() => {
          this.executeBatch(batchKey, batchRequestFn);
        }, this.batchDelay);
      }
      
      // 保存resolve和reject函数
      const originalResolve = batch.resolve;
      const originalReject = batch.reject;
      
      batch.resolve = (results: Record<string, T>) => {
        originalResolve(results);
        resolve(results[id]);
      };
      
      batch.reject = (error: any) => {
        originalReject(error);
        reject(error);
      };
    });
  }

  /**
   * 执行批处理请求
   * @param batchKey 批处理标识
   * @param batchRequestFn 批处理请求函数
   */
  private executeBatch<T>(
    batchKey: string, 
    batchRequestFn: (ids: string[]) => Promise<Record<string, T>>
  ): void {
    const batch = this.batchRequests.get(batchKey);
    if (!batch) return;
    
    // 清除定时器
    if (batch.timer) {
      clearTimeout(batch.timer);
      batch.timer = null;
    }
    
    // 获取ID列表
    const ids = Array.from(batch.ids);
    
    // 从batchRequests中移除
    this.batchRequests.delete(batchKey);
    
    // 执行批处理请求
    batchRequestFn(ids)
      .then(batch.resolve)
      .catch(batch.reject);
  }

  /**
   * 设置批处理延迟时间
   * @param delay 延迟时间（毫秒）
   */
  public setBatchDelay(delay: number): void {
    this.batchDelay = delay;
  }

  /**
   * 设置最大批处理大小
   * @param size 最大批处理大小
   */
  public setMaxBatchSize(size: number): void {
    this.maxBatchSize = size;
  }

  /**
   * 获取当前正在进行的请求数量
   * @returns 请求数量
   */
  public getPendingRequestCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * 获取当前批处理请求数量
   * @returns 批处理请求数量
   */
  public getBatchRequestCount(): number {
    return this.batchRequests.size;
  }

  /**
   * 清除所有请求
   */
  public clearAll(): void {
    this.pendingRequests.clear();
    
    // 清除所有批处理定时器
    for (const batch of this.batchRequests.values()) {
      if (batch.timer) {
        clearTimeout(batch.timer);
      }
    }
    
    this.batchRequests.clear();
  }
} 