/**
 * WebSocket客户端
 * 处理WebSocket连接、订阅和消息
 */

import { WS_BASE_URL, WS_CONFIG } from '../config';
import { WebSocketMessage, WebSocketSubscriptionOptions, Signal, AgentUpdate, PoolUpdate, MarketUpdate } from '../types';

// 事件类型
export enum WebSocketEventType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  MESSAGE = 'message',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

// 连接状态
export enum WebSocketConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}

// 事件监听器类型
type EventListener = (data: any) => void;

// 订阅信息
interface Subscription {
  id: string;
  topic: string;
  options?: Record<string, any>;
  listeners: Map<string, Set<EventListener>>;
}

export class WebSocketClient {
  private url: string;
  private socket: WebSocket | null = null;
  private connectionState: WebSocketConnectionState = WebSocketConnectionState.DISCONNECTED;
  private reconnectAttempts: number = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private subscriptions: Map<string, Subscription> = new Map();
  private eventListeners: Map<string, Set<EventListener>> = new Map();
  private sessionId: string | null = null;

  constructor(url: string = WS_BASE_URL) {
    this.url = url;
  }

  /**
   * 添加连接成功事件监听器
   */
  public onOpen(listener: EventListener): void {
    this.addEventListener(WebSocketEventType.CONNECT, listener);
  }

  /**
   * 添加连接关闭事件监听器
   */
  public onClose(listener: EventListener): void {
    this.addEventListener(WebSocketEventType.DISCONNECT, listener);
  }

  /**
   * 添加错误事件监听器
   */
  public onError(listener: EventListener): void {
    this.addEventListener(WebSocketEventType.ERROR, listener);
  }

  /**
   * 连接到WebSocket服务器
   */
  public connect(): Promise<void> {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return Promise.resolve();
    }

    this.connectionState = WebSocketConnectionState.CONNECTING;
    this.emitEvent(WebSocketEventType.CONNECT, { state: this.connectionState });

