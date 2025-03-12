import React, { ReactNode, useState, useRef, useEffect } from 'react';

export interface DropdownItemProps {
  /**
   * 选项键
   */
  key: string;
  
  /**
   * 选项标签
   */
  label: ReactNode;
  
  /**
   * 选项图标
   */
  icon?: ReactNode;
  
  /**
   * 是否禁用
   */
  disabled?: boolean;
  
  /**
   * 是否为危险操作
   */
  danger?: boolean;
  
  /**
   * 点击回调
   */
  onClick?: () => void;
  
  /**
   * 分割线
   */
  divider?: boolean;
}

export interface DropdownProps {
  /**
   * 触发元素
   */
  trigger: ReactNode;
  
  /**
   * 下拉菜单项
   */
  items: DropdownItemProps[];
  
  /**
   * 触发方式
   */
  trigger_type?: 'hover' | 'click';
  
  /**
   * 下拉位置
   */
  placement?: 'bottomLeft' | 'bottomCenter' | 'bottomRight' | 'topLeft' | 'topCenter' | 'topRight';
  
  /**
   * 是否禁用
   */
  disabled?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 菜单自定义类名
   */
  menuClassName?: string;
  
  /**
   * 是否显示箭头
   */
  arrow?: boolean;
  
  /**
   * 菜单宽度
   */
  width?: number;
  
  /**
   * 点击菜单项后是否自动关闭
   */
  closeOnClick?: boolean;
}

/**
 * 下拉菜单组件
 * 用于选项展示和选择
 */
const Dropdown: React.FC<DropdownProps> = ({
  trigger,
  items,
  trigger_type = 'click',
  placement = 'bottomLeft',
  disabled = false,
  className = '',
  menuClassName = '',
  arrow = false,
  width,
  closeOnClick = true,
}) => {
  const [visible, setVisible] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 处理点击外部关闭
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setVisible(false);
      }
    };
    
    if (visible) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [visible]);
  
  // 处理触发器点击
  const handleTriggerClick = () => {
    if (disabled) return;
    if (trigger_type === 'click') {
      setVisible(!visible);
    }
  };
  
  // 处理触发器鼠标进入
  const handleTriggerMouseEnter = () => {
    if (disabled) return;
    if (trigger_type === 'hover') {
      setVisible(true);
    }
  };
  
  // 处理触发器鼠标离开
  const handleTriggerMouseLeave = () => {
    if (disabled) return;
    if (trigger_type === 'hover') {
      setTimeout(() => {
        setVisible(false);
      }, 200);
    }
  };
  
  // 处理菜单项点击
  const handleItemClick = (item: DropdownItemProps) => {
    if (item.disabled) return;
    
    if (item.onClick) {
      item.onClick();
    }
    
    if (closeOnClick) {
      setVisible(false);
    }
  };
  
  // 获取菜单位置样式
  const getMenuPositionStyles = () => {
    switch (placement) {
      case 'bottomLeft':
        return 'left-0 top-full mt-1';
      case 'bottomCenter':
        return 'left-1/2 transform -translate-x-1/2 top-full mt-1';
      case 'bottomRight':
        return 'right-0 top-full mt-1';
      case 'topLeft':
        return 'left-0 bottom-full mb-1';
      case 'topCenter':
        return 'left-1/2 transform -translate-x-1/2 bottom-full mb-1';
      case 'topRight':
        return 'right-0 bottom-full mb-1';
      default:
        return 'left-0 top-full mt-1';
    }
  };
  
  // 获取箭头位置样式
  const getArrowPositionStyles = () => {
    if (!arrow) return '';
    
    switch (placement) {
      case 'bottomLeft':
        return 'before:left-4 before:top-0 before:-translate-y-full before:border-b-white before:border-r-transparent before:border-l-transparent before:border-t-transparent';
      case 'bottomCenter':
        return 'before:left-1/2 before:top-0 before:-translate-x-1/2 before:-translate-y-full before:border-b-white before:border-r-transparent before:border-l-transparent before:border-t-transparent';
      case 'bottomRight':
        return 'before:right-4 before:top-0 before:-translate-y-full before:border-b-white before:border-r-transparent before:border-l-transparent before:border-t-transparent';
      case 'topLeft':
        return 'after:left-4 after:bottom-0 after:translate-y-full after:border-t-white after:border-r-transparent after:border-l-transparent after:border-b-transparent';
      case 'topCenter':
        return 'after:left-1/2 after:bottom-0 after:-translate-x-1/2 after:translate-y-full after:border-t-white after:border-r-transparent after:border-l-transparent after:border-b-transparent';
      case 'topRight':
        return 'after:right-4 after:bottom-0 after:translate-y-full after:border-t-white after:border-r-transparent after:border-l-transparent after:border-b-transparent';
      default:
        return '';
    }
  };
  
  // 构建菜单类名
  const menuClasses = [
    'absolute z-50 bg-white rounded-md shadow-lg py-1 min-w-[10rem] max-h-60 overflow-auto',
    'before:absolute before:w-0 before:h-0 before:border-8',
    'after:absolute after:w-0 after:h-0 after:border-8',
    getMenuPositionStyles(),
    getArrowPositionStyles(),
    menuClassName,
  ].filter(Boolean).join(' ');
  
  // 构建触发器类名
  const triggerClasses = [
    'inline-flex cursor-pointer',
    disabled ? 'opacity-50 cursor-not-allowed' : '',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div 
      className="relative inline-block"
      ref={dropdownRef}
      onMouseEnter={handleTriggerMouseEnter}
      onMouseLeave={handleTriggerMouseLeave}
    >
      {/* 触发器 */}
      <div 
        className={triggerClasses}
        onClick={handleTriggerClick}
      >
        {trigger}
      </div>
      
      {/* 下拉菜单 */}
      {visible && (
        <div 
          className={menuClasses}
          style={{ width: width ? `${width}px` : 'auto' }}
        >
          {items.map((item, index) => (
            <React.Fragment key={item.key || index}>
              {item.divider ? (
                <div className="border-t border-gray-200 my-1"></div>
              ) : (
                <div
                  className={`
                    px-4 py-2 text-sm flex items-center
                    ${item.disabled ? 'text-gray-400 cursor-not-allowed' : 'cursor-pointer'}
                    ${item.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-100'}
                  `}
                  onClick={() => handleItemClick(item)}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      )}
    </div>
  );
};

export default Dropdown; 