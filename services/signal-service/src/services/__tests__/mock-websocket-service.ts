/**
 * Mock WebSocket Service for testing
 */
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Signal } from '../../types/signal';
import { Logger } from 'winston';
import { SignalType } from '../../types';

export class WebSocketService {
  private io: SocketIOServer;
  private logger: Logger;
  private connectedClients: Map<string, any> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;
  
  // Expose clients for testing
  public clients: Record<string, any> = {};
  
  // API keys for testing
  private apiKeys: string[] = ['valid-api-key', 'test-api-key'];

  constructor(server: HttpServer, logger: Logger) {
    this.logger = logger;
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/socket.io'
    });

    this.setupEventHandlers();
    this.startHeartbeat();
    
    logger.info('WebSocket service initialized');
  }

  private setupEventHandlers(): void {
    this.io.on('connection', (socket) => {
      const clientId = socket.id;
      
      this.logger.info(`Client connected: ${clientId}`);
      
      // Store client
      const client = {
        id: clientId,
        socket,
        authenticated: false,
        subscriptions: [],
        lastActivity: Date.now()
      };
      
      this.connectedClients.set(clientId, client);
      this.clients[clientId] = client;
      
      // Send connection info
      socket.emit('connection_info', {
        clientId,
        topics: ['signals', 'system', 'performance', 'strategy']
      });
      
      // Authentication
      socket.on('authenticate', (data, callback) => {
        const client = this.connectedClients.get(clientId);
        
        if (!client) {
          callback({ success: false, error: 'Client not found' });
          return;
        }
        
        if (!data.apiKey) {
          callback({ success: false, error: 'API key is required' });
          return;
        }
        
        // Check API key
        if (!this.apiKeys.includes(data.apiKey)) {
          callback({ success: false, error: 'Invalid API key' });
          return;
        }
        
        client.authenticated = true;
        
        this.logger.info(`Client authenticated: ${clientId}`);
        
        callback({ success: true });
      });
      
      // Subscribe
      socket.on('subscribe', (data, callback) => {
        const client = this.connectedClients.get(clientId);
        
        if (!client) {
          callback({ success: false, error: 'Client not found' });
          return;
        }
        
        if (!client.authenticated) {
          callback({ success: false, error: 'Authentication required' });
          return;
        }
        
        const subscriptionId = `sub_${Date.now()}`;
        
        client.subscriptions.push({
          id: subscriptionId,
          topic: data.topic,
          options: data.options || {},
          createdAt: Date.now()
        });
        
        socket.join(data.topic);
        
        this.logger.info(`Client ${clientId} subscribed to ${data.topic}`);
        
        callback({ success: true, subscriptionId });
      });
      
      // Unsubscribe
      socket.on('unsubscribe', (data, callback) => {
        const client = this.connectedClients.get(clientId);
        
        if (!client) {
          callback({ success: false, error: 'Client not found' });
          return;
        }
        
        if (!client.authenticated) {
          callback({ success: false, error: 'Authentication required' });
          return;
        }
        
        const index = client.subscriptions.findIndex(sub => sub.id === data.subscriptionId);
        
        if (index === -1) {
          callback({ success: false, error: 'Subscription not found' });
          return;
        }
        
        const subscription = client.subscriptions[index];
        
        client.subscriptions.splice(index, 1);
        
        // Check if client has no more subscriptions to this topic
        const hasMoreSubscriptionsToTopic = client.subscriptions.some(sub => sub.topic === subscription.topic);
        
        if (!hasMoreSubscriptionsToTopic) {
          socket.leave(subscription.topic);
        }
        
        this.logger.info(`Client ${clientId} unsubscribed from ${subscription.topic}`);
        
        callback({ success: true });
      });
      
      // Get subscriptions
      socket.on('getSubscriptions', (callback) => {
        const client = this.connectedClients.get(clientId);
        
        if (!client) {
          callback({ success: false, error: 'Client not found' });
          return;
        }
        
        if (!client.authenticated) {
          callback({ success: false, error: 'Authentication required' });
          return;
        }
        
        callback({ success: true, subscriptions: client.subscriptions });
      });
      
      // Heartbeat response
      socket.on('pong', () => {
        const client = this.connectedClients.get(clientId);
        
        if (client) {
          client.lastActivity = Date.now();
        }
      });
      
      // Disconnect
      socket.on('disconnect', () => {
        this.logger.info(`Client disconnected: ${clientId}`);
        this.connectedClients.delete(clientId);
        delete this.clients[clientId];
      });
    });
  }

  startHeartbeat(interval: number = 30000): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    this.heartbeatInterval = setInterval(() => {
      this.io.emit('ping', { timestamp: Date.now() });
    }, interval);
    
    this.logger.info(`Heartbeat started with interval ${interval}ms`);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
      this.logger.info('Heartbeat stopped');
    }
  }

  broadcastSignals(signals: Signal[]): void {
    if (signals.length === 0) {
      return;
    }
    
    this.logger.info(`Broadcasting ${signals.length} signals`);
    
    // Broadcast to all clients
    this.io.emit('signals', {
      signals,
      timestamp: Date.now()
    });
    
    // Also send filtered signals to clients with filter options
    for (const [clientId, client] of this.connectedClients.entries()) {
      if (!client.authenticated) {
        continue;
      }
      
      // Find signal subscriptions with filter options
      const signalSubscriptions = client.subscriptions.filter(
        (sub: any) => sub.topic === 'signals' && sub.options
      );
      
      this.logger.info(`Client ${clientId} has ${signalSubscriptions.length} signal subscriptions with options`);
      
      // Send filtered signals for each subscription
      for (const subscription of signalSubscriptions) {
        if (!subscription.options) {
          continue;
        }
        
        // Filter signals based on subscription options
        const filteredSignals = this.filterSignals(signals, subscription.options);
        
        if (filteredSignals.length > 0) {
          this.logger.info(`Sending ${filteredSignals.length} filtered signals to client ${clientId} for subscription ${subscription.id}`);
          
          client.socket.emit('filtered_signals', {
            subscriptionId: subscription.id,
            signals: filteredSignals
          });
        }
      }
    }
  }
  
  private filterSignals(signals: Signal[], options: any): Signal[] {
    // For debugging
    this.logger.info(`Filtering signals with options: ${JSON.stringify(options)}`);
    this.logger.info(`Signals before filtering: ${JSON.stringify(signals.map((s: any) => ({ id: s.id, type: s.type, poolAddress: s.poolAddress })))}`);
    
    // Filter signals based on options
    const filtered = signals.filter(signal => {
      // Filter by signal type
      if (options.signalTypes && options.signalTypes.length > 0) {
        if (!options.signalTypes.includes(signal.type)) {
          this.logger.info(`Signal ${signal.id} filtered out: type ${signal.type} not in ${options.signalTypes}`);
          return false;
        }
      }
      
      // Filter by pool address
      if (options.poolAddresses && options.poolAddresses.length > 0) {
        if (!options.poolAddresses.includes(signal.poolAddress)) {
          this.logger.info(`Signal ${signal.id} filtered out: poolAddress ${signal.poolAddress} not in ${options.poolAddresses}`);
          return false;
        }
      }
      
      // Filter by timeframe
      if (options.timeframes && options.timeframes.length > 0) {
        if (!options.timeframes.includes(signal.timeframe)) {
          this.logger.info(`Signal ${signal.id} filtered out: timeframe ${signal.timeframe} not in ${options.timeframes}`);
          return false;
        }
      }
      
      // Filter by minimum strength
      if (options.minStrength !== undefined) {
        if (signal.strength < options.minStrength) {
          this.logger.info(`Signal ${signal.id} filtered out: strength ${signal.strength} < ${options.minStrength}`);
          return false;
        }
      }
      
      // Filter by minimum reliability
      if (options.minReliability !== undefined) {
        if (signal.reliability < options.minReliability) {
          this.logger.info(`Signal ${signal.id} filtered out: reliability ${signal.reliability} < ${options.minReliability}`);
          return false;
        }
      }
      
      this.logger.info(`Signal ${signal.id} passed all filters`);
      return true;
    });
    
    // For debugging
    this.logger.info(`Signals after filtering: ${JSON.stringify(filtered.map((s: any) => ({ id: s.id, type: s.type, poolAddress: s.poolAddress })))}`);
    
    return filtered;
  }

  broadcastSystemMessage(message: string, type: string = 'info'): void {
    this.io.emit('system_message', {
      message,
      type,
      timestamp: Date.now()
    });
    
    this.logger.info(`Broadcast system message: ${message}`);
  }

  getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  close(): void {
    this.stopHeartbeat();
    
    // Disconnect all clients
    for (const [clientId, client] of this.connectedClients.entries()) {
      client.socket.disconnect(true);
    }
    
    // Clear clients
    this.connectedClients.clear();
    this.clients = {};
    
    this.logger.info('WebSocket service closed');
  }
} 