import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface VirtualizedListProps<T> {
  /**
   * 列表数据
   */
  items: T[];
  
  /**
   * 渲染每个列表项的函数
   */
  renderItem: (item: T, index: number) => React.ReactNode;
  
  /**
   * 每个列表项的高度（像素）
   */
  itemHeight: number;
  
  /**
   * 容器高度（像素）
   */
  height: number;
  
  /**
   * 容器宽度（像素或百分比）
   */
  width?: string | number;
  
  /**
   * 预渲染的额外项数（上下各多渲染几个）
   */
  overscan?: number;
  
  /**
   * 自定义类名
   */
  className?: string;
  
  /**
   * 列表项的唯一标识函数
   */
  getItemKey?: (item: T, index: number) => string | number;
}

/**
 * 虚拟化列表组件
 * 用于高效渲染大型列表，只渲染可见区域的项
 */
function VirtualizedList<T>({
  items,
  renderItem,
  itemHeight,
  height,
  width = '100%',
  overscan = 3,
  className = '',
  getItemKey = (_, index) => index,
}: VirtualizedListProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  
  // 计算可见区域的起始和结束索引
  const visibleStartIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const visibleEndIndex = Math.min(
    items.length - 1,
    Math.ceil((scrollTop + height) / itemHeight) + overscan
  );
  
  // 可见项
  const visibleItems = items.slice(visibleStartIndex, visibleEndIndex + 1);
  
  // 处理滚动事件
  const handleScroll = useCallback(() => {
    if (containerRef.current) {
      setScrollTop(containerRef.current.scrollTop);
    }
  }, []);
  
  // 添加滚动事件监听
  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => {
        container.removeEventListener('scroll', handleScroll);
      };
    }
  }, [handleScroll]);
  
  // 计算总内容高度
  const totalHeight = items.length * itemHeight;
  
  // 计算可见内容的偏移量
  const offsetY = visibleStartIndex * itemHeight;
  
  return (
    <div
      ref={containerRef}
      className={`virtualized-list-container overflow-auto ${className}`}
      style={{
        height,
        width,
        position: 'relative',
      }}
    >
      <div
        className="virtualized-list-inner"
        style={{
          height: totalHeight,
          position: 'relative',
        }}
      >
        <div
          className="virtualized-list-items"
          style={{
            position: 'absolute',
            top: offsetY,
            left: 0,
            right: 0,
          }}
        >
          {visibleItems.map((item, index) => {
            const actualIndex = visibleStartIndex + index;
            const key = getItemKey(item, actualIndex);
            
            return (
              <div
                key={key}
                className="virtualized-list-item"
                style={{
                  height: itemHeight,
                }}
              >
                {renderItem(item, actualIndex)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default VirtualizedList; 