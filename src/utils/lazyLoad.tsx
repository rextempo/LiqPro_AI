import React, { lazy, Suspense, ComponentType } from 'react';
import { LoadingState } from '../components/ui';

/**
 * 组件懒加载配置选项
 */
interface LazyLoadOptions {
  /**
   * 加载中显示的组件
   */
  fallback?: React.ReactNode;
  
  /**
   * 预加载组件
   */
  preload?: boolean;
  
  /**
   * 错误边界
   */
  errorBoundary?: boolean;
}

/**
 * 组件懒加载工具函数
 * 用于优化应用初始加载时间，只在需要时加载组件
 * @param factory 组件导入函数
 * @param options 配置选项
 * @returns 懒加载的组件
 */
export function lazyLoad<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>,
  options: LazyLoadOptions = {}
): React.ComponentType<React.ComponentProps<T>> {
  const {
    fallback = <LoadingState />,
    preload = false,
    errorBoundary = false,
  } = options;
  
  // 创建懒加载组件
  const LazyComponent = lazy(factory);
  
  // 如果需要预加载，立即触发加载
  if (preload) {
    factory();
  }
  
  // 创建包装组件
  const LazyLoadComponent: React.FC<React.ComponentProps<T>> = (props) => (
    <Suspense fallback={fallback}>
      <LazyComponent {...props} />
    </Suspense>
  );
  
  // 设置显示名称
  LazyLoadComponent.displayName = 'LazyLoadComponent';
  
  return LazyLoadComponent;
}

/**
 * 预加载组件
 * 用于提前加载组件，但不立即渲染
 * @param factory 组件导入函数
 */
export function preloadComponent<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): void {
  factory();
}

/**
 * 创建预加载触发器
 * 用于在特定事件（如鼠标悬停）时预加载组件
 * @param factory 组件导入函数
 * @returns 预加载处理函数
 */
export function createPreloadTrigger<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
): () => void {
  let loaded = false;
  
  return () => {
    if (!loaded) {
      loaded = true;
      factory();
    }
  };
}

/**
 * 批量懒加载组件
 * 用于一次性定义多个懒加载组件
 * @param componentMap 组件映射对象
 * @param options 配置选项
 * @returns 懒加载组件映射对象
 */
export function lazyLoadComponents<T extends Record<string, () => Promise<{ default: ComponentType<any> }>>>(
  componentMap: T,
  options: LazyLoadOptions = {}
): { [K in keyof T]: React.ComponentType<any> } {
  const result: Record<string, React.ComponentType<any>> = {};
  
  for (const key in componentMap) {
    result[key] = lazyLoad(componentMap[key], options);
  }
  
  return result as { [K in keyof T]: React.ComponentType<any> };
} 