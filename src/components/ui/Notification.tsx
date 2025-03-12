import React, { ReactNode, useEffect, useState } from 'react';
import ReactDOM from 'react-dom';

export type NotificationType = 'success' | 'info' | 'warning' | 'error';

export interface NotificationProps {
  /**
   * 通知类型
   */
  type?: NotificationType;
  
  /**
   * 通知标题
   */
  title: ReactNode;
  
  /**
   * 通知内容
   */
  message?: ReactNode;
  
  /**
   * 自动关闭时间（毫秒），设为0则不自动关闭
   */
  duration?: number;
  
  /**
   * 关闭回调
   */
  onClose?: () => void;
  
  /**
   * 点击回调
   */
  onClick?: () => void;
  
  /**
   * 自定义图标
   */
  icon?: ReactNode;
  
  /**
   * 是否显示关闭按钮
   */
  closable?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 位置
   */
  placement?: 'topRight' | 'topLeft' | 'bottomRight' | 'bottomLeft';
  
  /**
   * 唯一标识
   */
  key?: string;
}

// 通知容器ID
const NOTIFICATION_CONTAINER_ID = 'notification-container';

// 获取通知容器
const getNotificationContainer = (placement: string) => {
  const containerId = `${NOTIFICATION_CONTAINER_ID}-${placement}`;
  let container = document.getElementById(containerId);
  
  if (!container) {
    container = document.createElement('div');
    container.id = containerId;
    container.className = `fixed z-50 flex flex-col gap-2 p-4 ${getPlacementClasses(placement)}`;
    document.body.appendChild(container);
  }
  
  return container;
};

// 获取位置样式
const getPlacementClasses = (placement: string) => {
  switch (placement) {
    case 'topRight':
      return 'top-0 right-0';
    case 'topLeft':
      return 'top-0 left-0';
    case 'bottomRight':
      return 'bottom-0 right-0';
    case 'bottomLeft':
      return 'bottom-0 left-0';
    default:
      return 'top-0 right-0';
  }
};

// 获取类型图标
const getTypeIcon = (type?: NotificationType) => {
  switch (type) {
    case 'success':
      return (
        <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
      );
    case 'info':
      return (
        <svg className="w-6 h-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-6 h-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return null;
  }
};

// 通知组件
const NotificationComponent: React.FC<NotificationProps & { id: string }> = ({
  type = 'info',
  title,
  message,
  duration = 4500,
  onClose,
  onClick,
  icon,
  closable = true,
  className = '',
  id,
}) => {
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  
  // 处理关闭
  const handleClose = () => {
    setExiting(true);
    setTimeout(() => {
      setVisible(false);
      if (onClose) {
        onClose();
      }
    }, 300);
  };
  
  // 自动关闭
  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    if (duration > 0) {
      timer = setTimeout(() => {
        handleClose();
      }, duration);
    }
    
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [duration]);
  
  if (!visible) {
    return null;
  }
  
  // 构建通知类名
  const notificationClasses = [
    'bg-white rounded-lg shadow-lg p-4 max-w-sm w-full flex transition-all duration-300',
    exiting ? 'opacity-0 transform translate-x-4' : 'opacity-100',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      className={notificationClasses}
      onClick={onClick}
      role="alert"
    >
      <div className="flex-shrink-0 mr-3">
        {icon || getTypeIcon(type)}
      </div>
      
      <div className="flex-1">
        <div className="font-medium text-gray-900">{title}</div>
        {message && <div className="mt-1 text-sm text-gray-500">{message}</div>}
      </div>
      
      {closable && (
        <button 
          className="flex-shrink-0 ml-2 text-gray-400 hover:text-gray-500 focus:outline-none"
          onClick={(e) => {
            e.stopPropagation();
            handleClose();
          }}
          aria-label="关闭"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );
};

// 通知计数器
let notificationCount = 0;

// 通知API
const notification = {
  open: (config: NotificationProps) => {
    const id = `notification-${Date.now()}-${notificationCount++}`;
    const placement = config.placement || 'topRight';
    const container = getNotificationContainer(placement);
    
    const div = document.createElement('div');
    div.id = id;
    container.appendChild(div);
    
    const removeNotification = () => {
      const unmountResult = ReactDOM.unmountComponentAtNode(div);
      if (unmountResult && div.parentNode) {
        div.parentNode.removeChild(div);
      }
    };
    
    ReactDOM.render(
      <NotificationComponent
        {...config}
        id={id}
        onClose={() => {
          removeNotification();
          if (config.onClose) {
            config.onClose();
          }
        }}
      />,
      div
    );
    
    return {
      close: () => {
        ReactDOM.render(
          <NotificationComponent
            {...config}
            id={id}
            duration={0}
            onClose={() => {
              removeNotification();
              if (config.onClose) {
                config.onClose();
              }
            }}
          />,
          div
        );
      },
    };
  },
  
  success: (config: Omit<NotificationProps, 'type'> | string) => {
    if (typeof config === 'string') {
      return notification.open({ type: 'success', title: config });
    }
    return notification.open({ ...config, type: 'success' });
  },
  
  info: (config: Omit<NotificationProps, 'type'> | string) => {
    if (typeof config === 'string') {
      return notification.open({ type: 'info', title: config });
    }
    return notification.open({ ...config, type: 'info' });
  },
  
  warning: (config: Omit<NotificationProps, 'type'> | string) => {
    if (typeof config === 'string') {
      return notification.open({ type: 'warning', title: config });
    }
    return notification.open({ ...config, type: 'warning' });
  },
  
  error: (config: Omit<NotificationProps, 'type'> | string) => {
    if (typeof config === 'string') {
      return notification.open({ type: 'error', title: config });
    }
    return notification.open({ ...config, type: 'error' });
  },
};

export default notification; 