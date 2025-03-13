import { useState, useEffect, useCallback } from 'react';
import config from '../config/env';

// API缓存
const cache: Record<string, { data: any; timestamp: number }> = {};

// API基础URL
const API_BASE_URL = config.api.baseUrl;

/**
 * 用户管理API钩子
 * @param endpoint API端点
 * @param options 选项
 * @returns API响应数据和状态
 */
export function useUserManagementApi<T>(endpoint: string, options?: { ttl?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const ttl = options?.ttl || 0; // 缓存时间，默认不缓存
  
  // 刷新数据
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // 检查缓存
      const now = Date.now();
      const cacheKey = endpoint;
      const cachedData = cache[cacheKey];
      
      if (cachedData && ttl > 0 && now - cachedData.timestamp < ttl) {
        setData(cachedData.data);
        setLoading(false);
        return;
      }
      
      // 构建API URL
      const apiUrl = `${API_BASE_URL}/user-management/${endpoint}`;
      
      // 发起API请求
      const response = await fetch(apiUrl, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      // 更新缓存
      if (ttl > 0) {
        cache[cacheKey] = { data: result, timestamp: now };
      }
      
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      console.error('API request error:', err);
    } finally {
      setLoading(false);
    }
  }, [endpoint, ttl]);
  
  // 初始加载
  useEffect(() => {
    refresh();
  }, [refresh]);
  
  return { data, loading, error, refresh };
}

/**
 * 用户管理变更钩子
 * @param endpoint API端点
 * @param method HTTP方法
 * @returns 变更函数和状态
 */
export function useUserManagementMutation<T, D = any>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' = 'POST'
) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [data, setData] = useState<T | null>(null);
  
  const mutate = useCallback(
    async (payload?: D): Promise<T> => {
      setLoading(true);
      setError(null);
      
      try {
        // 构建API URL
        const apiUrl = `${API_BASE_URL}/user-management/${endpoint}`;
        
        const response = await fetch(apiUrl, {
          method,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          },
          body: payload ? JSON.stringify(payload) : undefined
        });
        
        if (!response.ok) {
          throw new Error(`API request failed: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        // 清除相关缓存
        Object.keys(cache).forEach(key => {
          if (key === endpoint || 
              (endpoint.includes('/') && key === endpoint.split('/')[0]) ||
              (key.includes('/') && key.split('/')[0] === endpoint)) {
            delete cache[key];
          }
        });
        
        setData(result);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err));
        setError(error);
        console.error('API mutation error:', err);
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [endpoint, method]
  );
  
  return { mutate, loading, error, data };
} 