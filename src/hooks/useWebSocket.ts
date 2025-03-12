import { useState, useEffect, useRef, useCallback } from 'react';

interface WebSocketHook {
  lastMessage: WebSocketEventMap['message'] | null;
  readyState: number;
  sendMessage: (data: string | ArrayBufferLike | Blob | ArrayBufferView) => void;
  reconnect: () => void;
}

/**
 * 自定义钩子，用于处理WebSocket连接
 * @param url WebSocket服务器URL
 * @param options 配置选项
 * @returns WebSocket状态和方法
 */
export const useWebSocket = (
  url: string,
  options: {
    onOpen?: (event: WebSocketEventMap['open']) => void;
    onClose?: (event: WebSocketEventMap['close']) => void;
    onMessage?: (event: WebSocketEventMap['message']) => void;
    onError?: (event: WebSocketEventMap['error']) => void;
    reconnectInterval?: number;
    reconnectAttempts?: number;
    shouldReconnect?: boolean;
  } = {}
): WebSocketHook => {
  const {
    onOpen,
    onClose,
    onMessage,
    onError,
    reconnectInterval = 5000,
    reconnectAttempts = 10,
    shouldReconnect = true
  } = options;

  const [lastMessage, setLastMessage] = useState<WebSocketEventMap['message'] | null>(null);
  const [readyState, setReadyState] = useState<number>(WebSocket.CONNECTING);
  
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectCountRef = useRef<number>(0);
  const reconnectTimerRef = useRef<number | null>(null);

  // 清理重连定时器
  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current !== null) {
      window.clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  // 创建WebSocket连接
  const connect = useCallback(() => {
    // 清理之前的连接
    if (socketRef.current) {
      socketRef.current.close();
    }

    // 创建新连接
    try {
      const socket = new WebSocket(url);
      socketRef.current = socket;
      setReadyState(WebSocket.CONNECTING);

      // 连接打开事件
      socket.onopen = (event) => {
        console.log('WebSocket连接已建立');
        setReadyState(WebSocket.OPEN);
        reconnectCountRef.current = 0;
        if (onOpen) onOpen(event);
      };

      // 接收消息事件
      socket.onmessage = (event) => {
        setLastMessage(event);
        if (onMessage) onMessage(event);
      };

      // 连接关闭事件
      socket.onclose = (event) => {
        console.log('WebSocket连接已关闭');
        setReadyState(WebSocket.CLOSED);
        if (onClose) onClose(event);

        // 如果需要重连且未达到最大重连次数
        if (shouldReconnect && reconnectCountRef.current < reconnectAttempts) {
          reconnectCountRef.current += 1;
          reconnectTimerRef.current = window.setTimeout(() => {
            console.log(`尝试重新连接 (${reconnectCountRef.current}/${reconnectAttempts})`);
            connect();
          }, reconnectInterval);
        }
      };

      // 错误事件
      socket.onerror = (event) => {
        console.error('WebSocket连接错误:', event);
        if (onError) onError(event);
      };
    } catch (error) {
      console.error('创建WebSocket连接失败:', error);
    }
  }, [url, onOpen, onClose, onMessage, onError, reconnectInterval, reconnectAttempts, shouldReconnect]);

  // 发送消息
  const sendMessage = useCallback(
    (data: string | ArrayBufferLike | Blob | ArrayBufferView) => {
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.send(data);
      } else {
        console.warn('WebSocket未连接，无法发送消息');
      }
    },
    []
  );

  // 手动重连
  const reconnect = useCallback(() => {
    clearReconnectTimer();
    reconnectCountRef.current = 0;
    connect();
  }, [clearReconnectTimer, connect]);

  // 初始化连接
  useEffect(() => {
    connect();

    // 清理函数
    return () => {
      clearReconnectTimer();
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [url, connect, clearReconnectTimer]);

  return {
    lastMessage,
    readyState,
    sendMessage,
    reconnect
  };
};

// WebSocket状态常量
export const WebSocketState = {
  CONNECTING: WebSocket.CONNECTING,
  OPEN: WebSocket.OPEN,
  CLOSING: WebSocket.CLOSING,
  CLOSED: WebSocket.CLOSED
}; 