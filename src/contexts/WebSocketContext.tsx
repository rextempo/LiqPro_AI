import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { useWebSocket, WebSocketState } from '../hooks/useWebSocket';

// 定义WebSocket上下文类型
interface WebSocketContextType {
  isConnected: boolean;
  lastMessage: WebSocketEventMap['message'] | null;
  sendMessage: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
  subscribe: (topic: string, callback: (data: any) => void) => string;
  unsubscribe: (id: string) => void;
}

// 创建WebSocket上下文
const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

// 定义订阅类型
interface Subscription {
  id: string;
  topic: string;
  callback: (data: any) => void;
}

// WebSocket提供者组件属性
interface WebSocketProviderProps {
  url: string;
  children: ReactNode;
}

// WebSocket提供者组件
export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ url, children }) => {
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const { lastMessage, readyState, sendMessage } = useWebSocket(url);

  // 处理接收到的消息
  useEffect(() => {
    if (lastMessage) {
      try {
        const data = JSON.parse(lastMessage.data);
        const topic = data.topic || 'default';
        
        // 查找并执行所有匹配主题的订阅回调
        subscriptions
          .filter(sub => sub.topic === topic)
          .forEach(sub => sub.callback(data));
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, subscriptions]);

  // 订阅主题
  const subscribe = useCallback((topic: string, callback: (data: any) => void) => {
    const id = `sub_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    setSubscriptions(prev => [...prev, { id, topic, callback }]);
    
    return id;
  }, []);

  // 取消订阅
  const unsubscribe = useCallback((id: string) => {
    setSubscriptions(prev => prev.filter(sub => sub.id !== id));
  }, []);

  // 上下文值
  const value = {
    isConnected: readyState === WebSocketState.OPEN,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// 自定义钩子，用于在组件中使用WebSocket上下文
export const useWebSocketContext = (): WebSocketContextType => {
  const context = useContext(WebSocketContext);
  
  if (context === undefined) {
    throw new Error('useWebSocketContext must be used within a WebSocketProvider');
  }
  
  return context;
}; 