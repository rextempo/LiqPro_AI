/**
 * WebSocket Service
 * Provides real-time signal broadcasting and client connection management
 */
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Signal, SignalSubscriptionOptions } from '../types';
import { Logger } from 'winston';
import { v4 as uuidv4 } from 'uuid';
import { BatchProcessor } from './batch-processor';
import { ConnectionPool } from './connection-pool';
import { SessionManager } from '../utils/session-manager';

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
  sessionId: string;
  ip: string;
  userAgent: string;
  authenticated: boolean;
  connectedAt: number;
  lastActivity: number;
  subscriptions: Map<string, ClientSubscription>;
  socket: Socket; // Store socket reference
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
  // Add signal expiration check interval
  private signalExpirationInterval: NodeJS.Timeout | null = null;
  private readonly SIGNAL_EXPIRATION_CHECK_INTERVAL = 60000; // 1 minute
  
  // Add batch processor and connection pool
  private batchProcessor: BatchProcessor;
  private connectionPool: ConnectionPool;
  private sessionManager: SessionManager;

  /**
   * Constructor
   * @param server HTTP server instance
   * @param logger Logger instance
   * @param options Options
   */
  constructor(
    server: HttpServer, 
    logger: Logger, 
    options: { 
      apiKeys?: string[]; 
      batchSize?: number; 
      batchWaitTime?: number;
      maxConnections?: number;
      maxConnectionsPerIP?: number;
      sessionTTL?: number;
      debug?: boolean;
    } = {}
  ) {
    this.logger = logger;
    
    // Set API keys
    this.apiKeys = options.apiKeys || [];
    
    // Initialize Socket.IO server
    this.io = new SocketIOServer(server, {
      path: '/ws',
      serveClient: false,
      pingInterval: 10000,
      pingTimeout: 5000,
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      }
    });
    
    // Initialize batch processor
    this.batchProcessor = new BatchProcessor({
      maxBatchSize: options.batchSize || 100,
      maxWaitTime: options.batchWaitTime || 1000,
      processingFn: this.processBatchedSignals.bind(this),
      debug: options.debug
    });
    
    // Initialize connection pool
    this.connectionPool = new ConnectionPool({
      maxConnections: options.maxConnections || 1000,
      maxConnectionsPerIP: options.maxConnectionsPerIP || 10,
      connectionTimeout: 10000,
      inactiveTimeout: this.INACTIVE_TIMEOUT,
      debug: options.debug
    });
    
    // Initialize session manager
    this.sessionManager = new SessionManager({
      sessionTTL: options.sessionTTL || 3600000, // 1 hour
      debug: options.debug
    });
    
    // Set up event handlers
    this.setupEventHandlers();
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Start signal expiration check
    this.startSignalExpirationCheck();
    
    this.logger.info('WebSocket service initialized', {
      apiKeys: this.apiKeys.length > 0 ? `${this.apiKeys.length} keys configured` : 'No API keys configured',
      batchSize: options.batchSize || 100,
      batchWaitTime: options.batchWaitTime || 1000,
      maxConnections: options.maxConnections || 1000,
      maxConnectionsPerIP: options.maxConnectionsPerIP || 10,
      sessionTTL: options.sessionTTL || 3600000
    });
  }

  /**
   * Set up event handlers
   */
  private setupEventHandlers(): void {
    this.io.on('connection', (socket: Socket) => {
      // Get client info
      const clientId = socket.handshake.query.clientId as string || uuidv4();
      const sessionId = socket.handshake.query.sessionId as string || '';
      const ip = socket.handshake.headers['x-forwarded-for'] as string || socket.handshake.address;
      const userAgent = socket.handshake.headers['user-agent'] as string || 'unknown';
      
      // Check if connection is allowed
      if (!this.connectionPool.addConnection(socket, ip, userAgent)) {
        this.logger.warn('Connection rejected due to connection limits', {
          clientId,
          ip,
          userAgent
        });
        
        socket.emit('connection_error', {
          message: 'Connection rejected due to connection limits'
        });
        
        socket.disconnect(true);
        return;
      }
      
      // Create client connection
      const clientConnection: ClientConnection = {
        socketId: socket.id,
        clientId,
        sessionId: '',
        ip,
        userAgent,
        authenticated: false,
        connectedAt: Date.now(),
        lastActivity: Date.now(),
        subscriptions: new Map(),
        socket
      };
      
      // Add to connected clients
      this.connectedClients.set(socket.id, clientConnection);
      
      this.logger.info('Client connected', {
        socketId: socket.id,
        clientId,
        ip,
        userAgent,
        sessionId: sessionId || 'new session'
      });
      
      // Send connection info
      socket.emit('connection_info', {
        clientId,
        socketId: socket.id,
        connectedAt: clientConnection.connectedAt,
        authenticated: false,
        sessionId: ''
      });
      
      // Try to restore session if sessionId provided
      if (sessionId) {
        this.restoreSession(socket, clientId, sessionId);
      } else {
        // Create new session
        const newSessionId = this.sessionManager.createSession(clientId, {
          ip,
          userAgent
        });
        
        // Update client connection
        clientConnection.sessionId = newSessionId;
        this.connectedClients.set(socket.id, clientConnection);
        
        // Send updated connection info
        socket.emit('connection_info', {
          clientId,
          socketId: socket.id,
          connectedAt: clientConnection.connectedAt,
          authenticated: false,
          sessionId: newSessionId
        });
      }
      
      // Set up client event handlers
      socket.on('authenticate', (data, callback) => {
        this.handleAuthenticate(socket, clientId, data, callback);
      });
      
      socket.on('subscribe', (data, callback) => {
        this.handleSubscribe(socket, clientId, data, callback);
      });
      
      socket.on('unsubscribe', (data, callback) => {
        this.handleUnsubscribe(socket, clientId, data, callback);
      });
      
      socket.on('get_subscriptions', (callback) => {
        this.handleGetSubscriptions(socket, clientId, callback);
      });
      
      socket.on('disconnect', () => {
        this.handleDisconnect(socket);
      });
    });
  }

  /**
   * Restore client session
   * @param socket Client socket
   * @param clientId Client ID
   * @param sessionId Session ID
   */
  private restoreSession(socket: Socket, clientId: string, sessionId: string): void {
    // Get session data
    const sessionData = this.sessionManager.getSession(sessionId);
    
    if (!sessionData) {
      this.logger.warn('Session not found, creating new session', {
        clientId,
        sessionId
      });
      
      // Create new session
      const newSessionId = this.sessionManager.createSession(clientId, {
        ip: socket.handshake.headers['x-forwarded-for'] as string || socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'] as string || 'unknown'
      });
      
      // Update client connection
      const clientConnection = this.connectedClients.get(socket.id);
      if (clientConnection) {
        clientConnection.sessionId = newSessionId;
        this.connectedClients.set(socket.id, clientConnection);
      }
      
      // Send updated connection info
      socket.emit('connection_info', {
        clientId,
        socketId: socket.id,
        connectedAt: Date.now(),
        authenticated: false,
        sessionId: newSessionId,
        restored: false
      });
      
      return;
    }
    
    // Verify client ID
    if (sessionData.clientId !== clientId) {
      this.logger.warn('Session client ID mismatch', {
        sessionClientId: sessionData.clientId,
        providedClientId: clientId,
        sessionId
      });
      
      // Create new session
      const newSessionId = this.sessionManager.createSession(clientId, {
        ip: socket.handshake.headers['x-forwarded-for'] as string || socket.handshake.address,
        userAgent: socket.handshake.headers['user-agent'] as string || 'unknown'
      });
      
      // Update client connection
      const clientConnection = this.connectedClients.get(socket.id);
      if (clientConnection) {
        clientConnection.sessionId = newSessionId;
        this.connectedClients.set(socket.id, clientConnection);
      }
      
      // Send updated connection info
      socket.emit('connection_info', {
        clientId,
        socketId: socket.id,
        connectedAt: Date.now(),
        authenticated: false,
        sessionId: newSessionId,
        restored: false
      });
      
      return;
    }
    
    // Update client connection
    const clientConnection = this.connectedClients.get(socket.id);
    if (clientConnection) {
      clientConnection.sessionId = sessionId;
      clientConnection.authenticated = sessionData.authenticated;
      
      // Restore subscriptions
      for (const subscription of sessionData.subscriptions) {
        clientConnection.subscriptions.set(subscription.id, {
          id: subscription.id,
          topic: subscription.topic,
          options: subscription.options,
          createdAt: subscription.createdAt
        });
      }
      
      this.connectedClients.set(socket.id, clientConnection);
      
      // Update connection pool
      if (sessionData.authenticated) {
        this.connectionPool.setAuthenticated(socket.id);
      }
      
      this.logger.info('Session restored', {
        clientId,
        sessionId,
        authenticated: sessionData.authenticated,
        subscriptions: sessionData.subscriptions.length
      });
      
      // Send updated connection info
      socket.emit('connection_info', {
        clientId,
        socketId: socket.id,
        connectedAt: clientConnection.connectedAt,
        authenticated: sessionData.authenticated,
        sessionId,
        restored: true,
        subscriptions: Array.from(clientConnection.subscriptions.values())
      });
    }
  }

  /**
   * Handle authenticate event
   */
  private handleAuthenticate(socket: Socket, clientId: string, data: { apiKey: string }, callback: (response: { success: boolean; message?: string }) => void): void {
    try {
      const client = this.connectedClients.get(clientId);
      
      if (!client) {
        this.logger.warn(`Client record not found for ${clientId}`);
        if (typeof callback === 'function') {
          callback({
            success: false,
            message: 'Client record not found'
          });
        }
        return;
      }

      // Validate API key
      if (!data.apiKey || !this.apiKeys.includes(data.apiKey)) {
        this.logger.warn(`Authentication failed for client ${clientId}: Invalid API key`);
        
        if (typeof callback === 'function') {
          callback({
            success: false,
            message: 'Invalid API key'
          });
        }
        return;
      }
      
      // Update client record
      client.authenticated = true;
      client.lastActivity = Date.now();
      
      // Update connection pool
      this.connectionPool.setAuthenticated(socket.id);
      
      this.logger.info(`Client ${clientId} authenticated successfully`);
      
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
          message: 'Error processing authentication request'
        });
      }
    }
  }

  /**
   * Handle subscribe event
   */
  private handleSubscribe(socket: Socket, clientId: string, data: { topic: string; options?: SignalSubscriptionOptions }, callback: (response: { success: boolean; subscriptionId?: string; message?: string }) => void): void {
    try {
      const client = this.connectedClients.get(clientId);
      
      if (!client) {
        this.logger.warn(`Client record not found for ${clientId}`);
        if (typeof callback === 'function') {
          callback({
            success: false,
            message: 'Client record not found'
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
            message: 'Invalid topic'
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
      
      // Update activity
      client.lastActivity = Date.now();
      this.connectionPool.updateActivity(socket.id);
      
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
          message: 'Error processing subscription request'
        });
      }
    }
  }

  /**
   * Handle unsubscribe event
   */
  private handleUnsubscribe(socket: Socket, clientId: string, data: { subscriptionId: string }, callback: (response: { success: boolean; message?: string }) => void): void {
    try {
      const client = this.connectedClients.get(clientId);
      
      if (!client) {
        this.logger.warn(`Client record not found for ${clientId}`);
        if (typeof callback === 'function') {
          callback({
            success: false,
            message: 'Client record not found'
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
            message: 'Subscription not found'
          });
        }
        return;
      }

      // Remove subscription
      client.subscriptions.delete(data.subscriptionId);
      
      // Update activity
      client.lastActivity = Date.now();
      this.connectionPool.updateActivity(socket.id);
      
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
          message: 'Error processing unsubscribe request'
        });
      }
    }
  }

  /**
   * Handle get_subscriptions event
   */
  private handleGetSubscriptions(socket: Socket, clientId: string, callback: (response: { success: boolean; subscriptions?: ClientSubscription[]; message?: string }) => void): void {
    try {
      const client = this.connectedClients.get(clientId);
      
      if (!client) {
        this.logger.warn(`Client record not found for ${clientId}`);
        if (typeof callback === 'function') {
          callback({
            success: false,
            message: 'Client record not found'
          });
        }
        return;
      }

      const subscriptions = Array.from(client.subscriptions.values()).map(sub => ({
        id: sub.id,
        topic: sub.topic,
        options: sub.options,
        createdAt: sub.createdAt
      }));
      
      // Update activity
      client.lastActivity = Date.now();
      this.connectionPool.updateActivity(socket.id);
      
      if (typeof callback === 'function') {
        callback({
          success: true,
          subscriptions
        });
      }
    } catch (error) {
      this.logger.error(`Error retrieving subscriptions`, { error, clientId });
      
      if (typeof callback === 'function') {
        callback({
          success: false,
          message: 'Error retrieving subscriptions'
        });
      }
    }
  }

  /**
   * Start signal expiration check interval
   */
  private startSignalExpirationCheck(): void {
    if (this.signalExpirationInterval) {
      clearInterval(this.signalExpirationInterval);
    }

    this.signalExpirationInterval = setInterval(() => {
      this.checkExpiredSignals();
    }, this.SIGNAL_EXPIRATION_CHECK_INTERVAL);

    this.logger.info('Signal expiration check started', {
      interval: this.SIGNAL_EXPIRATION_CHECK_INTERVAL
    });
  }

  /**
   * Check for expired signals and notify clients
   */
  private checkExpiredSignals(): void {
    const now = Date.now();
    const expiredSignals: Signal[] = [];

    // In a real implementation, this would query the database or cache
    // for signals that have expired but haven't been processed yet
    // For now, we'll just log that the check was performed

    this.logger.debug('Checking for expired signals', {
      timestamp: now
    });

    if (expiredSignals.length > 0) {
      this.broadcastExpiredSignals(expiredSignals);
    }
  }

  /**
   * Broadcast expired signals to relevant clients
   * @param signals Expired signals
   */
  private broadcastExpiredSignals(signals: Signal[]): void {
    this.logger.info('Broadcasting expired signals', {
      count: signals.length
    });

    // Create a special event for expired signals
    this.io.emit('expired_signals', {
      signals,
      timestamp: Date.now()
    });
  }

  /**
   * Generate a unique subscription ID
   * @returns Subscription ID
   */
  private generateSubscriptionId(): string {
    return uuidv4();
  }

  /**
   * Match signal against filter options
   * @param signal Signal to match
   * @param options Filter options
   * @returns Whether signal matches filter
   */
  private matchesFilter(signal: Signal, options: SignalSubscriptionOptions): boolean {
    // If no options provided, match all signals
    if (!options || Object.keys(options).length === 0) {
      return true;
    }

    // Check pool addresses
    if (options.poolAddresses && options.poolAddresses.length > 0) {
      if (!options.poolAddresses.includes(signal.poolAddress)) {
        return false;
      }
    }

    // Check signal types
    if (options.signalTypes && options.signalTypes.length > 0) {
      if (!options.signalTypes.includes(signal.type)) {
        return false;
      }
    }

    // Check minimum strength
    if (options.minStrength !== undefined) {
      if (signal.strength < options.minStrength) {
        return false;
      }
    }

    // Check timeframes
    if (options.timeframes && options.timeframes.length > 0) {
      if (!options.timeframes.includes(signal.timeframe)) {
        return false;
      }
    }

    // Check minimum reliability
    if (options.minReliability !== undefined) {
      if (signal.reliability < options.minReliability) {
        return false;
      }
    }

    // Check timestamp range - new implementation
    if (options.fromTimestamp !== undefined) {
      if (signal.timestamp < options.fromTimestamp) {
        return false;
      }
    }

    if (options.toTimestamp !== undefined) {
      if (signal.timestamp > options.toTimestamp) {
        return false;
      }
    }

    // Check if signal is expired
    if (signal.expirationTimestamp !== undefined) {
      const now = Date.now();
      if (signal.expirationTimestamp < now) {
        return false;
      }
    }

    // Check metadata filters if provided
    if (options.metadata && Object.keys(options.metadata).length > 0) {
      // If signal has no metadata, it doesn't match
      if (!signal.metadata) {
        return false;
      }

      // Check each metadata key-value pair
      for (const [key, value] of Object.entries(options.metadata)) {
        // If key doesn't exist or value doesn't match, signal doesn't match
        if (signal.metadata[key] === undefined || signal.metadata[key] !== value) {
          return false;
        }
      }
    }

    // All filters passed
    return true;
  }

  /**
   * Start heartbeat interval
   */
  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.checkClientActivity();
      this.sendHeartbeat();
    }, this.HEARTBEAT_INTERVAL);
    
    this.logger.info('Heartbeat started', {
      interval: this.HEARTBEAT_INTERVAL
    });
  }

  /**
   * Check client activity and disconnect inactive clients
   */
  private checkClientActivity(): void {
    const now = Date.now();
    
    for (const [clientId, client] of this.connectedClients.entries()) {
      const inactiveTime = now - client.lastActivity;
      
      if (inactiveTime > this.INACTIVE_TIMEOUT) {
        this.logger.info(`Disconnecting inactive client: ${clientId}`, {
          inactiveTime,
          timeout: this.INACTIVE_TIMEOUT
        });
        
        // Disconnect client
        if (client.socket) {
          client.socket.disconnect(true);
        }
        
        // Remove from connected clients
        this.connectedClients.delete(clientId);
      }
    }
  }

  /**
   * Send heartbeat to all connected clients
   */
  private sendHeartbeat(): void {
    this.io.emit('heartbeat', {
      timestamp: Date.now()
    });
    
    this.logger.debug('Heartbeat sent to all clients');
  }

  /**
   * Process batched signals
   * @param signals Signals to process
   */
  private async processBatchedSignals(signals: Signal[]): Promise<void> {
    if (!signals || signals.length === 0) {
      return;
    }

    this.logger.info('Processing batched signals', {
      count: signals.length
    });

    // Filter out expired signals
    const now = Date.now();
    const validSignals = signals.filter(signal => 
      !signal.expirationTimestamp || signal.expirationTimestamp > now
    );

    if (validSignals.length === 0) {
      this.logger.info('All signals in batch are expired, nothing to broadcast');
      return;
    }

    // Broadcast to all clients with topic subscription
    for (const client of Array.from(this.connectedClients.values())) {
      // Skip unauthenticated clients
      if (!client.authenticated) {
        continue;
      }

      // Update last activity
      client.lastActivity = Date.now();
      this.connectionPool.updateActivity(client.socketId);

      // Check if client has any subscriptions to the signals topic
      const signalSubscriptions = Array.from(client.subscriptions.values())
        .filter(sub => sub.topic === this.TOPICS.SIGNALS);

      if (signalSubscriptions.length === 0) {
        continue;
      }

      // Process each subscription
      for (const subscription of signalSubscriptions) {
        // If subscription has filter options
        if (Object.keys(subscription.options).length > 0) {
          // Filter signals based on subscription options
          const filteredSignals = validSignals.filter(signal => 
            this.matchesFilter(signal, subscription.options)
          );

          if (filteredSignals.length > 0 && client.socket) {
            // Send filtered signals to client
            client.socket.emit('filtered_signals', {
              subscriptionId: subscription.id,
              signals: filteredSignals,
              timestamp: Date.now()
            });
          }
        } else {
          // No filter options, send all signals
          if (client.socket) {
            client.socket.emit('signals', {
              signals: validSignals,
              timestamp: Date.now()
            });
          }
        }
      }
    }
  }

  /**
   * Broadcast signals to all connected clients
   * @param signals Signals to broadcast
   */
  broadcastSignals(signals: Signal[]): void {
    if (!signals || signals.length === 0) {
      return;
    }

    this.logger.info('Broadcasting signals', {
      count: signals.length
    });

    // Add signals to batch processor
    this.batchProcessor.add(signals);
  }

  /**
   * Send signals to a specific client
   * @param clientId Client ID
   * @param signals Signals to send
   */
  sendSignalsToClient(clientId: string, signals: Signal[]): void {
    if (!signals || signals.length === 0) {
      return;
    }
    
    const client = this.connectedClients.get(clientId);
    if (!client || !client.authenticated || !client.socket) {
      return;
    }
    
    this.logger.info(`Sending ${signals.length} signals to client ${clientId}`);
    
    // Update last activity
    client.lastActivity = Date.now();
    this.connectionPool.updateActivity(client.socketId);
    
    // Send signals
    client.socket.emit('signals', {
      signals,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast system message to all connected clients
   * @param message Message to broadcast
   * @param type Message type
   */
  broadcastSystemMessage(message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.logger.info(`Broadcasting system message: ${message}`, { type });
    
    this.io.emit('system', {
      message,
      type,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast performance metrics to all connected clients
   * @param metrics Performance metrics
   */
  broadcastPerformanceMetrics(metrics: Record<string, unknown>): void {
    this.logger.info('Broadcasting performance metrics');
    
    this.io.emit('performance', {
      metrics,
      timestamp: Date.now()
    });
  }

  /**
   * Broadcast strategy update to all connected clients
   * @param strategy Strategy update
   */
  broadcastStrategyUpdate(strategy: Record<string, unknown>): void {
    this.logger.info(`Broadcasting strategy update: ${strategy.id}`);
    
    this.io.emit('strategy', {
      strategy,
      timestamp: Date.now()
    });
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
    return this.connectionPool.getStats().authenticatedConnections;
  }

  /**
   * Get total subscriptions count
   * @returns Total number of subscriptions
   */
  getTotalSubscriptionsCount(): number {
    let count = 0;
    
    for (const client of this.connectedClients.values()) {
      count += client.subscriptions.size;
    }
    
    return count;
  }

  /**
   * Get subscriptions by topic
   * @returns Map of topic to subscription count
   */
  getSubscriptionsByTopic(): Map<string, number> {
    const topicCounts = new Map<string, number>();
    
    // Initialize counts for all topics
    for (const topic of Object.values(this.TOPICS)) {
      topicCounts.set(topic, 0);
    }
    
    // Count subscriptions by topic
    for (const client of this.connectedClients.values()) {
      for (const subscription of client.subscriptions.values()) {
        const currentCount = topicCounts.get(subscription.topic) || 0;
        topicCounts.set(subscription.topic, currentCount + 1);
      }
    }
    
    return topicCounts;
  }

  /**
   * Get connection pool stats
   * @returns Connection pool stats
   */
  getConnectionPoolStats(): Record<string, unknown> {
    const stats = this.connectionPool.getStats();
    // Convert Map to object for serialization
    const connectionsByIP: Record<string, number> = {};
    stats.connectionsByIP.forEach((count, ip) => {
      connectionsByIP[ip] = count;
    });
    
    return {
      totalConnections: stats.totalConnections,
      activeConnections: stats.activeConnections,
      authenticatedConnections: stats.authenticatedConnections,
      connectionsByIP,
      avgConnectionAge: stats.avgConnectionAge,
      oldestConnection: stats.oldestConnection,
      newestConnection: stats.newestConnection
    };
  }

  /**
   * Get batch processor stats
   * @returns Batch processor stats
   */
  getBatchProcessorStats(): Record<string, unknown> {
    return this.batchProcessor.getStats();
  }

  /**
   * Handle disconnect event
   * @param socket Client socket
   */
  private handleDisconnect(socket: Socket): void {
    // Get client connection
    const clientConnection = this.connectedClients.get(socket.id);
    if (!clientConnection) {
      return;
    }
    
    // Save session data before removing client
    if (clientConnection.sessionId) {
      // Update session with latest subscriptions
      const subscriptions = Array.from(clientConnection.subscriptions.values()).map(sub => ({
        id: sub.id,
        topic: sub.topic,
        options: sub.options,
        createdAt: sub.createdAt
      }));
      
      this.sessionManager.updateSession(clientConnection.sessionId, {
        subscriptions,
        authenticated: clientConnection.authenticated
      });
      
      this.logger.info('Session updated on disconnect', {
        clientId: clientConnection.clientId,
        sessionId: clientConnection.sessionId,
        subscriptions: subscriptions.length
      });
    }
    
    // Remove from connection pool
    this.connectionPool.removeConnection(socket.id);
    
    // Remove from connected clients
    this.connectedClients.delete(socket.id);
    
    this.logger.info('Client disconnected', {
      socketId: socket.id,
      clientId: clientConnection.clientId
    });
  }

  /**
   * Get session manager stats
   * @returns Session manager stats
   */
  getSessionManagerStats(): Record<string, unknown> {
    return this.sessionManager.getStats();
  }

  /**
   * Close WebSocket service
   */
  close(): void {
    // Stop intervals
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
    
    if (this.signalExpirationInterval) {
      clearInterval(this.signalExpirationInterval);
      this.signalExpirationInterval = null;
    }
    
    // Close connection pool
    this.connectionPool.close();
    
    // Close session manager
    this.sessionManager.close();
    
    // Close Socket.IO server
    this.io.close();
    
    this.logger.info('WebSocket service closed');
  }
} 