    return new Promise((resolve, reject) => {
      try {
        // 构建URL，添加会话ID（如果有）
        let wsUrl = this.url;
        if (this.sessionId) {
          wsUrl += `?sessionId=${this.sessionId}`;
        }

        this.socket = new WebSocket(wsUrl);

        // 设置事件处理器
        this.socket.onopen = () => {
          this.connectionState = WebSocketConnectionState.CONNECTED;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          this.emitEvent(WebSocketEventType.CONNECT, { state: this.connectionState });
          
          // 重新订阅所有主题
          this.resubscribeAll();
          
          resolve();
        };

        this.socket.onmessage = (event) => {
          this.handleMessage(event);
        };

        this.socket.onerror = (error) => {
          this.emitEvent(WebSocketEventType.ERROR, { error });
          reject(error);
        };

        this.socket.onclose = () => {
          this.connectionState = WebSocketConnectionState.DISCONNECTED;
          this.stopHeartbeat();
          this.emitEvent(WebSocketEventType.DISCONNECT, { state: this.connectionState });
          
          // 尝试重新连接
          this.reconnect();
        };
      } catch (error) {
        this.connectionState = WebSocketConnectionState.DISCONNECTED;
        this.emitEvent(WebSocketEventType.ERROR, { error });
        reject(error);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  public disconnect(): void {
    this.stopReconnect();
    this.stopHeartbeat();

    if (this.socket) {
      this.socket.close();
      this.socket = null;
    }

    this.connectionState = WebSocketConnectionState.DISCONNECTED;
    this.emitEvent(WebSocketEventType.DISCONNECT, { state: this.connectionState });
  }

  /**
   * 重新连接
   */
  private reconnect(): void {
    if (this.reconnectTimer || this.connectionState === WebSocketConnectionState.CONNECTING) {
      return;
    }

    this.stopReconnect();

    if (this.reconnectAttempts >= WS_CONFIG.maxReconnectAttempts) {
      this.emitEvent(WebSocketEventType.RECONNECT_FAILED, {
        attempts: this.reconnectAttempts,
      });
      return;
    }

    this.connectionState = WebSocketConnectionState.RECONNECTING;
    this.reconnectAttempts++;

    const delay = Math.min(
      WS_CONFIG.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      10000
    );

    this.emitEvent(WebSocketEventType.RECONNECT_ATTEMPT, {
      attempts: this.reconnectAttempts,
      delay,
    });

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect().catch((error) => {
        this.emitEvent(WebSocketEventType.RECONNECT_ERROR, { error });
      });
    }, delay);
  }

  /**
   * 停止重连
   */
  private stopReconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  /**
   * 开始心跳
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.socket && this.socket.readyState === WebSocket.OPEN) {
        this.send('ping', {});
      }
    }, WS_CONFIG.heartbeatInterval);
  }

  /**
   * 停止心跳
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * 处理接收到的消息
   */
  private handleMessage(event: MessageEvent): void {
    try {
      const message = JSON.parse(event.data) as WebSocketMessage;
      
      // 处理会话ID
      if (message.type === 'session' && message.data && message.data.sessionId) {
        this.sessionId = message.data.sessionId;
        if (this.sessionId) {
          localStorage.setItem('ws_session_id', this.sessionId);
        }
      }
      
      // 处理心跳响应
      if (message.type === 'pong') {
        return;
      }
      
      // 发出全局消息事件
      this.emitEvent(WebSocketEventType.MESSAGE, message);
      
      // 处理订阅消息
      if (message.type.includes(':')) {
        const [topic, eventType] = message.type.split(':');
        
        // 查找对应的订阅
        this.subscriptions.forEach((subscription) => {
          if (subscription.topic === topic) {
            // 发出订阅特定事件
            const listeners = subscription.listeners.get(eventType);
            if (listeners) {
              listeners.forEach((listener) => {
                listener(message.data);
              });
            }
            
            // 发出订阅的所有消息事件
            const allListeners = subscription.listeners.get('message');
            if (allListeners) {
              allListeners.forEach((listener) => {
                listener(message);
              });
            }
          }
        });
      }
    } catch (error) {
      this.emitEvent(WebSocketEventType.ERROR, {
        error,
        data: event.data,
      });
    }
  }

  /**
   * 订阅信号
   */
  public subscribeToSignals(options?: any): string {
    return this.subscribe({
      topic: 'signals',
      options,
    });
  }

  /**
   * 取消订阅信号
   */
  public unsubscribeFromSignals(subscriptionId: string): boolean {
    return this.unsubscribe(subscriptionId);
  }

  /**
   * 添加信号事件监听器
   */
  public onSignal(subscriptionId: string, listener: (signal: Signal) => void): boolean {
    return this.on(subscriptionId, 'signal', listener);
  }

  /**
   * 添加信号过期事件监听器
   */
  public onSignalExpired(subscriptionId: string, listener: (signalId: string) => void): boolean {
    return this.on(subscriptionId, 'signal_expired', listener);
  }

  /**
   * 订阅Agent更新
   */
  public subscribeToAgentUpdates(agentId: string): string {
    return this.subscribe({
      topic: 'agent_updates',
      options: { agentId },
    });
  }

  /**
   * 取消订阅Agent更新
   */
  public unsubscribeFromAgentUpdates(subscriptionId: string): boolean {
    return this.unsubscribe(subscriptionId);
  }

  /**
   * 添加Agent更新事件监听器
   */
  public onAgentUpdate(subscriptionId: string, listener: (update: AgentUpdate) => void): boolean {
    return this.on(subscriptionId, 'agent_update', listener);
  }

  /**
   * 订阅池更新
   */
  public subscribeToPoolUpdates(poolAddress: string): string {
    return this.subscribe({
      topic: 'pool_updates',
      options: { poolAddress },
    });
  }

  /**
   * 取消订阅池更新
   */
  public unsubscribeFromPoolUpdates(subscriptionId: string): boolean {
    return this.unsubscribe(subscriptionId);
  }

  /**
   * 添加池更新事件监听器
   */
  public onPoolUpdate(subscriptionId: string, listener: (update: PoolUpdate) => void): boolean {
    return this.on(subscriptionId, 'pool_update', listener);
  }

  /**
   * 订阅市场更新
   */
  public subscribeToMarketUpdates(symbols?: string[]): string {
    return this.subscribe({
      topic: 'market_updates',
      options: { symbols },
    });
  }

  /**
   * 取消订阅市场更新
   */
  public unsubscribeFromMarketUpdates(subscriptionId: string): boolean {
    return this.unsubscribe(subscriptionId);
  }

  /**
   * 添加市场更新事件监听器
   */
  public onMarketUpdate(subscriptionId: string, listener: (update: MarketUpdate) => void): boolean {
    return this.on(subscriptionId, 'market_update', listener);
  }

  /**
   * 发送消息
   */
  public send(type: string, data: any): boolean {
    if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
      return false;
    }

    try {
      const message: WebSocketMessage = {
        type,
        data,
        timestamp: new Date().toISOString(),
      };

      this.socket.send(JSON.stringify(message));
      return true;
    } catch (error) {
      this.emitEvent(WebSocketEventType.ERROR, { error });
      return false;
    }
  }

