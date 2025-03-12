import { useState, useEffect, useCallback, useRef } from 'react';
import { EnhancedApiClient, ApiResponse } from '../api/clients/enhanced-api-client';
import { ServiceError } from '../../libs/common/src/utils/enhanced-error-handler';

// Create a singleton instance of the API client
const apiClient = new EnhancedApiClient();

/**
 * API hook options with improved typing
 */
export interface ApiHookOptions<T> {
  initialData?: T;
  onSuccess?: (data: T) => void;
  onError?: (error: ServiceError) => void;
  dependencies?: unknown[];
  skip?: boolean;
  ttl?: number;
}

/**
 * API hook state with improved typing
 */
export interface ApiHookState<T> {
  data: T | null;
  loading: boolean;
  error: ServiceError | null;
  refresh: () => Promise<void>;
}

/**
 * Cache entry with improved typing
 */
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// Global cache for API responses
const cache = new Map<string, CacheEntry<unknown>>();

/**
 * Enhanced API hook with improved TypeScript types and error handling
 * @param endpoint API endpoint
 * @param options Hook options
 * @returns API hook state
 */
export function useEnhancedApi<T>(
  endpoint: string,
  options: ApiHookOptions<T> = {}
): ApiHookState<T> {
  const {
    initialData = null,
    onSuccess,
    onError,
    dependencies = [],
    skip = false,
    ttl = 0
  } = options;

  const [data, setData] = useState<T | null>(initialData);
  const [loading, setLoading] = useState(!skip);
  const [error, setError] = useState<ServiceError | null>(null);
  
  // Use refs to avoid dependency issues with callbacks
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  // Fetch data function
  const fetchData = useCallback(async (): Promise<void> => {
    // Skip if requested
    if (skip) {
      setLoading(false);
      return;
    }
    
    // Check cache if TTL is set
    if (ttl > 0) {
      const cacheKey = endpoint;
      const cachedData = cache.get(cacheKey) as CacheEntry<T> | undefined;
      
      if (cachedData && Date.now() < cachedData.timestamp) {
        setData(cachedData.data);
        setLoading(false);
        setError(null);
        
        if (onSuccessRef.current) {
          onSuccessRef.current(cachedData.data);
        }
        
        return;
      }
    }
    
    // Start loading
    setLoading(true);
    setError(null);
    
    try {
      // Make API request
      const response = await apiClient.get<T>(endpoint);
      
      // Update cache if TTL is set
      if (ttl > 0) {
        const cacheKey = endpoint;
        cache.set(cacheKey, {
          data: response.data,
          timestamp: Date.now() + ttl
        });
      }
      
      // Update state
      setData(response.data);
      setLoading(false);
      
      // Call success callback
      if (onSuccessRef.current) {
        onSuccessRef.current(response.data);
      }
    } catch (error) {
      // Convert error to ServiceError if needed
      const serviceError = error instanceof ServiceError
        ? error
        : ServiceError.fromHttpError(error);
      
      // Update state
      setError(serviceError);
      setLoading(false);
      
      // Call error callback
      if (onErrorRef.current) {
        onErrorRef.current(serviceError);
      }
    }
  }, [endpoint, skip, ttl, ...dependencies]);

  // Fetch data on mount and when dependencies change
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refresh: fetchData
  };
}

/**
 * Mutation hook options with improved typing
 */
export interface MutationHookOptions<T, P> {
  onSuccess?: (data: T, params: P) => void;
  onError?: (error: ServiceError, params: P) => void;
}

/**
 * Mutation hook state with improved typing
 */
export interface MutationHookState<T, P> {
  mutate: (params: P) => Promise<T>;
  loading: boolean;
  error: ServiceError | null;
  reset: () => void;
}

/**
 * Enhanced mutation hook with improved TypeScript types and error handling
 * @param endpoint API endpoint
 * @param method HTTP method
 * @param options Hook options
 * @returns Mutation hook state
 */
export function useEnhancedMutation<T, P extends Record<string, unknown>>(
  endpoint: string,
  method: 'POST' | 'PUT' | 'DELETE' | 'PATCH',
  options: MutationHookOptions<T, P> = {}
): MutationHookState<T, P> {
  const { onSuccess, onError } = options;
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ServiceError | null>(null);
  
  // Use refs to avoid dependency issues with callbacks
  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  
  // Update refs when callbacks change
  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
  }, [onSuccess, onError]);

  // Reset state
  const reset = useCallback(() => {
    setError(null);
  }, []);

  // Mutation function
  const mutate = useCallback(async (params: P): Promise<T> => {
    setLoading(true);
    setError(null);
    
    try {
      let response: ApiResponse<T>;
      
      // Execute appropriate HTTP method
      switch (method) {
        case 'POST':
          response = await apiClient.post<T>(endpoint, params);
          break;
        case 'PUT':
          response = await apiClient.put<T>(endpoint, params);
          break;
        case 'DELETE':
          response = await apiClient.delete<T>(endpoint);
          break;
        case 'PATCH':
          response = await apiClient.patch<T>(endpoint, params);
          break;
      }
      
      // Clear cache entries related to this endpoint
      for (const key of cache.keys()) {
        if (key === endpoint || key.startsWith(`${endpoint}/`) || endpoint.startsWith(`${key}/`)) {
          cache.delete(key);
        }
      }
      
      // Update state
      setLoading(false);
      
      // Call success callback
      if (onSuccessRef.current) {
        onSuccessRef.current(response.data, params);
      }
      
      return response.data;
    } catch (error) {
      // Convert error to ServiceError if needed
      const serviceError = error instanceof ServiceError
        ? error
        : ServiceError.fromHttpError(error);
      
      // Update state
      setError(serviceError);
      setLoading(false);
      
      // Call error callback
      if (onErrorRef.current) {
        onErrorRef.current(serviceError, params);
      }
      
      throw serviceError;
    }
  }, [endpoint, method]);

  return {
    mutate,
    loading,
    error,
    reset
  };
} 