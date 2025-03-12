import config from '../../config/env';

/**
 * WebSocket客户端
 * 用于处理WebSocket连接和消息传递
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts: number = config.security.maxReconnectAttempts;
  private reconnectTimeout: number = config.security.reconnectInterval;
  private sessionId: string | null = null;
  private subscriptions: Map<string, (data: any) => void> = new Map();
  private openHandlers: Array<() => void> = [];
  private closeHandlers: Array<() => void> = [];
  private errorHandlers: Array<(error: Error) => void> = [];
  private messageHandlers: Array<(data: any) => void> = [];

  /**
   * 构造函数
   * @param url WebSocket服务器URL
   */
  constructor(url: string = config.api.wsUrl) {
    this.url = url;
    this.sessionId = localStorage.getItem('ws_session_id');
  }

  /**
   * 连接到WebSocket服务器
   */
  public async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // 如果已经连接，则直接返回
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          resolve();
          return;
        }

        // 如果正在连接，则等待连接完成
        if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
          this.ws.addEventListener('open', () => resolve());
          this.ws.addEventListener('error', (error) => reject(error));
          return;
        }

        // 创建新的WebSocket连接
        const wsUrl = this.sessionId ? `${this.url}?sessionId=${this.sessionId}` : this.url;
        this.ws = new WebSocket(wsUrl);

        // 设置事件处理程序
        this.ws.onopen = () => {
          this.reconnectAttempts = 0;
          this.openHandlers.forEach(handler => handler());
          resolve();
        };

        this.ws.onclose = () => {
          this.closeHandlers.forEach(handler => handler());
          this.attemptReconnect();
        };

        this.ws.onerror = (event) => {
          const error = new Error('WebSocket connection error');
          this.errorHandlers.forEach(handler => handler(error));
          reject(error);
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            
            // 处理会话ID
            if (data.type === 'session' && data.sessionId) {
              this.setSessionId(data.sessionId);
            }
            
            // 处理订阅消息
            if (data.type === 'subscription' && data.channel && data.data) {
              const callback = this.subscriptions.get(data.channel);
              if (callback) {
                callback(data.data);
              }
            }
            
            // 调用所有消息处理程序
            this.messageHandlers.forEach(handler => handler(data));
          } catch (err) {
            console.error('Failed to parse WebSocket message:', err);
          }
        };
      } catch (err) {
        reject(err);
      }
    });
  }

  /**
   * 断开WebSocket连接
   */
  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * 发送消息到WebSocket服务器
   * @param data 要发送的数据
   */
  public send(data: any): void {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket is not connected');
    }

    this.ws.send(JSON.stringify(data));
  }

  /**
   * 订阅频道
   * @param channel 频道名称
   * @param callback 接收消息的回调函数
   * @returns 订阅ID
   */
  public subscribe(channel: string, callback: (data: any) => void): string {
    const subscriptionId = `${channel}-${Date.now()}`;
    
    // 保存回调函数
    this.subscriptions.set(channel, callback);
    
    // 发送订阅请求
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'subscribe',
        channel
      });
    }
    
    return subscriptionId;
  }

  /**
   * 取消订阅
   * @param subscriptionId 订阅ID
   */
  public unsubscribe(subscriptionId: string): void {
    // 从subscriptionId中提取频道名称
    const channel = subscriptionId.split('-')[0];
    
    if (channel && this.subscriptions.has(channel)) {
      // 发送取消订阅请求
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        this.send({
          type: 'unsubscribe',
          channel
        });
      }
      
      // 移除回调函数
      this.subscriptions.delete(channel);
    }
  }

  /**
   * 设置会话ID
   */
  public setSessionId(sessionId: string): void {
    this.sessionId = sessionId;
    localStorage.setItem('ws_session_id', sessionId);
  }

  /**
   * 添加连接打开处理程序
   * @param handler 处理程序
   */
  public onOpen(handler: () => void): void {
    this.openHandlers.push(handler);
  }

  /**
   * 添加连接关闭处理程序
   * @param handler 处理程序
   */
  public onClose(handler: () => void): void {
    this.closeHandlers.push(handler);
  }

  /**
   * 添加错误处理程序
   * @param handler 处理程序
   */
  public onError(handler: (error: Error) => void): void {
    this.errorHandlers.push(handler);
  }

  /**
   * 添加消息处理程序
   * @param handler 处理程序
   */
  public onMessage(handler: (data: any) => void): void {
    this.messageHandlers.push(handler);
  }

  /**
   * 尝试重新连接
   */
  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnect attempts reached');
      return;
    }

    this.reconnectAttempts++;
    
    setTimeout(() => {
      console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
      this.connect().catch(err => {
        console.error('Reconnect failed:', err);
      });
    }, this.reconnectTimeout * this.reconnectAttempts);
  }
} 