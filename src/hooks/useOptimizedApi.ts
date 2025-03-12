import { useState, useEffect, useCallback, useRef } from 'react';
import { ApiCache } from '../api/cache/api-cache';
import { RequestOptimizer } from '../api/optimization/request-optimizer';
import { DataPreloader } from '../api/optimization/data-preloader';

interface UseOptimizedApiOptions {
  cacheKey?: string;
  cacheTTL?: number;
  initialData?: any;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  dependencies?: any[];
  deduplicateKey?: string | ((params?: any) => string);
  batchKey?: string;
  batchId?: string;
  batchFn?: (ids: string[]) => Promise<Record<string, any>>;
  preloadKeys?: string[];
  preloadFns?: (() => Promise<any>)[];
  preloadTTLs?: number[];
  preloadPriorities?: ('high' | 'medium' | 'low')[];
  skipCache?: boolean;
}

/**
 * 优化的API钩子
 * 使用请求优化器和数据预加载器来提高性能
 * @param apiCall API调用函数
 * @param options 选项
 * @returns 加载状态、数据、错误和刷新函数
 */
export function useOptimizedApi<T>(
  apiCall: () => Promise<T>,
  options: UseOptimizedApiOptions = {}
): {
  loading: boolean;
  data: T | null;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const {
    cacheKey,
    cacheTTL,
    initialData = null,
    onSuccess,
    onError,
    dependencies = [],
    deduplicateKey,
    batchKey,
    batchId,
    batchFn,
    preloadKeys = [],
    preloadFns = [],
    preloadTTLs = [],
    preloadPriorities = [],
    skipCache = false,
  } = options;

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);

  const cache = ApiCache.getInstance();
  const optimizer = RequestOptimizer.getInstance();
  const preloader = DataPreloader.getInstance();
  
  // 使用ref来存储最新的回调函数，避免依赖项变化导致的无限循环
  const callbacksRef = useRef({ onSuccess, onError });
  
  // 更新回调函数引用
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  // 预加载相关数据
  useEffect(() => {
    if (preloadKeys.length > 0 && preloadFns.length > 0) {
      preloadKeys.forEach((key, index) => {
        if (index < preloadFns.length) {
          const priority = preloadPriorities[index] || 'low';
          const ttl = preloadTTLs[index];
          
          switch (priority) {
            case 'high':
              preloader.preloadHighPriority(key, preloadFns[index], ttl);
              break;
            case 'medium':
              preloader.preloadMediumPriority(key, preloadFns[index], ttl);
              break;
            case 'low':
            default:
              preloader.preloadLowPriority(key, preloadFns[index], ttl);
              break;
          }
        }
      });
    }
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      let result: T;

      // 如果有缓存键且不跳过缓存，尝试从缓存中获取数据
      if (cacheKey && !skipCache) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          if (callbacksRef.current.onSuccess) callbacksRef.current.onSuccess(cachedData);
          return;
        }
      }

      // 根据提供的选项选择不同的请求策略
      if (batchKey && batchId && batchFn) {
        // 批处理请求
        result = await optimizer.batchRequest(batchKey, batchId, batchFn);
      } else if (deduplicateKey) {
        // 去重请求
        const dedupKey = typeof deduplicateKey === 'function' 
          ? deduplicateKey() 
          : deduplicateKey;
        result = await optimizer.deduplicateRequest(dedupKey, apiCall);
      } else {
        // 普通请求
        result = await apiCall();
      }
      
      // 设置数据
      setData(result);
      
      // 如果有缓存键，将数据存入缓存
      if (cacheKey) {
        cache.set(cacheKey, result, cacheTTL);
      }
      
      // 调用成功回调
      if (callbacksRef.current.onSuccess) callbacksRef.current.onSuccess(result);
    } catch (err) {
      // 设置错误
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      // 调用错误回调
      if (callbacksRef.current.onError) callbacksRef.current.onError(error);
    } finally {
      setLoading(false);
    }
  }, [apiCall, cacheKey, cacheTTL, skipCache, deduplicateKey, batchKey, batchId, batchFn, ...dependencies]);

  // 刷新数据
  const refresh = useCallback(async () => {
    // 如果有缓存键，删除缓存
    if (cacheKey) {
      cache.delete(cacheKey);
    }
    
    // 重新获取数据
    await fetchData();
  }, [fetchData, cacheKey]);

  // 初始加载数据
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { loading, data, error, refresh };
}

/**
 * 优化的变异API钩子
 * 用于执行修改操作，如创建、更新、删除等
 * @param apiCall API调用函数
 * @param options 选项
 * @returns 加载状态、数据、错误和执行函数
 */
export function useOptimizedMutation<T, P = any>(
  apiCall: (params: P) => Promise<T>,
  options: Omit<UseOptimizedApiOptions, 'cacheKey' | 'cacheTTL' | 'dependencies' | 'batchKey' | 'batchId' | 'batchFn' | 'preloadKeys' | 'preloadFns' | 'preloadTTLs' | 'preloadPriorities'> = {}
): {
  loading: boolean;
  data: T | null;
  error: Error | null;
  mutate: (params: P) => Promise<T>;
} {
  const { initialData = null, onSuccess, onError, deduplicateKey } = options;

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);

  const optimizer = RequestOptimizer.getInstance();
  
  // 使用ref来存储最新的回调函数
  const callbacksRef = useRef({ onSuccess, onError });
  
  // 更新回调函数引用
  useEffect(() => {
    callbacksRef.current = { onSuccess, onError };
  }, [onSuccess, onError]);

  const mutate = useCallback(
    async (params: P): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        let result: T;
        
        // 如果提供了去重键，使用去重请求
        if (deduplicateKey) {
          const dedupKey = typeof deduplicateKey === 'function' 
            ? deduplicateKey(params) 
            : `${deduplicateKey}-${JSON.stringify(params)}`;
            
          result = await optimizer.deduplicateRequest(dedupKey, () => apiCall(params));
        } else {
          // 普通请求
          result = await apiCall(params);
        }
        
        // 设置数据
        setData(result);
        
        // 调用成功回调
        if (callbacksRef.current.onSuccess) callbacksRef.current.onSuccess(result);
        
        return result;
      } catch (err) {
        // 设置错误
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        // 调用错误回调
        if (callbacksRef.current.onError) callbacksRef.current.onError(error);
        
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [apiCall, deduplicateKey]
  );

  return { loading, data, error, mutate };
} 