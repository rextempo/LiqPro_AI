// 导出API客户端
export { ApiClient } from './clients/api-client';
export { AgentClient, type Agent, type CreateAgentParams, type UpdateAgentParams } from './clients/agent-client';

// 导出API缓存
export { ApiCache } from './cache/api-cache';

// 导出API优化工具
export { RequestOptimizer } from './optimization/request-optimizer';
export { DataPreloader } from './optimization/data-preloader';

// 创建API客户端实例
import { AgentClient } from './clients/agent-client';

// 单例API客户端实例
export const agentApi = new AgentClient();

// 导出API钩子
export { useApi, useMutation } from '../hooks/useApi';
export { useOptimizedApi, useOptimizedMutation } from '../hooks/useOptimizedApi';

import { useState, useEffect, useCallback } from 'react';
import { userApi, roleApi, permissionApi, permissionCategoryApi } from './mockService';

// API缓存
const cache: Record<string, { data: any; timestamp: number }> = {};

/**
 * 通用API钩子
 * @param endpoint API端点
 * @param options 选项
 * @returns API响应数据和状态
 */
export function useApi<T>(endpoint: string, options?: { ttl?: number }) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  const ttl = options?.ttl || 0; // 缓存时间，默认不缓存
  
  // 刷新数据
  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      let result: T;
      
      // 根据端点调用不同的API
      switch (endpoint) {
        case 'users':
          result = await userApi.getUsers() as unknown as T;
          break;
        case 'roles':
          result = await roleApi.getRoles() as unknown as T;
          break;
        case 'permissions':
          result = await permissionApi.getPermissions() as unknown as T;
          break;
        case 'permission-categories':
          result = await permissionCategoryApi.getPermissionCategories() as unknown as T;
          break;
        default:
          if (endpoint.startsWith('users/')) {
            const userId = endpoint.split('/')[1];
            result = await userApi.getUser(userId) as unknown as T;
          } else if (endpoint.startsWith('roles/')) {
            const roleId = endpoint.split('/')[1];
            result = await roleApi.getRole(roleId) as unknown as T;
          } else if (endpoint.startsWith('permissions/')) {
            const permissionId = endpoint.split('/')[1];
            result = await permissionApi.getPermission(permissionId) as unknown as T;
          } else {
            throw new Error(`未知的API端点: ${endpoint}`);
          }
      }
      
      // 更新缓存
      if (ttl > 0) {
        cache[endpoint] = {
          data: result,
          timestamp: Date.now() + ttl,
        };
      }
      
      setData(result);
      setLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
      setLoading(false);
    }
  }, [endpoint, ttl]);
  
  useEffect(() => {
    // 检查缓存
    if (ttl > 0 && cache[endpoint] && cache[endpoint].timestamp > Date.now()) {
      setData(cache[endpoint].data);
      setLoading(false);
      return;
    }
    
    refresh();
  }, [endpoint, refresh, ttl]);
  
  return { data, loading, error, refresh };
}

/**
 * 通用变更钩子
 * @param endpoint API端点
 * @param method HTTP方法
 * @returns 变更函数和状态
 */
export function useMutation<T, P = any>(endpoint: string, method: 'POST' | 'PUT' | 'DELETE') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const mutate = useCallback(async (params?: P): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      let result: T;
      
      // 根据端点和方法调用不同的API
      if (method === 'POST') {
        if (endpoint === 'users') {
          result = await userApi.createUser(params as any) as unknown as T;
        } else if (endpoint === 'roles') {
          result = await roleApi.createRole(params as any) as unknown as T;
        } else if (endpoint === 'permissions') {
          result = await permissionApi.createPermission(params as any) as unknown as T;
        } else if (endpoint === 'permission-categories') {
          result = await permissionCategoryApi.createPermissionCategory(params as any) as unknown as T;
        } else if (endpoint.includes('/reset-password')) {
          const userId = endpoint.split('/')[1];
          await userApi.resetPassword(userId, (params as any).password);
          result = {} as T;
        } else {
          throw new Error(`未知的API端点: ${endpoint}`);
        }
      } else if (method === 'PUT') {
        if (endpoint.startsWith('users/')) {
          const userId = endpoint.split('/')[1];
          result = await userApi.updateUser(userId, params as any) as unknown as T;
        } else if (endpoint.startsWith('roles/')) {
          const roleId = endpoint.split('/')[1];
          result = await roleApi.updateRole(roleId, params as any) as unknown as T;
        } else if (endpoint.startsWith('permissions/')) {
          const permissionId = endpoint.split('/')[1];
          result = await permissionApi.updatePermission(permissionId, params as any) as unknown as T;
        } else {
          throw new Error(`未知的API端点: ${endpoint}`);
        }
      } else if (method === 'DELETE') {
        if (endpoint.startsWith('users/')) {
          const userId = endpoint.split('/')[1];
          await userApi.deleteUser(userId);
          result = {} as T;
        } else if (endpoint.startsWith('roles/')) {
          const roleId = endpoint.split('/')[1];
          await roleApi.deleteRole(roleId);
          result = {} as T;
        } else if (endpoint.startsWith('permissions/')) {
          const permissionId = endpoint.split('/')[1];
          await permissionApi.deletePermission(permissionId);
          result = {} as T;
        } else {
          throw new Error(`未知的API端点: ${endpoint}`);
        }
      } else {
        throw new Error(`不支持的HTTP方法: ${method}`);
      }
      
      // 清除相关缓存
      Object.keys(cache).forEach(key => {
        if (key === endpoint || 
            (endpoint.includes('/') && key === endpoint.split('/')[0]) ||
            (key.includes('/') && key.split('/')[0] === endpoint)) {
          delete cache[key];
        }
      });
      
      setLoading(false);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      setError(error);
      setLoading(false);
      throw error;
    }
  }, [endpoint, method]);
  
  return { mutate, loading, error };
}

// 导出API服务
export { userApi, roleApi, permissionApi, permissionCategoryApi }; 