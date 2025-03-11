/**
 * WebSocket Service
 * Provides real-time signal broadcasting and client connection management
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { DefaultEventsMap } from 'socket.io/dist/typed-events';
import { Server as HttpServer } from 'http';
import { Signal, SignalSubscriptionOptions, SignalStrength, SignalReliability } from '../types';
import { logger } from '../utils/logger';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { SignalFilterOptions } from '../types/signal';

/**
 * Client subscription information
 */
interface ClientSubscription {
  id: string;
  topic: string;
  options: SignalSubscriptionOptions;
  createdAt: number;
}

/**
 * Client connection information
 */
interface ClientConnection {
  socketId: string;
  clientId: string;
  ip: string;
  userAgent: string;
  authenticated: boolean;
  connectedAt: number;
  lastActivity: number;
  subscriptions: Map<string, ClientSubscription>;
}

/**
 * WebSocket Service class
 */
export class WebSocketService {
  private io: SocketIOServer;
  private connectedClients: Map<string, ClientConnection> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  private readonly INACTIVE_TIMEOUT = 120000; // 2 minutes
  private readonly TOPICS = {
    SIGNALS: 'signals',
    STRATEGY: 'strategy',
    SYSTEM: 'system',
    PERFORMANCE: 'performance'
  };
  private apiKeys: string[] = [];
  private logger: Logger;

  /**
   * Constructor
   * @param server HTTP server instance
   * @param logger Logger instance
   */
  constructor(server: HttpServer, logger: Logger) {
    this.logger = logger;
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: config.cors.origin,
        methods: ['GET', 'POST'],
        credentials: config.cors.credentials
      },
      path: '/ws',
      connectTimeout: 10000,
      pingTimeout: 5000,
      pingInterval: 10000,
      transports: ['websocket', 'polling']
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    this.apiKeys = config.apiKeys || [];
    
    logger.info('WebSocket service initialized', {
      corsOrigin: config.cors.origin,
      corsCredentials: config.cors.credentials
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      const clientId = socket.handshake.auth.clientId || socket.id;
      const ip = socket.handshake.address;
      const userAgent = socket.handshake.headers['user-agent'] || 'unknown';
      
      this.logger.info(`Client connected: ${clientId}`, {
        socketId: socket.id,
        ip,
        userAgent
      });

      // Initialize client record
      this.connectedClients.set(clientId, {
        socketId: socket.id,
        clientId,
        ip,
        userAgent,
        authenticated: false,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        subscriptions: new Map()
      });

      // Update activity timestamp on any event
      socket.onAny(() => {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.lastActivity = Date.now();
        }
      });

      // Send connection info
      socket.emit('connection_info', {
        clientId,
        topics: Object.values(this.TOPICS)
      });

      // Heartbeat response
      socket.on('pong', () => {
        const client = this.connectedClients.get(clientId);
        if (client) {
          client.lastActivity = Date.now();
          this.logger.debug(`Heartbeat response from client ${clientId}`);
        }
      });

      // Authentication
      socket.on('authenticate', (data: { apiKey: string }, callback: Function) => {
        try {
          const client = this.connectedClients.get(clientId);
          
          if (!client) {
            this.logger.warn(`Client record not found for ${clientId}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Client record not found'
              });
            }
            return;
          }

          if (!data.apiKey) {
            this.logger.warn(`Missing API key for client ${clientId}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'API key is required'
              });
            }
            return;
          }

          if (!this.apiKeys.includes(data.apiKey)) {
            this.logger.warn(`Invalid API key for client ${clientId}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Invalid API key'
              });
            }
            return;
          }

          // Mark client as authenticated
          client.authenticated = true;
          client.lastActivity = Date.now();
          
          this.logger.info(`Client authenticated: ${clientId}`);
          
          if (typeof callback === 'function') {
            callback({
              success: true
            });
          }
        } catch (error) {
          this.logger.error(`Error handling authentication request`, { error, clientId });
          
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'Error processing authentication request'
            });
          }
        }
      });

      // Subscribe to a topic
      socket.on('subscribe', (data: { topic: string; options?: SignalSubscriptionOptions }, callback: Function) => {
        try {
          const client = this.connectedClients.get(clientId);
          
          if (!client) {
            this.logger.warn(`Client record not found for ${clientId}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Client record not found'
              });
            }
            return;
          }

