import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  /**
   * 按钮类型
   */
  type?: 'button' | 'submit' | 'reset';
  
  /**
   * 按钮变体
   */
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning' | 'info' | 'light' | 'dark' | 'link';
  
  /**
   * 按钮大小
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * 是否为块级按钮
   */
  block?: boolean;
  
  /**
   * 是否为轮廓按钮
   */
  outline?: boolean;
  
  /**
   * 是否为圆形按钮
   */
  rounded?: boolean;
  
  /**
   * 是否为加载状态
   */
  loading?: boolean;
  
  /**
   * 加载文本
   */
  loadingText?: string;
  
  /**
   * 图标
   */
  icon?: React.ReactNode;
  
  /**
   * 图标位置
   */
  iconPosition?: 'left' | 'right';
  
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 按钮组件
 * 用于创建各种类型的按钮
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(({
  children,
  type = 'button',
  variant = 'primary',
  size = 'medium',
  block = false,
  outline = false,
  rounded = false,
  loading = false,
  loadingText,
  icon,
  iconPosition = 'left',
  className = '',
  disabled = false,
  ...rest
}, ref) => {
  // 根据变体设置样式
  const variantClasses = {
    primary: outline 
      ? 'border-blue-500 text-blue-500 hover:bg-blue-50 focus:ring-blue-500' 
      : 'bg-blue-500 text-white hover:bg-blue-600 focus:ring-blue-500',
    secondary: outline 
      ? 'border-gray-500 text-gray-500 hover:bg-gray-50 focus:ring-gray-500' 
      : 'bg-gray-500 text-white hover:bg-gray-600 focus:ring-gray-500',
    success: outline 
      ? 'border-green-500 text-green-500 hover:bg-green-50 focus:ring-green-500' 
      : 'bg-green-500 text-white hover:bg-green-600 focus:ring-green-500',
    danger: outline 
      ? 'border-red-500 text-red-500 hover:bg-red-50 focus:ring-red-500' 
      : 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    warning: outline 
      ? 'border-yellow-500 text-yellow-500 hover:bg-yellow-50 focus:ring-yellow-500' 
      : 'bg-yellow-500 text-white hover:bg-yellow-600 focus:ring-yellow-500',
    info: outline 
      ? 'border-blue-400 text-blue-400 hover:bg-blue-50 focus:ring-blue-400' 
      : 'bg-blue-400 text-white hover:bg-blue-500 focus:ring-blue-400',
    light: outline 
      ? 'border-gray-200 text-gray-500 hover:bg-gray-50 focus:ring-gray-200' 
      : 'bg-gray-200 text-gray-700 hover:bg-gray-300 focus:ring-gray-200',
    dark: outline 
      ? 'border-gray-800 text-gray-800 hover:bg-gray-50 focus:ring-gray-800' 
      : 'bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-800',
    link: 'text-blue-500 hover:text-blue-600 hover:underline focus:ring-blue-500 border-transparent bg-transparent',
  };
  
  // 根据大小设置样式
  const sizeClasses = {
    small: 'py-1 px-3 text-xs',
    medium: 'py-2 px-4 text-sm',
    large: 'py-3 px-5 text-base',
  };
  
  // 构建按钮类名
  const buttonClasses = [
    'font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 inline-flex items-center justify-center transition-colors duration-200',
    variant !== 'link' ? 'border' : '',
    rounded ? 'rounded-full' : 'rounded-md',
    sizeClasses[size],
    variantClasses[variant],
    block ? 'w-full' : '',
    disabled || loading ? 'opacity-60 cursor-not-allowed' : '',
    className,
  ].filter(Boolean).join(' ');
  
  // 加载图标
  const loadingIcon = (
    <svg className={`animate-spin -ml-1 mr-2 h-4 w-4 ${outline ? `text-${variant}-500` : 'text-white'}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );
  
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && loadingIcon}
      {!loading && icon && iconPosition === 'left' && <span className="mr-2">{icon}</span>}
      {loading && loadingText ? loadingText : children}
      {!loading && icon && iconPosition === 'right' && <span className="ml-2">{icon}</span>}
    </button>
  );
});

Button.displayName = 'Button';

export default Button; 