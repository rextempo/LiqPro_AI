import React, { ReactNode } from 'react';
import { CSSTransition } from 'react-transition-group';
import './Transition.css';

export type TransitionType = 
  | 'fade'
  | 'slide-up'
  | 'slide-down'
  | 'slide-left'
  | 'slide-right'
  | 'zoom'
  | 'bounce'
  | 'rotate';

export interface TransitionProps {
  /**
   * 是否显示内容
   */
  in: boolean;
  
  /**
   * 过渡类型
   */
  type?: TransitionType;
  
  /**
   * 过渡持续时间（毫秒）
   */
  duration?: number;
  
  /**
   * 过渡延迟（毫秒）
   */
  delay?: number;
  
  /**
   * 是否在初始挂载时执行动画
   */
  appear?: boolean;
  
  /**
   * 是否在卸载后移除DOM节点
   */
  unmountOnExit?: boolean;
  
  /**
   * 子元素
   */
  children: ReactNode;
  
  /**
   * 进入动画完成回调
   */
  onEntered?: () => void;
  
  /**
   * 退出动画完成回调
   */
  onExited?: () => void;
  
  /**
   * 自定义类名
   */
  className?: string;
}

/**
 * 过渡动画组件
 * 用于实现平滑的UI过渡效果
 */
const Transition: React.FC<TransitionProps> = ({
  in: inProp,
  type = 'fade',
  duration = 300,
  delay = 0,
  appear = false,
  unmountOnExit = true,
  children,
  onEntered,
  onExited,
  className = '',
}) => {
  // 根据持续时间和延迟设置样式
  const style = {
    '--transition-duration': `${duration}ms`,
    '--transition-delay': `${delay}ms`,
  } as React.CSSProperties;
  
  return (
    <CSSTransition
      in={inProp}
      timeout={duration + delay}
      classNames={`transition-${type}`}
      appear={appear}
      unmountOnExit={unmountOnExit}
      onEntered={onEntered}
      onExited={onExited}
    >
      <div className={`transition-component ${className}`} style={style}>
        {children}
      </div>
    </CSSTransition>
  );
};

export default Transition; 