/**
 * WebSocket Client
 * Client-side WebSocket manager with reconnection support
 */
import { io } from 'socket.io-client';
import { ReconnectManager, ReconnectOptions } from '../utils/reconnect-manager';
import { Signal, SignalSubscriptionOptions } from '../types';
import { EventEmitter } from 'events';

export interface WebSocketClientOptions {
  url: string;
  path?: string;
  apiKey?: string;
  autoConnect?: boolean;
  reconnect?: boolean;
  reconnectOptions?: Partial<ReconnectOptions>;
  debug?: boolean;
  persistSession?: boolean;
  sessionStorage?: Storage;
}

export interface Subscription {
  id: string;
  topic: string;
  options: SignalSubscriptionOptions;
}

export interface ConnectionState {
  connected: boolean;
  authenticated: boolean;
  reconnecting: boolean;
  reconnectAttempt: number;
  lastConnected: number | null;
  lastDisconnected: number | null;
  error: Error | null;
}

export class WebSocketClient extends EventEmitter {
  private socket: any = null;
  private options: WebSocketClientOptions;
  private reconnectManager: ReconnectManager;
  private subscriptions: Map<string, Subscription> = new Map();
  private connected: boolean = false;
  private authenticated: boolean = false;
  private clientId: string = '';
  private sessionId: string = '';
  private reconnecting: boolean = false;
  private reconnectAttempt: number = 0;
  private lastConnected: number | null = null;
  private lastDisconnected: number | null = null;
  private connectionError: Error | null = null;
  private readonly SESSION_STORAGE_KEY = 'websocket_session';

