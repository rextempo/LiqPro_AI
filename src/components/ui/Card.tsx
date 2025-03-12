import React, { ReactNode } from 'react';

export interface CardProps {
  /**
   * 卡片标题
   */
  title?: ReactNode;
  
  /**
   * 卡片副标题
   */
  subtitle?: ReactNode;
  
  /**
   * 卡片内容
   */
  children: ReactNode;
  
  /**
   * 卡片操作区
   */
  actions?: ReactNode;
  
  /**
   * 卡片头部额外内容
   */
  extra?: ReactNode;
  
  /**
   * 卡片封面
   */
  cover?: ReactNode;
  
  /**
   * 是否有边框
   */
  bordered?: boolean;
  
  /**
   * 卡片阴影
   */
  shadow?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
  
  /**
   * 是否加载中
   */
  loading?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 点击事件
   */
  onClick?: () => void;
  
  /**
   * 是否可悬停
   */
  hoverable?: boolean;
}

/**
 * 卡片组件
 * 用于内容分组和展示
 */
const Card: React.FC<CardProps> = ({
  title,
  subtitle,
  children,
  actions,
  extra,
  cover,
  bordered = true,
  shadow = 'sm',
  loading = false,
  className = '',
  onClick,
  hoverable = false,
}) => {
  // 阴影样式
  const shadowClasses = {
    none: '',
    sm: 'shadow-sm',
    md: 'shadow',
    lg: 'shadow-md',
    xl: 'shadow-lg',
  };
  
  // 构建卡片类名
  const cardClasses = [
    'bg-white rounded-lg overflow-hidden',
    bordered ? 'border border-gray-200' : '',
    shadowClasses[shadow],
    hoverable ? 'transition-shadow duration-300 hover:shadow-md' : '',
    onClick ? 'cursor-pointer' : '',
    className,
  ].filter(Boolean).join(' ');
  
  // 加载骨架屏
  const renderSkeleton = () => (
    <div className="animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
      <div className="h-20 bg-gray-200 rounded mb-4"></div>
      <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
      <div className="h-4 bg-gray-200 rounded w-5/6"></div>
    </div>
  );
  
  return (
    <div 
      className={cardClasses}
      onClick={onClick}
    >
      {cover && <div className="card-cover">{cover}</div>}
      
      {(title || extra) && (
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <div>
            {title && <div className="text-lg font-medium text-gray-900">{title}</div>}
            {subtitle && <div className="text-sm text-gray-500 mt-1">{subtitle}</div>}
          </div>
          {extra && <div className="card-extra">{extra}</div>}
        </div>
      )}
      
      <div className="p-4">
        {loading ? renderSkeleton() : children}
      </div>
      
      {actions && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
          {actions}
        </div>
      )}
    </div>
  );
};

export default Card; 