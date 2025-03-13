/**
 * Simple WebSocket Service for testing
 */
import { Server as SocketIOServer } from 'socket.io';
import { Server as HttpServer } from 'http';
import { Signal } from '../../types/signal';
import { Logger } from 'winston';
import { SignalType } from '../../types';

export class WebSocketService {
  private io: SocketIOServer;
  private logger: Logger;
  private clients: Record<string, any> = {};
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private apiKeys = ['valid-api-key', 'test-api-key'];

  constructor(server: HttpServer, logger: Logger) {
    this.logger = logger;
    
    this.io = new SocketIOServer(server, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST']
      },
      path: '/socket.io'
    });

    this.io.on('connection', this.handleConnection.bind(this));
    this.startHeartbeat();
    
    logger.info('WebSocket service initialized');
  }

  private handleConnection(socket: any): void {
    const clientId = socket.id;
    
    this.logger.info(`Client connected: ${clientId}`);
    
    // Store client
    this.clients[clientId] = {
      id: clientId,
      socket,
      authenticated: false,
      subscriptions: []
    };
    
    // Send connection info
    socket.emit('connection_info', {
      clientId,
      topics: ['signals', 'system', 'performance', 'strategy']
    });
    
    // Set up event handlers
    socket.on('authenticate', this.handleAuthenticate(clientId));
    socket.on('subscribe', this.handleSubscribe(clientId));
    socket.on('unsubscribe', this.handleUnsubscribe(clientId));
    socket.on('getSubscriptions', this.handleGetSubscriptions(clientId));
    socket.on('disconnect', () => this.handleDisconnect(clientId));
  }

  private handleAuthenticate(clientId: string) {
    return (data: { apiKey: string }, callback: Function) => {
      const client = this.clients[clientId];
      
      if (!client) {
        callback({ success: false, error: 'Client not found' });
        return;
      }
      
      if (!data.apiKey) {
        callback({ success: false, error: 'API key is required' });
        return;
      }
      
      if (!this.apiKeys.includes(data.apiKey)) {
        callback({ success: false, error: 'Invalid API key' });
        return;
      }
      
      client.authenticated = true;
      
      this.logger.info(`Client authenticated: ${clientId}`);
      
      callback({ success: true });
    };
  }

  private handleSubscribe(clientId: string) {
    return (data: { topic: string, options?: any }, callback: Function) => {
      const client = this.clients[clientId];
      
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
      
      client.socket.join(data.topic);
      
      this.logger.info(`Client ${clientId} subscribed to ${data.topic}`);
      
      callback({ success: true, subscriptionId });
    };
  }

  private handleUnsubscribe(clientId: string) {
    return (data: { subscriptionId: string }, callback: Function) => {
      const client = this.clients[clientId];
      
      if (!client) {
        callback({ success: false, error: 'Client not found' });
        return;
      }
      
      if (!client.authenticated) {
        callback({ success: false, error: 'Authentication required' });
        return;
      }
      
      const index = client.subscriptions.findIndex((sub: any) => sub.id === data.subscriptionId);
      
      if (index === -1) {
        callback({ success: false, error: 'Subscription not found' });
        return;
      }
      
      const subscription = client.subscriptions[index];
      
      client.subscriptions.splice(index, 1);
      
      // Check if client has no more subscriptions to this topic
      const hasMoreSubscriptionsToTopic = client.subscriptions.some((sub: any) => sub.topic === subscription.topic);
      
      if (!hasMoreSubscriptionsToTopic) {
        client.socket.leave(subscription.topic);
      }
      
      this.logger.info(`Client ${clientId} unsubscribed from ${subscription.topic}`);
      
      callback({ success: true });
    };
  }

  private handleGetSubscriptions(clientId: string) {
    return (callback: Function) => {
      const client = this.clients[clientId];
      
      if (!client) {
        callback({ success: false, error: 'Client not found' });
        return;
      }
      
      if (!client.authenticated) {
        callback({ success: false, error: 'Authentication required' });
        return;
      }
      
      callback({ success: true, subscriptions: client.subscriptions });
    };
  }

  private handleDisconnect(clientId: string): void {
    this.logger.info(`Client disconnected: ${clientId}`);
    delete this.clients[clientId];
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
    
    // Send signals to clients based on their subscriptions
    Object.values(this.clients).forEach(client => {
      if (!client.authenticated) {
        return;
      }
      
      // Find signal subscriptions
      const signalSubscriptions = client.subscriptions.filter((sub: any) => sub.topic === 'signals');
      
      this.logger.info(`Client ${client.id} has ${signalSubscriptions.length} signal subscriptions`);
      
      // Send signals for each subscription
      signalSubscriptions.forEach((subscription: any) => {
        if (subscription.options && Object.keys(subscription.options).length > 0) {
          // Filter signals based on subscription options
          const filteredSignals = this.filterSignals(signals, subscription.options);
          
          this.logger.info(`Filtered signals for client ${client.id}: ${JSON.stringify(filteredSignals.map((s: any) => ({ id: s.id, type: s.type, poolAddress: s.poolAddress })))}`);
          
          // Only emit if there are filtered signals
          if (filteredSignals.length > 0) {
            this.logger.info(`Sending ${filteredSignals.length} filtered signals to client ${client.id} for subscription ${subscription.id}`);
            
            client.socket.emit('filtered_signals', {
              subscriptionId: subscription.id,
              signals: filteredSignals
            });
          } else {
            this.logger.info(`No signals match the filter criteria for client ${client.id}`);
          }
        } else {
          // Send unfiltered signals only to clients without filter options
          client.socket.emit('signals', {
            signals,
            timestamp: Date.now()
          });
        }
      });
    });
  }

  private filterSignals(signals: Signal[], options: any): Signal[] {
    this.logger.info(`Filtering signals with options: ${JSON.stringify(options)}`);
    this.logger.info(`Signals before filtering: ${JSON.stringify(signals.map((s: any) => ({ id: s.id, type: s.type, poolAddress: s.poolAddress })))}`);
    
    // Filter signals based on all criteria
    const filteredSignals = signals.filter(signal => {
      // Filter by signal type
      if (options.signalTypes && options.signalTypes.length > 0) {
        if (!options.signalTypes.includes(signal.type)) {
          this.logger.info(`Signal ${signal.id} filtered out: type ${signal.type} not in ${JSON.stringify(options.signalTypes)}`);
          return false;
        }
      }
      
      // Filter by pool address
      if (options.poolAddresses && options.poolAddresses.length > 0) {
        if (!options.poolAddresses.includes(signal.poolAddress)) {
          this.logger.info(`Signal ${signal.id} filtered out: poolAddress ${signal.poolAddress} not in ${JSON.stringify(options.poolAddresses)}`);
          return false;
        }
      }
      
      // Filter by timeframe
      if (options.timeframes && options.timeframes.length > 0) {
        if (!options.timeframes.includes(signal.timeframe)) {
          this.logger.info(`Signal ${signal.id} filtered out: timeframe ${signal.timeframe} not in ${JSON.stringify(options.timeframes)}`);
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
    
    this.logger.info(`Signals after filtering: ${JSON.stringify(filteredSignals.map((s: any) => ({ id: s.id, type: s.type, poolAddress: s.poolAddress })))}`);
    
    return filteredSignals;
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
    return Object.keys(this.clients).length;
  }

  close(): void {
    this.stopHeartbeat();
    
    // Disconnect all clients
    Object.values(this.clients).forEach(client => {
      client.socket.disconnect(true);
    });
    
    // Clear clients
    this.clients = {};
    
    this.logger.info('WebSocket service closed');
  }
} 