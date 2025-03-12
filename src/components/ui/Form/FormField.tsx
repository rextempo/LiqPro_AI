import React, { ReactNode } from 'react';
import Transition from '../Transition';

export interface FormFieldProps {
  /**
   * 字段标签
   */
  label?: string;
  
  /**
   * 是否必填
   */
  required?: boolean;
  
  /**
   * 错误信息
   */
  error?: string;
  
  /**
   * 帮助文本
   */
  helpText?: string;
  
  /**
   * 字段ID
   */
  id?: string;
  
  /**
   * 子元素
   */
  children: ReactNode;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 标签位置
   */
  labelPosition?: 'top' | 'left' | 'right';
  
  /**
   * 是否禁用
   */
  disabled?: boolean;
}

/**
 * 表单字段组件
 * 用于创建带标签、验证和错误提示的表单字段
 */
const FormField: React.FC<FormFieldProps> = ({
  label,
  required = false,
  error,
  helpText,
  id,
  children,
  className = '',
  labelPosition = 'top',
  disabled = false,
}) => {
  // 生成唯一ID
  const fieldId = id || `field-${Math.random().toString(36).substr(2, 9)}`;
  
  // 根据标签位置设置布局
  const layoutClasses = {
    top: 'flex flex-col',
    left: 'sm:flex sm:items-center',
    right: 'sm:flex sm:items-center sm:flex-row-reverse',
  };
  
  // 根据标签位置设置标签样式
  const labelClasses = {
    top: 'block text-sm font-medium text-gray-700 mb-1',
    left: 'block text-sm font-medium text-gray-700 sm:mr-4 sm:w-1/3',
    right: 'block text-sm font-medium text-gray-700 sm:ml-4 sm:w-1/3',
  };
  
  // 根据标签位置设置输入框容器样式
  const inputContainerClasses = {
    top: 'w-full',
    left: 'w-full sm:w-2/3',
    right: 'w-full sm:w-2/3',
  };
  
  return (
    <div className={`mb-4 ${layoutClasses[labelPosition]} ${className}`}>
      {label && (
        <label 
          htmlFor={fieldId} 
          className={`${labelClasses[labelPosition]} ${disabled ? 'text-gray-400' : ''}`}
        >
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={inputContainerClasses[labelPosition]}>
        {React.isValidElement(children)
          ? React.cloneElement(children as React.ReactElement, {
              id: fieldId,
              'aria-invalid': !!error,
              'aria-describedby': error ? `${fieldId}-error` : helpText ? `${fieldId}-help` : undefined,
              ...((children as React.ReactElement).props || {}),
            })
          : children}
        
        {helpText && !error && (
          <p id={`${fieldId}-help`} className="mt-1 text-xs text-gray-500">
            {helpText}
          </p>
        )}
        
        <Transition in={!!error} type="fade" unmountOnExit>
          <p id={`${fieldId}-error`} className="mt-1 text-xs text-red-500" role="alert">
            {error}
          </p>
        </Transition>
      </div>
    </div>
  );
};

export default FormField; 