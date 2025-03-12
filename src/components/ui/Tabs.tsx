import React, { ReactNode, useState, useEffect } from 'react';

export interface TabItemProps {
  /**
   * 标签键
   */
  key: string;
  
  /**
   * 标签标题
   */
  label: ReactNode;
  
  /**
   * 标签内容
   */
  children: ReactNode;
  
  /**
   * 是否禁用
   */
  disabled?: boolean;
  
  /**
   * 图标
   */
  icon?: ReactNode;
}

export interface TabsProps {
  /**
   * 当前激活的标签键
   */
  activeKey?: string;
  
  /**
   * 默认激活的标签键
   */
  defaultActiveKey?: string;
  
  /**
   * 标签项
   */
  items: TabItemProps[];
  
  /**
   * 标签切换回调
   */
  onChange?: (activeKey: string) => void;
  
  /**
   * 标签位置
   */
  tabPosition?: 'top' | 'bottom' | 'left' | 'right';
  
  /**
   * 标签类型
   */
  type?: 'line' | 'card' | 'editable-card';
  
  /**
   * 是否居中
   */
  centered?: boolean;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 额外内容
   */
  extra?: ReactNode;
  
  /**
   * 是否可滚动
   */
  scrollable?: boolean;
}

/**
 * 标签页组件
 * 用于内容分类展示
 */
const Tabs: React.FC<TabsProps> = ({
  activeKey,
  defaultActiveKey,
  items,
  onChange,
  tabPosition = 'top',
  type = 'line',
  centered = false,
  className = '',
  extra,
  scrollable = false,
}) => {
  // 当前激活的标签
  const [currentActiveKey, setCurrentActiveKey] = useState<string>(
    activeKey || defaultActiveKey || (items.length > 0 ? items[0].key : '')
  );
  
  // 监听activeKey变化
  useEffect(() => {
    if (activeKey !== undefined) {
      setCurrentActiveKey(activeKey);
    }
  }, [activeKey]);
  
  // 处理标签切换
  const handleTabClick = (key: string, disabled?: boolean) => {
    if (disabled) {
      return;
    }
    
    if (activeKey === undefined) {
      setCurrentActiveKey(key);
    }
    
    if (onChange) {
      onChange(key);
    }
  };
  
  // 获取当前激活的内容
  const getActiveContent = () => {
    const activeItem = items.find(item => item.key === currentActiveKey);
    return activeItem ? activeItem.children : null;
  };
  
  // 构建标签类名
  const getTabClasses = (key: string, disabled?: boolean) => {
    const isActive = key === currentActiveKey;
    
    const baseClasses = [
      'py-2 px-4 font-medium cursor-pointer transition-colors duration-200 flex items-center',
      disabled ? 'text-gray-400 cursor-not-allowed' : 'hover:text-blue-600',
    ];
    
    if (type === 'line') {
      baseClasses.push(
        isActive 
          ? 'text-blue-600 border-b-2 border-blue-600' 
          : 'text-gray-600 border-b-2 border-transparent'
      );
    } else if (type === 'card' || type === 'editable-card') {
      baseClasses.push(
        isActive 
          ? 'bg-white text-blue-600 border border-gray-200 border-b-0 rounded-t-md' 
          : 'bg-gray-50 text-gray-600 border border-transparent'
      );
    }
    
    return baseClasses.filter(Boolean).join(' ');
  };
  
  // 构建标签栏类名
  const getTabBarClasses = () => {
    const baseClasses = ['flex'];
    
    if (tabPosition === 'top' || tabPosition === 'bottom') {
      baseClasses.push(
        'border-b border-gray-200',
        scrollable ? 'overflow-x-auto' : '',
        centered ? 'justify-center' : ''
      );
    } else {
      baseClasses.push(
        'flex-col',
        tabPosition === 'left' ? 'border-r border-gray-200' : 'border-l border-gray-200',
        scrollable ? 'overflow-y-auto' : ''
      );
    }
    
    return baseClasses.filter(Boolean).join(' ');
  };
  
  // 构建内容区类名
  const getContentClasses = () => {
    return [
      'py-4',
      tabPosition === 'left' ? 'pl-4' : '',
      tabPosition === 'right' ? 'pr-4' : '',
    ].filter(Boolean).join(' ');
  };
  
  // 构建容器类名
  const containerClasses = [
    'tabs',
    tabPosition === 'left' || tabPosition === 'right' ? 'flex' : '',
    className,
  ].filter(Boolean).join(' ');
  
  return (
    <div className={containerClasses}>
      {/* 标签栏 */}
      <div className={getTabBarClasses()}>
        {items.map(item => (
          <div
            key={item.key}
            className={getTabClasses(item.key, item.disabled)}
            onClick={() => handleTabClick(item.key, item.disabled)}
            role="tab"
            aria-selected={item.key === currentActiveKey}
          >
            {item.icon && <span className="mr-2">{item.icon}</span>}
            {item.label}
          </div>
        ))}
        
        {extra && <div className="ml-auto flex items-center">{extra}</div>}
      </div>
      
      {/* 内容区 */}
      <div className={getContentClasses()}>
        {getActiveContent()}
      </div>
    </div>
  );
};

export default Tabs;