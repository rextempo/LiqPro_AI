import React, { ReactNode } from 'react';

export interface EmptyStateProps {
  /**
   * 标题文本
   */
  title: string;
  
  /**
   * 描述文本
   */
  description?: string;
  
  /**
   * 自定义图标
   */
  icon?: ReactNode;
  
  /**
   * 操作按钮
   */
  action?: ReactNode;
  
  /**
   * 是否居中显示
   */
  centered?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 图标大小
   */
  iconSize?: 'small' | 'medium' | 'large';
}

/**
 * 空状态组件
 * 用于在没有数据时显示友好的提示
 */
const EmptyState: React.FC<EmptyStateProps> = ({
  title,
  description,
  icon,
  action,
  centered = true,
  className = '',
  iconSize = 'medium',
}) => {
  // 根据大小设置图标尺寸
  const iconSizeMap = {
    small: 'h-8 w-8',
    medium: 'h-12 w-12',
    large: 'h-16 w-16',
  };
  
  // 默认图标
  const defaultIcon = (
    <svg 
      className={`${iconSizeMap[iconSize]} text-gray-400`} 
      fill="none" 
      stroke="currentColor" 
      viewBox="0 0 24 24" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        strokeLinecap="round" 
        strokeLinejoin="round" 
        strokeWidth="2" 
        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
      />
    </svg>
  );
  
  // 构建容器类名
  const containerClasses = [
    'bg-white rounded-lg p-6',
    centered ? 'text-center' : '',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClasses}>
      <div className={centered ? 'flex flex-col items-center' : ''}>
        <div className={centered ? 'mx-auto' : 'mb-4'}>
          {icon || defaultIcon}
        </div>
        <h3 className="mt-2 text-sm font-medium text-gray-900">{title}</h3>
        {description && (
          <p className="mt-1 text-sm text-gray-500">{description}</p>
        )}
        {action && (
          <div className="mt-6">
            {action}
          </div>
        )}
      </div>
    </div>
  );
};

export default EmptyState; 