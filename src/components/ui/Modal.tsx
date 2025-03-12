import React, { ReactNode, useEffect, useRef } from 'react';
import Button from './Button';

export interface ModalProps {
  /**
   * 是否可见
   */
  visible: boolean;
  
  /**
   * 标题
   */
  title?: ReactNode;
  
  /**
   * 内容
   */
  children: ReactNode;
  
  /**
   * 底部内容
   */
  footer?: ReactNode;
  
  /**
   * 关闭回调
   */
  onClose: () => void;
  
  /**
   * 确认按钮文本
   */
  okText?: string;
  
  /**
   * 取消按钮文本
   */
  cancelText?: string;
  
  /**
   * 确认回调
   */
  onOk?: () => void;
  
  /**
   * 取消回调
   */
  onCancel?: () => void;
  
  /**
   * 是否显示关闭按钮
   */
  closable?: boolean;
  
  /**
   * 宽度
   */
  width?: number | string;
  
  /**
   * 是否居中
   */
  centered?: boolean;
  
  /**
   * 是否显示遮罩
   */
  mask?: boolean;
  
  /**
   * 点击遮罩是否关闭
   */
  maskClosable?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 确认按钮加载状态
   */
  confirmLoading?: boolean;
  
  /**
   * 是否全屏
   */
  fullscreen?: boolean;
}

/**
 * 模态对话框组件
 * 用于重要信息展示、用户反馈或操作
 */
const Modal: React.FC<ModalProps> = ({
  visible,
  title,
  children,
  footer,
  onClose,
  okText = '确定',
  cancelText = '取消',
  onOk,
  onCancel,
  closable = true,
  width = 520,
  centered = false,
  mask = true,
  maskClosable = true,
  className = '',
  confirmLoading = false,
  fullscreen = false,
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  
  // 处理ESC键关闭
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && visible) {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [visible, onClose]);
  
  // 处理点击外部关闭
  const handleMaskClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (maskClosable && e.target === e.currentTarget) {
      onClose();
    }
  };
  
  // 处理确认
  const handleOk = () => {
    if (onOk) {
      onOk();
    }
  };
  
  // 处理取消
  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else {
      onClose();
    }
  };
  
  // 默认底部
  const defaultFooter = (
    <div className="flex justify-end space-x-2">
      <Button variant="light" onClick={handleCancel}>
        {cancelText}
      </Button>
      <Button variant="primary" onClick={handleOk} loading={confirmLoading}>
        {okText}
      </Button>
    </div>
  );
  
  if (!visible) {
    return null;
  }
  
  // 构建模态框类名
  const modalClasses = [
    'bg-white rounded-lg shadow-xl overflow-hidden',
    fullscreen ? 'w-full h-full max-w-none' : '',
    className,
  ].filter(Boolean).join(' ');
  
  // 构建模态框容器类名
  const containerClasses = [
    'fixed inset-0 z-50 overflow-y-auto',
    centered ? 'flex items-center justify-center' : 'pt-16',
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClasses}>
      {/* 遮罩层 */}
      {mask && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={handleMaskClick}
        ></div>
      )}
      
      {/* 模态框 */}
      <div 
        className="relative mx-auto z-10"
        style={{ width: fullscreen ? '100%' : width }}
        ref={modalRef}
      >
        <div className={modalClasses}>
          {/* 标题栏 */}
          {(title || closable) && (
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              {title && <div className="text-lg font-medium text-gray-900">{title}</div>}
              {closable && (
                <button 
                  className="text-gray-400 hover:text-gray-500 focus:outline-none"
                  onClick={onClose}
                  aria-label="关闭"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          )}
          
          {/* 内容区 */}
          <div className="px-6 py-4">
            {children}
          </div>
          
          {/* 底部区 */}
          {(footer !== null) && (
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
              {footer === undefined ? defaultFooter : footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal; 