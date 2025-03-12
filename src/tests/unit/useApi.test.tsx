import { renderHook, act } from '@testing-library/react-hooks';
import { useApi, useMutation } from '../../hooks/useApi';
import { ApiCache } from '../../api/cache/api-cache';

// Mock the ApiCache
jest.mock('../../api/cache/api-cache', () => {
  const mockCache = {
    get: jest.fn(),
    set: jest.fn(),
    clear: jest.fn(),
  };
  
  return {
    ApiCache: {
      getInstance: jest.fn(() => mockCache),
    },
  };
});

describe('useApi Hook', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('should return loading state and fetch data', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockApiCall = jest.fn().mockResolvedValue(mockData);
    
    const { result, waitForNextUpdate } = renderHook(() => useApi(mockApiCall));
    
    // Initial state
    expect(result.current.loading).toBe(true);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    
    await waitForNextUpdate();
    
    // After data is loaded
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
    expect(mockApiCall).toHaveBeenCalledTimes(1);
  });

  test('should handle API errors', async () => {
    const mockError = new Error('API Error');
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    
    const { result, waitForNextUpdate } = renderHook(() => useApi(mockApiCall));
    
    await waitForNextUpdate();
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(mockError);
  });

  test('should use initialData when provided', () => {
    const initialData = { id: 1, name: 'Initial' };
    const mockApiCall = jest.fn().mockResolvedValue({ id: 2, name: 'Updated' });
    
    const { result } = renderHook(() => 
      useApi(mockApiCall, { initialData })
    );
    
    // Should use initialData before API call completes
    expect(result.current.data).toEqual(initialData);
  });

  test('should call onSuccess callback when API call succeeds', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockApiCall = jest.fn().mockResolvedValue(mockData);
    const onSuccess = jest.fn();
    
    const { waitForNextUpdate } = renderHook(() => 
      useApi(mockApiCall, { onSuccess })
    );
    
    await waitForNextUpdate();
    
    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  test('should call onError callback when API call fails', async () => {
    const mockError = new Error('API Error');
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    const onError = jest.fn();
    
    const { waitForNextUpdate } = renderHook(() => 
      useApi(mockApiCall, { onError })
    );
    
    await waitForNextUpdate();
    
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  test('should refresh data when refresh function is called', async () => {
    const mockData1 = { id: 1, name: 'Test 1' };
    const mockData2 = { id: 1, name: 'Test 2' };
    const mockApiCall = jest.fn()
      .mockResolvedValueOnce(mockData1)
      .mockResolvedValueOnce(mockData2);
    
    const { result, waitForNextUpdate } = renderHook(() => useApi(mockApiCall));
    
    await waitForNextUpdate();
    expect(result.current.data).toEqual(mockData1);
    
    // Call refresh
    act(() => {
      result.current.refresh();
    });
    
    expect(result.current.loading).toBe(true);
    
    await waitForNextUpdate();
    expect(result.current.data).toEqual(mockData2);
    expect(mockApiCall).toHaveBeenCalledTimes(2);
  });

  test('should use cached data when available', async () => {
    const cacheKey = 'test-cache-key';
    const cachedData = { id: 1, name: 'Cached' };
    const mockApiCall = jest.fn().mockResolvedValue({ id: 2, name: 'Fresh' });
    
    // Mock cache hit
    ApiCache.getInstance().get.mockReturnValueOnce(cachedData);
    
    const { result, waitForNextUpdate } = renderHook(() => 
      useApi(mockApiCall, { cacheKey, cacheTTL: 60 })
    );
    
    await waitForNextUpdate();
    
    expect(result.current.data).toEqual(cachedData);
    expect(mockApiCall).not.toHaveBeenCalled();
    expect(ApiCache.getInstance().get).toHaveBeenCalledWith(cacheKey);
  });

  test('should cache API response when cacheKey is provided', async () => {
    const cacheKey = 'test-cache-key';
    const cacheTTL = 60;
    const mockData = { id: 1, name: 'Test' };
    const mockApiCall = jest.fn().mockResolvedValue(mockData);
    
    // Mock cache miss
    ApiCache.getInstance().get.mockReturnValueOnce(null);
    
    const { waitForNextUpdate } = renderHook(() => 
      useApi(mockApiCall, { cacheKey, cacheTTL })
    );
    
    await waitForNextUpdate();
    
    expect(ApiCache.getInstance().set).toHaveBeenCalledWith(
      cacheKey,
      mockData,
      cacheTTL
    );
  });
});

describe('useMutation Hook', () => {
  test('should return loading state and mutate function', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockApiCall = jest.fn().mockResolvedValue(mockData);
    
    const { result } = renderHook(() => useMutation(mockApiCall));
    
    // Initial state
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toBe(null);
    
    // Call mutate
    let mutationResult;
    await act(async () => {
      mutationResult = await result.current.mutate({ name: 'Test' });
    });
    
    // After mutation
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBe(null);
    expect(mutationResult).toEqual(mockData);
    expect(mockApiCall).toHaveBeenCalledWith({ name: 'Test' });
  });

  test('should handle mutation errors', async () => {
    const mockError = new Error('API Error');
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    
    const { result } = renderHook(() => useMutation(mockApiCall));
    
    await act(async () => {
      try {
        await result.current.mutate({ name: 'Test' });
      } catch (error) {
        // Expected error
      }
    });
    
    expect(result.current.loading).toBe(false);
    expect(result.current.data).toBe(null);
    expect(result.current.error).toEqual(mockError);
  });

  test('should call onSuccess callback when mutation succeeds', async () => {
    const mockData = { id: 1, name: 'Test' };
    const mockApiCall = jest.fn().mockResolvedValue(mockData);
    const onSuccess = jest.fn();
    
    const { result } = renderHook(() => 
      useMutation(mockApiCall, { onSuccess })
    );
    
    await act(async () => {
      await result.current.mutate({ name: 'Test' });
    });
    
    expect(onSuccess).toHaveBeenCalledWith(mockData);
  });

  test('should call onError callback when mutation fails', async () => {
    const mockError = new Error('API Error');
    const mockApiCall = jest.fn().mockRejectedValue(mockError);
    const onError = jest.fn();
    
    const { result } = renderHook(() => 
      useMutation(mockApiCall, { onError })
    );
    
    await act(async () => {
      try {
        await result.current.mutate({ name: 'Test' });
      } catch (error) {
        // Expected error
      }
    });
    
    expect(onError).toHaveBeenCalledWith(mockError);
  });
}); 