          // Check authentication
          if (!client.authenticated) {
            this.logger.warn(`Unauthenticated client ${clientId} attempted to subscribe`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Authentication required'
              });
            }
            return;
          }

          // Validate topic
          if (!data.topic || !Object.values(this.TOPICS).includes(data.topic)) {
            this.logger.warn(`Invalid topic: ${data.topic}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Invalid topic'
              });
            }
            return;
          }

          // Create subscription
          const subscriptionId = this.generateSubscriptionId();
          const subscription: ClientSubscription = {
            id: subscriptionId,
            topic: data.topic,
            options: data.options || {},
            createdAt: Date.now()
          };
          
          // Add to client's subscriptions
          client.subscriptions.set(subscriptionId, subscription);
          
          // Join room for this topic
          socket.join(data.topic);
          
          this.logger.info(`Client ${clientId} subscribed to ${data.topic}`, {
            subscriptionId,
            options: data.options
          });
          
          if (typeof callback === 'function') {
            callback({
              success: true,
              subscriptionId
            });
          }
        } catch (error) {
          this.logger.error(`Error handling subscription request`, { error, clientId });
          
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'Error processing subscription request'
            });
          }
        }
      });

      // Unsubscribe from a topic
      socket.on('unsubscribe', (data: { subscriptionId: string }, callback: Function) => {
        try {
          const client = this.connectedClients.get(clientId);
          
          if (!client) {
            this.logger.warn(`Client record not found for ${clientId}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Client record not found'
              });
            }
            return;
          }

          // Check authentication
          if (!client.authenticated) {
            this.logger.warn(`Unauthenticated client ${clientId} attempted to unsubscribe`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Authentication required'
              });
            }
            return;
          }

          const subscription = client.subscriptions.get(data.subscriptionId);
          
          if (!subscription) {
            this.logger.warn(`Subscription ${data.subscriptionId} not found for client ${clientId}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Subscription not found'
              });
            }
            return;
          }

          // Remove subscription
          client.subscriptions.delete(data.subscriptionId);
          
          // Check if client has no more subscriptions to this topic
          const hasMoreSubscriptionsToTopic = Array.from(client.subscriptions.values())
            .some(sub => sub.topic === subscription.topic);
          
          // Leave room if no more subscriptions to this topic
          if (!hasMoreSubscriptionsToTopic) {
            socket.leave(subscription.topic);
          }
          
          this.logger.info(`Client ${clientId} unsubscribed from ${subscription.topic}`, {
            subscriptionId: data.subscriptionId
          });
          
          if (typeof callback === 'function') {
            callback({
              success: true
            });
          }
        } catch (error) {
          this.logger.error(`Error handling unsubscribe request`, { error, clientId });
          
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'Error processing unsubscribe request'
            });
          }
        }
      });

      // Get subscriptions
      socket.on('getSubscriptions', (callback: Function) => {
        try {
          const client = this.connectedClients.get(clientId);
          
          if (!client) {
            this.logger.warn(`Client record not found for ${clientId}`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Client record not found'
              });
            }
            return;
          }

          // Check authentication
          if (!client.authenticated) {
            this.logger.warn(`Unauthenticated client ${clientId} attempted to get subscriptions`);
            if (typeof callback === 'function') {
              callback({
                success: false,
                error: 'Authentication required'
              });
            }
            return;
          }

          // Convert Map to array for response
          const subscriptions = Array.from(client.subscriptions.values());
          
          if (typeof callback === 'function') {
            callback({
              success: true,
              subscriptions
            });
          }
        } catch (error) {
          this.logger.error(`Error handling get subscriptions request`, { error, clientId });
          
          if (typeof callback === 'function') {
            callback({
              success: false,
              error: 'Error processing get subscriptions request'
            });
          }
        }
      });

      // Disconnect
      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${clientId}`);
        this.connectedClients.delete(clientId);
      });
    });
  }

  /**
   * Start heartbeat mechanism
   */
  startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
      this.checkInactiveClients();
    }, this.HEARTBEAT_INTERVAL);
    
    this.logger.info(`Heartbeat started with interval ${this.HEARTBEAT_INTERVAL}ms`);
  }

  /**
   * Stop heartbeat mechanism
   */
  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.info('Heartbeat stopped');
    }
  }

  /**
   * Check for inactive clients and disconnect them
   */
  private checkInactiveClients(): void {
    const now = Date.now();
    let inactiveCount = 0;
    
    for (const [clientId, client] of this.connectedClients.entries()) {
      const inactiveDuration = now - client.lastActivity;
      
      if (inactiveDuration > this.INACTIVE_TIMEOUT) {
        this.logger.info(`Disconnecting inactive client: ${clientId}`, {
          inactiveDuration,
          threshold: this.INACTIVE_TIMEOUT
        });
        
        const socket = (this.io as any).sockets.sockets.get(client.socketId);
        
        if (socket) {
          socket.disconnect(true);
        }
        
        this.connectedClients.delete(clientId);
        inactiveCount++;
      }
    }

    if (inactiveCount > 0) {
      this.logger.info(`Disconnected ${inactiveCount} inactive clients`);
    }
  }

  /**
   * Send heartbeat to all connected clients
   */
  private sendHeartbeat(): void {
    this.io.emit('ping', { timestamp: Date.now() });
    this.logger.debug(`Sent heartbeat to ${this.connectedClients.size} clients`);
  }

  /**
   * Generate subscription ID
   * @returns Subscription ID
   */
  private generateSubscriptionId(): string {
    return `sub_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  /**
   * Filter signals based on subscription options
   * @param signal Signal to filter
   * @param options Subscription options
   * @returns Whether the signal matches the filter
   */
  private matchesFilter(signal: Signal, options: SignalSubscriptionOptions): boolean {
    // Filter by pool address
    if (options.poolAddresses && options.poolAddresses.length > 0) {
      if (!options.poolAddresses.includes(signal.poolAddress)) {
        return false;
      }
    }
    
    // Filter by signal type
    if (options.signalTypes && options.signalTypes.length > 0) {
      if (!options.signalTypes.includes(signal.type)) {
        return false;
      }
    }
    
    // Filter by signal strength
    if (options.minStrength !== undefined) {
      const strengthValues: Record<string, number> = {
        'VERY_WEAK': 1,
        'WEAK': 2,
        'MODERATE': 3,
        'STRONG': 4,
        'VERY_STRONG': 5
      };
      
      const signalStrengthValue = strengthValues[signal.strength] || 0;
      const minStrengthValue = strengthValues[options.minStrength] || 0;
      
      if (signalStrengthValue < minStrengthValue) {
        return false;
      }
    }
    
    // Filter by timeframe
    if (options.timeframes && options.timeframes.length > 0) {
      if (!options.timeframes.includes(signal.timeframe)) {
        return false;
      }
    }
    
    // Filter by reliability
    if (options.minReliability !== undefined) {
      const reliabilityValues: Record<string, number> = {
        'LOW': 1,
        'MEDIUM': 2,
        'HIGH': 3
      };
      
      const signalReliabilityValue = reliabilityValues[signal.reliability] || 0;
      const minReliabilityValue = reliabilityValues[options.minReliability] || 0;
      
      if (signalReliabilityValue < minReliabilityValue) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Broadcast signals to all subscribed clients
   * @param signals Signals to broadcast
   */
  broadcastSignals(signals: Signal[]): void {
    if (signals.length === 0) {
      return;
    }
    
    this.logger.info(`Broadcasting ${signals.length} signals to clients`);
    
    // Broadcast to all clients in the signals room
    this.io.emit('signals', {
      signals,
      timestamp: Date.now(),
      room: this.TOPICS.SIGNALS
    });
    
    // Also send individual signals to specific clients based on their filters
    for (const [clientId, client] of this.connectedClients.entries()) {
      try {
        // Skip unauthenticated clients
        if (!client.authenticated) {
          continue;
        }
        
        // Get all subscriptions for the signals topic
        const signalSubscriptions = Array.from(client.subscriptions.values())
          .filter(sub => sub.topic === this.TOPICS.SIGNALS);
        
        if (signalSubscriptions.length === 0) {
          continue;
        }
        
        // For each subscription, filter signals and send if any match
        for (const subscription of signalSubscriptions) {
          const filteredSignals = signals.filter(signal => 
            this.matchesFilter(signal, subscription.options)
          );
          
          if (filteredSignals.length > 0) {
            const socket = (this.io as any).sockets.sockets.get(client.socketId);
            
            if (socket) {
              socket.emit('filtered_signals', {
                subscriptionId: subscription.id,
                signals: filteredSignals,
                timestamp: Date.now()
              });
              
              this.logger.debug(`Sent ${filteredSignals.length} filtered signals to client ${clientId}`, {
                subscriptionId: subscription.id
              });
            }
          }
        }
      } catch (error) {
        this.logger.error(`Error sending signals to client ${clientId}`, { error });
      }
    }
  }

  /**
   * Send signals to a specific client
   * @param clientId Client ID
   * @param signals Signals to send
   */
  sendSignalsToClient(clientId: string, signals: Signal[]): void {
    if (signals.length === 0) {
      return;
    }
    
    const client = this.connectedClients.get(clientId);
    if (!client) {
      this.logger.warn(`Cannot send signals: Client ${clientId} not found`);
      return;
    }
    
    const socket = (this.io as any).sockets.sockets.get(client.socketId);
    
    if (!socket) {
      this.logger.warn(`Cannot send signals: Socket for client ${clientId} not found`);
      return;
    }
    
    socket.emit('signals', {
      signals,
      timestamp: Date.now()
    });
    
    this.logger.info(`Sent ${signals.length} signals to client ${clientId}`);
  }

  /**
   * Broadcast system message to all clients
   * @param message Message text
   * @param type Message type
   */
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.io.emit('system_message', {
      message,
      type,
      timestamp: Date.now(),
      room: this.TOPICS.SYSTEM
    });
    
    this.logger.info(`Broadcast system message: ${message}`, { type });
  }

  /**
   * Broadcast performance metrics
   * @param metrics Performance metrics object
   */
  broadcastPerformanceMetrics(metrics: any): void {
    this.io.emit('performance_metrics', {
      metrics,
      timestamp: Date.now(),
      room: this.TOPICS.PERFORMANCE
    });
    
    this.logger.debug('Broadcast performance metrics');
  }

  /**
   * Broadcast strategy update
   * @param strategy Strategy object
   */
  broadcastStrategyUpdate(strategy: any): void {
    this.io.emit('strategy_update', {
      strategy,
      timestamp: Date.now(),
      room: this.TOPICS.STRATEGY
    });
    
    this.logger.info(`Broadcast strategy update: ${strategy.id}`);
  }

  /**
   * Get connected clients count
   * @returns Number of connected clients
   */
  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  /**
   * Get authenticated clients count
   * @returns Number of authenticated clients
   */
  getAuthenticatedClientsCount(): number {
    return Array.from(this.connectedClients.values())
      .filter(client => client.authenticated)
      .length;
  }

  /**
   * Close WebSocket server
   */
  close(): void {
    this.stopHeartbeat();
    
    // Disconnect all clients
    for (const [clientId, client] of this.connectedClients.entries()) {
      const socket = (this.io as any).sockets.sockets.get(client.socketId);
      
      if (socket) {
        socket.disconnect(true);
      }
    }
    
    // Clear clients
    this.connectedClients.clear();
    
    this.logger.info('WebSocket service closed');
  }
} 