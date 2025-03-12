import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useToast } from '@chakra-ui/react';
import { useAuth } from './AuthContext';
import { websocketClient } from '../api';
import { Signal, AgentUpdate, PoolUpdate, MarketUpdate } from '../api/types';

interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  signals: Signal[];
  agentUpdates: Record<string, AgentUpdate>;
  poolUpdates: Record<string, PoolUpdate>;
  marketUpdates: Record<string, MarketUpdate>;
  subscribeToSignals: (options?: any) => string;
  unsubscribeFromSignals: (subscriptionId: string) => void;
  subscribeToAgentUpdates: (agentId: string) => string;
  unsubscribeFromAgentUpdates: (subscriptionId: string) => void;
  subscribeToPoolUpdates: (poolAddress: string) => string;
  unsubscribeFromPoolUpdates: (subscriptionId: string) => void;
  subscribeToMarketUpdates: (symbols?: string[]) => string;
  unsubscribeFromMarketUpdates: (subscriptionId: string) => void;
  clearSignals: () => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (context === undefined) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: ReactNode;
}

export const WebSocketProvider: React.FC<WebSocketProviderProps> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [signals, setSignals] = useState<Signal[]>([]);
  const [agentUpdates, setAgentUpdates] = useState<Record<string, AgentUpdate>>({});
  const [poolUpdates, setPoolUpdates] = useState<Record<string, PoolUpdate>>({});
  const [marketUpdates, setMarketUpdates] = useState<Record<string, MarketUpdate>>({});
  const toast = useToast();

  // 当用户认证状态变化时，连接或断开WebSocket
  useEffect(() => {
    if (isAuthenticated) {
      connectWebSocket();
    } else {
      disconnectWebSocket();
    }

    return () => {
      // 组件卸载时断开WebSocket连接
      disconnectWebSocket();
    };
  }, [isAuthenticated]);

  // 连接WebSocket
  const connectWebSocket = async () => {
    try {
      setIsConnecting(true);
      
      // 设置WebSocket事件处理器
      websocketClient.onOpen(() => {
        setIsConnected(true);
        setIsConnecting(false);
        console.log('WebSocket连接已建立');
      });

      websocketClient.onClose(() => {
        setIsConnected(false);
        console.log('WebSocket连接已关闭');
      });

      websocketClient.onError((error) => {
        console.error('WebSocket错误:', error);
        toast({
          title: 'WebSocket连接错误',
          description: '无法建立实时数据连接，请刷新页面重试',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
      });

      // 连接WebSocket
      await websocketClient.connect();
    } catch (error) {
      console.error('WebSocket连接失败:', error);
      setIsConnecting(false);
      
      toast({
        title: 'WebSocket连接失败',
        description: '无法建立实时数据连接，请刷新页面重试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  // 断开WebSocket连接
  const disconnectWebSocket = () => {
    websocketClient.disconnect();
    setIsConnected(false);
    setIsConnecting(false);
    
    // 清除所有数据
    setSignals([]);
    setAgentUpdates({});
    setPoolUpdates({});
    setMarketUpdates({});
  };

  // 订阅信号
  const subscribeToSignals = (options?: any) => {
    // 设置信号处理器
    const handleSignal = (signal: Signal) => {
      setSignals((prevSignals) => {
        // 检查信号是否已存在
        const exists = prevSignals.some((s) => s.id === signal.id);
        if (exists) {
          // 更新现有信号
          return prevSignals.map((s) => (s.id === signal.id ? signal : s));
        } else {
          // 添加新信号，保持最新的信号在前面
          return [signal, ...prevSignals].slice(0, 100); // 限制最多100个信号
        }
      });
    };

    const handleExpiredSignal = (signalId: string) => {
      setSignals((prevSignals) => prevSignals.filter((s) => s.id !== signalId));
    };

    // 订阅信号
    const subscriptionId = websocketClient.subscribeToSignals(options);
    
    // 添加信号处理器
    websocketClient.onSignal(subscriptionId, handleSignal);
    websocketClient.onSignalExpired(subscriptionId, handleExpiredSignal);
    
    return subscriptionId;
  };

  // 取消订阅信号
  const unsubscribeFromSignals = (subscriptionId: string) => {
    websocketClient.unsubscribeFromSignals(subscriptionId);
  };

  // 订阅Agent更新
  const subscribeToAgentUpdates = (agentId: string) => {
    // 设置Agent更新处理器
    const handleAgentUpdate = (update: AgentUpdate) => {
      setAgentUpdates((prevUpdates) => ({
        ...prevUpdates,
        [update.agentId]: update,
      }));
    };

    // 订阅Agent更新
    const subscriptionId = websocketClient.subscribeToAgentUpdates(agentId);
    
    // 添加Agent更新处理器
    websocketClient.onAgentUpdate(subscriptionId, handleAgentUpdate);
    
    return subscriptionId;
  };

  // 取消订阅Agent更新
  const unsubscribeFromAgentUpdates = (subscriptionId: string) => {
    websocketClient.unsubscribeFromAgentUpdates(subscriptionId);
  };

  // 订阅池更新
  const subscribeToPoolUpdates = (poolAddress: string) => {
    // 设置池更新处理器
    const handlePoolUpdate = (update: PoolUpdate) => {
      setPoolUpdates((prevUpdates) => ({
        ...prevUpdates,
        [update.poolAddress]: update,
      }));
    };

    // 订阅池更新
    const subscriptionId = websocketClient.subscribeToPoolUpdates(poolAddress);
    
    // 添加池更新处理器
    websocketClient.onPoolUpdate(subscriptionId, handlePoolUpdate);
    
    return subscriptionId;
  };

  // 取消订阅池更新
  const unsubscribeFromPoolUpdates = (subscriptionId: string) => {
    websocketClient.unsubscribeFromPoolUpdates(subscriptionId);
  };

  // 订阅市场更新
  const subscribeToMarketUpdates = (symbols?: string[]) => {
    // 设置市场更新处理器
    const handleMarketUpdate = (update: MarketUpdate) => {
      setMarketUpdates((prevUpdates) => ({
        ...prevUpdates,
        [update.symbol]: update,
      }));
    };

    // 订阅市场更新
    const subscriptionId = websocketClient.subscribeToMarketUpdates(symbols);
    
    // 添加市场更新处理器
    websocketClient.onMarketUpdate(subscriptionId, handleMarketUpdate);
    
    return subscriptionId;
  };

  // 取消订阅市场更新
  const unsubscribeFromMarketUpdates = (subscriptionId: string) => {
    websocketClient.unsubscribeFromMarketUpdates(subscriptionId);
  };

  // 清除信号
  const clearSignals = () => {
    setSignals([]);
  };

  const value = {
    isConnected,
    isConnecting,
    signals,
    agentUpdates,
    poolUpdates,
    marketUpdates,
    subscribeToSignals,
    unsubscribeFromSignals,
    subscribeToAgentUpdates,
    unsubscribeFromAgentUpdates,
    subscribeToPoolUpdates,
    unsubscribeFromPoolUpdates,
    subscribeToMarketUpdates,
    unsubscribeFromMarketUpdates,
    clearSignals,
  };

  return <WebSocketContext.Provider value={value}>{children}</WebSocketContext.Provider>;
};

export default WebSocketContext; 