import React, { InputHTMLAttributes, forwardRef } from 'react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /**
   * 输入框大小
   */
  size?: 'small' | 'medium' | 'large';
  
  /**
   * 输入框状态
   */
  status?: 'default' | 'error' | 'success' | 'warning';
  
  /**
   * 前缀图标
   */
  prefix?: React.ReactNode;
  
  /**
   * 后缀图标
   */
  suffix?: React.ReactNode;
  
  /**
   * 是否显示清除按钮
   */
  allowClear?: boolean;
  
  /**
   * 清除按钮点击回调
   */
  onClear?: () => void;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 是否显示边框
   */
  bordered?: boolean;
  
  /**
   * 是否为块级元素
   */
  block?: boolean;
}

/**
 * 输入框组件
 * 用于创建各种类型的输入框
 */
const Input = forwardRef<HTMLInputElement, InputProps>(({
  size = 'medium',
  status = 'default',
  prefix,
  suffix,
  allowClear = false,
  onClear,
  className = '',
  bordered = true,
  block = false,
  disabled = false,
  value,
  onChange,
  ...rest
}, ref) => {
  // 根据大小设置样式
  const sizeClasses = {
    small: 'py-1 px-2 text-xs',
    medium: 'py-2 px-3 text-sm',
    large: 'py-3 px-4 text-base',
  };
  
  // 根据状态设置样式
  const statusClasses = {
    default: 'border-gray-300 focus:border-blue-500 focus:ring-blue-500',
    error: 'border-red-500 focus:border-red-500 focus:ring-red-500',
    success: 'border-green-500 focus:border-green-500 focus:ring-green-500',
    warning: 'border-yellow-500 focus:border-yellow-500 focus:ring-yellow-500',
  };
  
  // 构建输入框类名
  const inputClasses = [
    'bg-white rounded-md shadow-sm focus:outline-none focus:ring-1',
    bordered ? 'border' : 'border-0',
    sizeClasses[size],
    statusClasses[status],
    disabled ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : '',
    block ? 'w-full' : '',
    (prefix || suffix) ? (size === 'small' ? 'pl-7 pr-7' : size === 'medium' ? 'pl-9 pr-9' : 'pl-11 pr-11') : '',
    className,
  ].filter(Boolean).join(' ');
  
  // 处理清除按钮点击
  const handleClear = () => {
    if (onClear) {
      onClear();
    }
    
    if (onChange) {
      const event = {
        target: { value: '' },
      } as React.ChangeEvent<HTMLInputElement>;
      onChange(event);
    }
  };
  
  return (
    <div className="relative">
      {/* 前缀图标 */}
      {prefix && (
        <div className={`absolute inset-y-0 left-0 flex items-center ${size === 'small' ? 'pl-2' : size === 'medium' ? 'pl-3' : 'pl-4'}`}>
          <span className="text-gray-500">{prefix}</span>
        </div>
      )}
      
      {/* 输入框 */}
      <input
        ref={ref}
        className={inputClasses}
        disabled={disabled}
        value={value}
        onChange={onChange}
        {...rest}
      />
      
      {/* 后缀图标或清除按钮 */}
      {(suffix || (allowClear && value)) && (
        <div className={`absolute inset-y-0 right-0 flex items-center ${size === 'small' ? 'pr-2' : size === 'medium' ? 'pr-3' : 'pr-4'}`}>
          {allowClear && value && (
            <button
              type="button"
              className="text-gray-400 hover:text-gray-500 focus:outline-none"
              onClick={handleClear}
              tabIndex={-1}
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </button>
          )}
          {suffix && <span className="text-gray-500 ml-1">{suffix}</span>}
        </div>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input; 