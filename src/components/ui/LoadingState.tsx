import React from 'react';

export interface LoadingStateProps {
  /**
   * 加载状态的大小
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * 加载状态的文本
   */
  text?: string;
  
  /**
   * 是否显示加载文本
   */
  showText?: boolean;
  
  /**
   * 加载状态的颜色
   */
  color?: 'primary' | 'secondary' | 'success' | 'error' | 'warning';
  
  /**
   * 是否居中显示
   */
  centered?: boolean;
  
  /**
   * 是否使用全屏覆盖
   */
  overlay?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 加载状态组件
 * 用于显示加载中的状态，支持不同大小和样式
 */
const LoadingState: React.FC<LoadingStateProps> = ({
  size = 'medium',
  text = '加载中...',
  showText = true,
  color = 'primary',
  centered = false,
  overlay = false,
  className = '',
}) => {
  // 根据大小设置尺寸
  const sizeMap = {
    small: 'h-4 w-4',
    medium: 'h-8 w-8',
    large: 'h-12 w-12',
  };
  
  // 根据颜色设置样式
  const colorMap = {
    primary: 'text-blue-500',
    secondary: 'text-gray-500',
    success: 'text-green-500',
    error: 'text-red-500',
    warning: 'text-yellow-500',
  };
  
  // 构建容器类名
  const containerClasses = [
    centered ? 'flex flex-col items-center justify-center' : 'flex flex-col items-start',
    overlay ? 'fixed inset-0 bg-white bg-opacity-75 z-50' : '',
    className,
  ].filter(Boolean).join(' ');
  
  // 构建加载图标类名
  const spinnerClasses = [
    'animate-spin',
    sizeMap[size],
    colorMap[color],
  ].join(' ');
  
  // 构建文本类名
  const textClasses = [
    'mt-2',
    size === 'small' ? 'text-xs' : size === 'medium' ? 'text-sm' : 'text-base',
    colorMap[color],
  ].join(' ');
  
  return (
    <div className={containerClasses} role="status" aria-live="polite">
      <svg className={spinnerClasses} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      {showText && <span className={textClasses}>{text}</span>}
    </div>
  );
};

export default LoadingState; 