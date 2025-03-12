import { useState, useEffect, useCallback } from 'react';
import { ApiCache } from '../api/cache/api-cache';

interface UseApiOptions {
  cacheKey?: string;
  cacheTTL?: number;
  initialData?: any;
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  dependencies?: any[];
}

/**
 * API钩子
 * 用于在React组件中使用API客户端，包括加载状态、错误处理和数据缓存
 * @param apiCall API调用函数
 * @param options 选项
 * @returns 加载状态、数据、错误和刷新函数
 */
export function useApi<T>(
  apiCall: () => Promise<T>,
  options: UseApiOptions = {}
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
  } = options;

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);

  const cache = ApiCache.getInstance();

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // 如果有缓存键，尝试从缓存中获取数据
      if (cacheKey) {
        const cachedData = cache.get(cacheKey);
        if (cachedData) {
          setData(cachedData);
          setLoading(false);
          if (onSuccess) onSuccess(cachedData);
          return;
        }
      }

      // 调用API
      const result = await apiCall();
      
      // 设置数据
      setData(result);
      
      // 如果有缓存键，将数据存入缓存
      if (cacheKey) {
        cache.set(cacheKey, result, cacheTTL);
      }
      
      // 调用成功回调
      if (onSuccess) onSuccess(result);
    } catch (err) {
      // 设置错误
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      
      // 调用错误回调
      if (onError) onError(error);
    } finally {
      setLoading(false);
    }
  }, [apiCall, cacheKey, cacheTTL, onSuccess, onError, ...dependencies]);

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
 * 变异API钩子
 * 用于在React组件中执行修改操作，如创建、更新、删除等
 * @param apiCall API调用函数
 * @param options 选项
 * @returns 加载状态、数据、错误和执行函数
 */
export function useMutation<T, P = any>(
  apiCall: (params: P) => Promise<T>,
  options: Omit<UseApiOptions, 'cacheKey' | 'cacheTTL' | 'dependencies'> = {}
): {
  loading: boolean;
  data: T | null;
  error: Error | null;
  mutate: (params: P) => Promise<T>;
} {
  const { initialData = null, onSuccess, onError } = options;

  const [loading, setLoading] = useState<boolean>(false);
  const [data, setData] = useState<T | null>(initialData);
  const [error, setError] = useState<Error | null>(null);

  const mutate = useCallback(
    async (params: P): Promise<T> => {
      setLoading(true);
      setError(null);

      try {
        // 调用API
        const result = await apiCall(params);
        
        // 设置数据
        setData(result);
        
        // 调用成功回调
        if (onSuccess) onSuccess(result);
        
        return result;
      } catch (err) {
        // 设置错误
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        
        // 调用错误回调
        if (onError) onError(error);
        
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [apiCall, onSuccess, onError]
  );

  return { loading, data, error, mutate };
} 