  /**
   * Constructor
   * @param options WebSocket client options
   */
  constructor(options: WebSocketClientOptions) {
    super();
    
    this.options = {
      path: '/ws',
      autoConnect: true,
      reconnect: true,
      debug: false,
      persistSession: true,
      sessionStorage: typeof window !== 'undefined' ? window.localStorage : undefined,
      ...options
    };
    
    // Generate client ID if not provided
    this.clientId = this.loadClientId() || this.generateClientId();
    
    // Load session ID if available
    this.sessionId = this.loadSessionId() || '';
    
    // Initialize reconnect manager
    this.reconnectManager = new ReconnectManager({
      ...this.options.reconnectOptions,
      onReconnect: (attempt, delay) => {
        this.reconnectAttempt = attempt;
        this.emit('reconnect_attempt', attempt, delay);
        this.log(`Reconnect attempt ${attempt}, delay: ${delay}ms`);
      },
      onMaxAttemptsReached: () => {
        this.emit('reconnect_failed');
        this.log('Reconnection failed after maximum attempts');
      }
    });
    
    if (this.options.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   * @returns Promise that resolves when connected
   */
  async connect(): Promise<boolean> {
    if (this.socket) {
      return Promise.resolve(this.connected);
    }
    
    return new Promise((resolve) => {
      this.log('Connecting to WebSocket server...');
      
      // Prepare connection query parameters
      const query: Record<string, string> = {
        clientId: this.clientId
      };
      
      // Add session ID if available
      if (this.sessionId) {
        query.sessionId = this.sessionId;
      }
      
      this.socket = io(this.options.url, {
        path: this.options.path,
        transports: ['websocket'],
        reconnection: false, // We'll handle reconnection ourselves
        autoConnect: true,
        query
      });
      
      // Set up event handlers
      this.setupEventHandlers();
      
      // Resolve when connected
      this.socket.on('connect', () => {
        this.connected = true;
        this.lastConnected = Date.now();
        this.reconnecting = false;
        this.reconnectAttempt = 0;
        this.connectionError = null;
        this.log('Connected to WebSocket server');
        resolve(true);
      });
      
      // Resolve with false if connection fails
      this.socket.on('connect_error', (error: Error) => {
        this.connectionError = error;
        this.log('Connection error:', error);
        resolve(false);
      });
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;
    
    // Connection events
    this.socket.on('connect', this.handleConnect.bind(this));
    this.socket.on('disconnect', this.handleDisconnect.bind(this));
    this.socket.on('connect_error', this.handleConnectError.bind(this));
    
    // Server events
    this.socket.on('connection_info', this.handleConnectionInfo.bind(this));
    this.socket.on('heartbeat', this.handleHeartbeat.bind(this));
    
    // Signal events
    this.socket.on('signals', this.handleSignals.bind(this));
    this.socket.on('filtered_signals', this.handleFilteredSignals.bind(this));
    this.socket.on('expired_signals', this.handleExpiredSignals.bind(this));
    
    // Other events
    this.socket.on('system', this.handleSystemMessage.bind(this));
    this.socket.on('performance', this.handlePerformanceMetrics.bind(this));
    this.socket.on('strategy', this.handleStrategyUpdate.bind(this));
  }

  /**
   * Handle connect event
   */
  private handleConnect(): void {
    this.connected = true;
    this.lastConnected = Date.now();
    this.reconnecting = false;
    this.reconnectAttempt = 0;
    this.connectionError = null;
    
    this.emit('connect');
    
    // Authenticate if API key is provided
    if (this.options.apiKey) {
      this.authenticate(this.options.apiKey);
    }
  }

  /**
   * Handle disconnect event
   * @param reason Disconnect reason
   */
  private handleDisconnect(reason: string): void {
    this.connected = false;
    this.lastDisconnected = Date.now();
    
    this.emit('disconnect', reason);
    
    this.log('Disconnected:', reason);
    
    // Attempt reconnection if enabled
    if (this.options.reconnect) {
      this.reconnecting = true;
      this.emit('reconnecting');
      this.attemptReconnect();
    }
  }

  /**
   * Handle connect error event
   * @param error Connection error
   */
  private handleConnectError(error: Error): void {
    this.connectionError = error;
    this.emit('connect_error', error);
    this.log('Connection error:', error);
    
    // Attempt reconnection if enabled
    if (this.options.reconnect) {
      this.reconnecting = true;
      this.emit('reconnecting');
      this.attemptReconnect();
    }
  }

  /**
   * Attempt reconnection with backoff
   */
  private attemptReconnect(): void {
    this.log('Attempting reconnection...');
    
    this.reconnectManager.reconnect(async () => {
      // Close existing socket if any
      if (this.socket) {
        this.socket.close();
        this.socket = null;
      }
      
      // Attempt to connect
      const success = await this.connect();
      
      if (success) {
        this.emit('reconnect');
        this.log('Reconnected successfully');
      }
      
      return success;
    }).then((success) => {
      if (!success) {
        this.reconnecting = false;
        this.emit('reconnect_failed');
        this.log('Reconnection failed after maximum attempts');
      }
    }).catch((error) => {
      this.reconnecting = false;
      this.connectionError = error;
      this.emit('reconnect_error', error);
      this.log('Reconnection error:', error);
    });
  }

  /**
   * Handle connection info event
   * @param data Connection info data
   */
  private handleConnectionInfo(data: any): void {
    this.clientId = data.clientId;
    
    // Save client ID
    this.saveClientId(this.clientId);
    
    // Update session ID if provided
    if (data.sessionId) {
      this.sessionId = data.sessionId;
      this.saveSessionId(this.sessionId);
    }
    
    // Update authentication status
    this.authenticated = data.authenticated || false;
    
    // If session was restored, update subscriptions
    if (data.restored && data.subscriptions) {
      this.log('Session restored with', data.subscriptions.length, 'subscriptions');
      
      // Clear existing subscriptions
      this.subscriptions.clear();
      
      // Add restored subscriptions
      for (const subscription of data.subscriptions) {
        this.subscriptions.set(subscription.id, {
          id: subscription.id,
          topic: subscription.topic,
          options: subscription.options
        });
      }
      
      this.emit('subscriptions_restored', Array.from(this.subscriptions.values()));
    }
    
    this.emit('connection_info', data);
    this.log('Connection info received:', data);
  }

  /**
   * Handle heartbeat event
   * @param data Heartbeat data
   */
  private handleHeartbeat(data: any): void {
    this.emit('heartbeat', data);
  }

  /**
   * Handle signals event
   * @param data Signals data
   */
  private handleSignals(data: { signals: Signal[]; timestamp: number }): void {
    this.emit('signals', data.signals, data.timestamp);
  }

  /**
   * Handle filtered signals event
   * @param data Filtered signals data
   */
  private handleFilteredSignals(data: { subscriptionId: string; signals: Signal[]; timestamp: number }): void {
    this.emit('filtered_signals', data.subscriptionId, data.signals, data.timestamp);
    
    // Also emit specific event for this subscription
    this.emit(`subscription:${data.subscriptionId}`, data.signals, data.timestamp);
  }

  /**
   * Handle expired signals event
   * @param data Expired signals data
   */
  private handleExpiredSignals(data: { signals: Signal[]; timestamp: number }): void {
    this.emit('expired_signals', data.signals, data.timestamp);
  }

  /**
   * Handle system message event
   * @param data System message data
   */
  private handleSystemMessage(data: { message: string; type: string; timestamp: number }): void {
    this.emit('system', data.message, data.type, data.timestamp);
  }

  /**
   * Handle performance metrics event
   * @param data Performance metrics data
   */
  private handlePerformanceMetrics(data: { metrics: any; timestamp: number }): void {
    this.emit('performance', data.metrics, data.timestamp);
  }

  /**
   * Handle strategy update event
   * @param data Strategy update data
   */
  private handleStrategyUpdate(data: { strategy: any; timestamp: number }): void {
    this.emit('strategy', data.strategy, data.timestamp);
  }

  /**
   * Authenticate with API key
   * @param apiKey API key
   * @returns Promise that resolves with authentication result
   */
  authenticate(apiKey: string): Promise<boolean> {
    if (!this.socket || !this.connected) {
      return Promise.reject(new Error('Not connected'));
    }
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('authenticate', { apiKey }, (response: any) => {
        if (response.success) {
          this.authenticated = true;
          this.emit('authenticated');
          this.log('Authentication successful');
          resolve(true);
        } else {
          this.log('Authentication failed:', response.message);
          reject(new Error(response.message || 'Authentication failed'));
        }
      });
    });
  }

  /**
   * Subscribe to topic
   * @param topic Topic to subscribe to
   * @param options Subscription options
   * @returns Promise that resolves with subscription ID
   */
  subscribe(topic: string, options: SignalSubscriptionOptions = {}): Promise<string> {
    if (!this.socket || !this.connected) {
      return Promise.reject(new Error('Not connected'));
    }
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('subscribe', { topic, options }, (response: any) => {
        if (response.success) {
          const subscriptionId = response.subscriptionId;
          
          // Store subscription
          this.subscriptions.set(subscriptionId, {
            id: subscriptionId,
            topic,
            options
          });
          
          this.log('Subscribed to', topic, 'with ID', subscriptionId);
          this.emit('subscribed', subscriptionId, topic, options);
          resolve(subscriptionId);
        } else {
          this.log('Subscription failed:', response.message);
          reject(new Error(response.message || 'Subscription failed'));
        }
      });
    });
  }

