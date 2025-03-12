import React from 'react';

export interface ErrorStateProps {
  /**
   * 错误信息
   */
  message: string;
  
  /**
   * 错误类型
   */
  type?: 'error' | 'warning' | 'info';
  
  /**
   * 重试回调函数
   */
  onRetry?: () => void;
  
  /**
   * 是否显示重试按钮
   */
  showRetry?: boolean;
  
  /**
   * 重试按钮文本
   */
  retryText?: string;
  
  /**
   * 是否显示图标
   */
  showIcon?: boolean;
  
  /**
   * 是否居中显示
   */
  centered?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 错误详情（可折叠显示）
   */
  details?: string;
  
  /**
   * 是否显示错误详情
   */
  showDetails?: boolean;
}

/**
 * 错误状态组件
 * 用于显示错误信息，支持不同类型的错误展示和重试功能
 */
const ErrorState: React.FC<ErrorStateProps> = ({
  message,
  type = 'error',
  onRetry,
  showRetry = true,
  retryText = '重试',
  showIcon = true,
  centered = false,
  className = '',
  details,
  showDetails = false,
}) => {
  const [isDetailsOpen, setIsDetailsOpen] = React.useState(false);
  
  // 根据类型设置样式
  const typeMap = {
    error: {
      containerClass: 'bg-red-50 border-red-500',
      textClass: 'text-red-700',
      iconClass: 'text-red-400',
      buttonClass: 'bg-red-500 hover:bg-red-600 focus:ring-red-500',
    },
    warning: {
      containerClass: 'bg-yellow-50 border-yellow-500',
      textClass: 'text-yellow-700',
      iconClass: 'text-yellow-400',
      buttonClass: 'bg-yellow-500 hover:bg-yellow-600 focus:ring-yellow-500',
    },
    info: {
      containerClass: 'bg-blue-50 border-blue-500',
      textClass: 'text-blue-700',
      iconClass: 'text-blue-400',
      buttonClass: 'bg-blue-500 hover:bg-blue-600 focus:ring-blue-500',
    },
  };
  
  // 构建容器类名
  const containerClasses = [
    'border-l-4 p-4 rounded-md',
    typeMap[type].containerClass,
    centered ? 'mx-auto text-center' : '',
    className,
  ].filter(Boolean).join(' ');
  
  // 构建文本类名
  const textClasses = [
    'text-sm',
    typeMap[type].textClass,
  ].join(' ');
  
  // 构建按钮类名
  const buttonClasses = [
    'mt-3 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2',
    typeMap[type].buttonClass,
  ].join(' ');
  
  // 构建详情类名
  const detailsClasses = [
    'mt-2 p-2 text-xs font-mono whitespace-pre-wrap rounded bg-gray-100 border border-gray-200 overflow-auto max-h-32',
    typeMap[type].textClass,
  ].join(' ');
  
  // 根据类型选择图标
  const renderIcon = () => {
    if (!showIcon) return null;
    
    switch (type) {
      case 'error':
        return (
          <svg className={`h-5 w-5 ${typeMap[type].iconClass}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className={`h-5 w-5 ${typeMap[type].iconClass}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className={`h-5 w-5 ${typeMap[type].iconClass}`} viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };
  
  return (
    <div className={containerClasses} role="alert">
      <div className="flex">
        {showIcon && (
          <div className="flex-shrink-0 mr-3">
            {renderIcon()}
          </div>
        )}
        <div className={centered ? 'mx-auto' : ''}>
          <p className={textClasses}>{message}</p>
          
          {details && showDetails && (
            <div className="mt-2">
              <button
                type="button"
                className={`text-sm ${typeMap[type].textClass} underline focus:outline-none`}
                onClick={() => setIsDetailsOpen(!isDetailsOpen)}
              >
                {isDetailsOpen ? '隐藏详情' : '显示详情'}
              </button>
              {isDetailsOpen && (
                <pre className={detailsClasses}>
                  {details}
                </pre>
              )}
            </div>
          )}
          
          {showRetry && onRetry && (
            <div className={centered ? 'flex justify-center' : ''}>
              <button
                type="button"
                className={buttonClasses}
                onClick={onRetry}
              >
                {retryText}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorState; 