  /**
   * 订阅主题
   */
  public subscribe(options: WebSocketSubscriptionOptions): string {
    const subscriptionId = this.generateSubscriptionId();
    
    // 创建订阅
    const subscription: Subscription = {
      id: subscriptionId,
      topic: options.topic,
      options: options.options,
      listeners: new Map(),
    };
    
    this.subscriptions.set(subscriptionId, subscription);
    
    // 如果已连接，发送订阅消息
    if (this.connectionState === WebSocketConnectionState.CONNECTED) {
      this.sendSubscription(subscription);
    }
    
    this.emitEvent(WebSocketEventType.SUBSCRIBE, {
      id: subscriptionId,
      topic: options.topic,
      options: options.options,
    });
    
    return subscriptionId;
  }

  /**
   * 取消订阅
   */
  public unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      return false;
    }
    
    // 如果已连接，发送取消订阅消息
    if (this.connectionState === WebSocketConnectionState.CONNECTED) {
      this.send('unsubscribe', {
        topic: subscription.topic,
      });
    }
    
    this.subscriptions.delete(subscriptionId);
    
    this.emitEvent(WebSocketEventType.UNSUBSCRIBE, {
      id: subscriptionId,
      topic: subscription.topic,
    });
    
    return true;
  }

  /**
   * 发送订阅消息
   */
  private sendSubscription(subscription: Subscription): void {
    this.send('subscribe', {
      topic: subscription.topic,
      options: subscription.options,
    });
  }

  /**
   * 重新订阅所有主题
   */
  private resubscribeAll(): void {
    this.subscriptions.forEach((subscription) => {
      this.sendSubscription(subscription);
    });
  }

  /**
   * 添加订阅事件监听器
   */
  public on(subscriptionId: string, event: string, listener: EventListener): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription) {
      return false;
    }
    
    if (!subscription.listeners.has(event)) {
      subscription.listeners.set(event, new Set());
    }
    
    subscription.listeners.get(event)!.add(listener);
    return true;
  }

  /**
   * 移除订阅事件监听器
   */
  public off(subscriptionId: string, event: string, listener: EventListener): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    
    if (!subscription || !subscription.listeners.has(event)) {
      return false;
    }
    
    return subscription.listeners.get(event)!.delete(listener);
  }

  /**
   * 添加全局事件监听器
   */
  public addEventListener(event: WebSocketEventType, listener: EventListener): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, new Set());
    }
    
    this.eventListeners.get(event)!.add(listener);
  }

  /**
   * 移除全局事件监听器
   */
  public removeEventListener(event: WebSocketEventType, listener: EventListener): boolean {
    if (!this.eventListeners.has(event)) {
      return false;
    }
    
    return this.eventListeners.get(event)!.delete(listener);
  }

  /**
   * 发出事件
   */
  private emitEvent(event: string, data: any): void {
    if (this.eventListeners.has(event)) {
      this.eventListeners.get(event)!.forEach((listener) => {
        listener(data);
      });
    }
  }

  /**
   * 生成订阅ID
   */
  private generateSubscriptionId(): string {
    return Math.random().toString(36).substring(2, 15);
  }

  /**
   * 获取连接状态
   */
  public getConnectionState(): WebSocketConnectionState {
    return this.connectionState;
  }

  /**
   * 获取会话ID
   */
  public getSessionId(): string | null {
    return this.sessionId;
  }

  /**
   * 设置会话ID
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem('ws_session_id', sessionId);
  }

  /**
   * 恢复会话
   */
  public restoreSession(): string | null {
    const sessionId = localStorage.getItem('ws_session_id');
    
    if (sessionId) {
      this.sessionId = sessionId;
    }
    
    return this.sessionId;
  }

  /**
   * 清除会话
   */
  public clearSession(): void {
    this.sessionId = null;
    localStorage.removeItem('ws_session_id');
  }
}

// 导出默认实例
export default new WebSocketClient(); 