  /**
   * Unsubscribe from subscription
   * @param subscriptionId Subscription ID
   * @returns Promise that resolves with unsubscribe result
   */
  unsubscribe(subscriptionId: string): Promise<boolean> {
    if (!this.socket || !this.connected) {
      return Promise.reject(new Error('Not connected'));
    }
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('unsubscribe', { subscriptionId }, (response: any) => {
        if (response.success) {
          // Remove subscription
          this.subscriptions.delete(subscriptionId);
          
          this.log('Unsubscribed from', subscriptionId);
          this.emit('unsubscribed', subscriptionId);
          resolve(true);
        } else {
          this.log('Unsubscribe failed:', response.message);
          reject(new Error(response.message || 'Unsubscribe failed'));
        }
      });
    });
  }

  /**
   * Get all subscriptions
   * @returns Promise that resolves with subscriptions
   */
  getSubscriptions(): Promise<Subscription[]> {
    if (!this.socket || !this.connected) {
      return Promise.reject(new Error('Not connected'));
    }
    
    return new Promise((resolve, reject) => {
      this.socket!.emit('get_subscriptions', (response: any) => {
        if (response.success) {
          resolve(response.subscriptions);
        } else {
          reject(new Error(response.message || 'Failed to get subscriptions'));
        }
      });
    });
  }

  /**
   * Disconnect from WebSocket server
   */
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.connected = false;
    this.authenticated = false;
    this.reconnecting = false;
    this.reconnectManager.stop();
    
    this.emit('disconnected');
  }

  /**
   * Get connection state
   * @returns Connection state
   */
  getConnectionState(): ConnectionState {
    return {
      connected: this.connected,
      authenticated: this.authenticated,
      reconnecting: this.reconnecting,
      reconnectAttempt: this.reconnectAttempt,
      lastConnected: this.lastConnected,
      lastDisconnected: this.lastDisconnected,
      error: this.connectionError
    };
  }

  /**
   * Check if connected
   * @returns Whether connected
   */
  isConnected(): boolean {
    return this.connected;
  }

  /**
   * Check if authenticated
   * @returns Whether authenticated
   */
  isAuthenticated(): boolean {
    return this.authenticated;
  }

  /**
   * Check if reconnecting
   * @returns Whether reconnecting
   */
  isReconnecting(): boolean {
    return this.reconnecting;
  }

  /**
   * Get client ID
   * @returns Client ID
   */
  getClientId(): string {
    return this.clientId;
  }

  /**
   * Get session ID
   * @returns Session ID
   */
  getSessionId(): string {
    return this.sessionId;
  }

  /**
   * Generate client ID
   * @returns Generated client ID
   */
  private generateClientId(): string {
    return 'client_' + Math.random().toString(36).substring(2, 15);
  }

  /**
   * Save client ID to storage
   * @param clientId Client ID
   */
  private saveClientId(clientId: string): void {
    if (this.options.persistSession && this.options.sessionStorage) {
      try {
        const sessionData = JSON.parse(this.options.sessionStorage.getItem(this.SESSION_STORAGE_KEY) || '{}');
        sessionData.clientId = clientId;
        this.options.sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (error) {
        this.log('Error saving client ID:', error);
      }
    }
  }

  /**
   * Load client ID from storage
   * @returns Client ID or null if not found
   */
  private loadClientId(): string | null {
    if (this.options.persistSession && this.options.sessionStorage) {
      try {
        const sessionData = JSON.parse(this.options.sessionStorage.getItem(this.SESSION_STORAGE_KEY) || '{}');
        return sessionData.clientId || null;
      } catch (error) {
        this.log('Error loading client ID:', error);
      }
    }
    return null;
  }

  /**
   * Save session ID to storage
   * @param sessionId Session ID
   */
  private saveSessionId(sessionId: string): void {
    if (this.options.persistSession && this.options.sessionStorage) {
      try {
        const sessionData = JSON.parse(this.options.sessionStorage.getItem(this.SESSION_STORAGE_KEY) || '{}');
        sessionData.sessionId = sessionId;
        this.options.sessionStorage.setItem(this.SESSION_STORAGE_KEY, JSON.stringify(sessionData));
      } catch (error) {
        this.log('Error saving session ID:', error);
      }
    }
  }

  /**
   * Load session ID from storage
   * @returns Session ID or null if not found
   */
  private loadSessionId(): string | null {
    if (this.options.persistSession && this.options.sessionStorage) {
      try {
        const sessionData = JSON.parse(this.options.sessionStorage.getItem(this.SESSION_STORAGE_KEY) || '{}');
        return sessionData.sessionId || null;
      } catch (error) {
        this.log('Error loading session ID:', error);
      }
    }
    return null;
  }

  /**
   * Clear session data from storage
   */
  clearSessionData(): void {
    if (this.options.persistSession && this.options.sessionStorage) {
      try {
        this.options.sessionStorage.removeItem(this.SESSION_STORAGE_KEY);
      } catch (error) {
        this.log('Error clearing session data:', error);
      }
    }
  }

  /**
   * Log message if debug is enabled
   * @param args Arguments to log
   */
  private log(...args: any[]): void {
    if (this.options.debug) {
      console.log('[WebSocketClient]', ...args);
    }
  }
} 