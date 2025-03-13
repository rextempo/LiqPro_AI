/**
 * WebSocket Service Tests
 */
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { WebSocketService } from './simple-websocket-service';
import { Signal } from '../../types/signal';
import { SignalType, SignalStrength, SignalTimeframe, SignalReliability } from '../../types';
import { createServer } from 'http';
import { createLogger, transports, format } from 'winston';

// Increase Jest timeout for all tests
jest.setTimeout(10000);

describe('WebSocketService', () => {
  let httpServer: http.Server;
  let webSocketService: WebSocketService;
  let clientSocket: any;
  const port = 3001;
  
  // Create a mock logger
  const logger = createLogger({
    level: 'debug',
    format: format.combine(
      format.timestamp(),
      format.json()
    ),
    transports: [
      new transports.Console({ level: 'error' })
    ]
  });
  
  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    httpServer.listen(port, () => {
      // Initialize WebSocket service
      webSocketService = new WebSocketService(httpServer, logger);
      done();
    });
  });
  
  afterAll((done) => {
    // Close WebSocket service and HTTP server
    webSocketService.close();
    httpServer.close(done);
  });
  
  beforeEach((done) => {
    // Create client socket
    clientSocket = Client(`http://localhost:${port}`, {
      path: '/socket.io',
      autoConnect: false,
      transports: ['websocket']
    });
    
    // Set up connection handler
    clientSocket.on('connect', () => {
      done();
    });
    
    // Connect to server
    clientSocket.connect();
  });
  
  afterEach(() => {
    // Disconnect client socket
    if (clientSocket.connected) {
      clientSocket.disconnect();
    }
  });
  
  describe('Connection', () => {
    test('should connect successfully', (done) => {
      expect(clientSocket.connected).toBe(true);
      done();
    });
    
    test('should receive connection info on connect', (done) => {
      clientSocket.on('connection_info', (data: any) => {
        expect(data).toHaveProperty('clientId');
        expect(data).toHaveProperty('topics');
        expect(Array.isArray(data.topics)).toBe(true);
        done();
      });
      
      // Disconnect and reconnect to trigger connection_info event
      clientSocket.disconnect();
      
      // Create a new socket
      const newSocket = Client(`http://localhost:${port}`, {
        path: '/socket.io',
        autoConnect: false,
        transports: ['websocket']
      });
      
      newSocket.on('connection_info', (data: any) => {
        expect(data).toHaveProperty('clientId');
        expect(data).toHaveProperty('topics');
        expect(Array.isArray(data.topics)).toBe(true);
        newSocket.disconnect();
        done();
      });
      
      newSocket.connect();
    });
  });
  
  describe('Authentication', () => {
    test('should authenticate with valid API key', (done) => {
      clientSocket.emit('authenticate', { apiKey: 'valid-api-key' }, (response: { success: boolean }) => {
        expect(response.success).toBe(true);
        done();
      });
    });
    
    test('should reject invalid API key', (done) => {
      clientSocket.emit('authenticate', { apiKey: 'invalid-key' }, (response: { success: boolean, error: string }) => {
        expect(response.success).toBe(false);
        expect(response.error).toBeTruthy();
        done();
      });
    });
  });
  
  describe('Subscription', () => {
    beforeEach((done) => {
      // Authenticate before subscription tests
      clientSocket.emit('authenticate', { apiKey: 'valid-api-key' }, () => {
        done();
      });
    });
    
    test('should subscribe to a topic', (done) => {
      clientSocket.emit('subscribe', { topic: 'signals' }, (response: { success: boolean, subscriptionId: string }) => {
        expect(response.success).toBe(true);
        expect(response.subscriptionId).toBeTruthy();
        done();
      });
    });
    
    test('should get subscriptions', (done) => {
      // Subscribe first
      clientSocket.emit('subscribe', { topic: 'signals' }, () => {
        // Then get subscriptions
        clientSocket.emit('getSubscriptions', (response: { success: boolean, subscriptions: any[] }) => {
          expect(response.success).toBe(true);
          expect(Array.isArray(response.subscriptions)).toBe(true);
          expect(response.subscriptions.length).toBeGreaterThan(0);
          done();
        });
      });
    });
    
    test('should unsubscribe from a topic', (done) => {
      // Subscribe first
      clientSocket.emit('subscribe', { topic: 'signals' }, (response: { success: boolean, subscriptionId: string }) => {
        const subscriptionId = response.subscriptionId;
        
        // Then unsubscribe
        clientSocket.emit('unsubscribe', { subscriptionId }, (response: { success: boolean }) => {
          expect(response.success).toBe(true);
          done();
        });
      });
    });
  });
  
  describe('Broadcasting', () => {
    let subscriptionId: string;
    
    beforeEach((done) => {
      // Authenticate and subscribe before broadcast tests
      clientSocket.emit('authenticate', { apiKey: 'valid-api-key' }, () => {
        clientSocket.emit('subscribe', { topic: 'signals' }, (response: { subscriptionId: string }) => {
          subscriptionId = response.subscriptionId;
          done();
        });
      });
    });
    
    test('should receive broadcast signals', (done) => {
      const mockSignals: Signal[] = [
        {
          id: 'signal-1',
          poolAddress: 'pool-1',
          tokenPair: 'SOL/USDC',
          type: SignalType.ENTRY,
          strength: SignalStrength.STRONG,
          timeframe: SignalTimeframe.MEDIUM_TERM,
          reliability: SignalReliability.HIGH,
          timestamp: Date.now(),
          description: 'Test signal',
          suggestedAction: 'Buy SOL',
          factors: [],
          metadata: {}
        }
      ];
      
      clientSocket.on('signals', (data: { signals: Signal[] }) => {
        expect(data).toHaveProperty('signals');
        expect(Array.isArray(data.signals)).toBe(true);
        expect(data.signals.length).toBe(1);
        expect(data.signals[0].id).toBe('signal-1');
        done();
      });
      
      // Broadcast signals
      webSocketService.broadcastSignals(mockSignals);
    });
    
    test('should receive system messages', (done) => {
      clientSocket.on('system_message', (data: { message: string, type: string }) => {
        expect(data).toHaveProperty('message');
        expect(data).toHaveProperty('type');
        expect(data.message).toBe('Test message');
        expect(data.type).toBe('info');
        done();
      });
      
      // Broadcast system message
      webSocketService.broadcastSystemMessage('Test message', 'info');
    });
    
    test('should filter signals based on subscription options', (done) => {
      // Subscribe with filter options
      const options = {
        signalTypes: [SignalType.ENTRY],
        poolAddresses: ['pool-1']
      };
      
      // Flag to track if done has been called
      let isDone = false;
      
      // Wrapper for done to prevent multiple calls
      const safeDone = (error?: any) => {
        if (!isDone) {
          isDone = true;
          done(error);
        }
      };
      
      clientSocket.emit('subscribe', { topic: 'signals', options }, (response: { success: boolean, subscriptionId: string }) => {
        expect(response.success).toBe(true);
        
        // Create a signal that should pass the filter
        const entrySignal: Signal = {
          id: 'signal-1',
          poolAddress: 'pool-1',
          tokenPair: 'SOL/USDC',
          type: SignalType.ENTRY,
          strength: SignalStrength.STRONG,
          timeframe: SignalTimeframe.MEDIUM_TERM,
          reliability: SignalReliability.HIGH,
          timestamp: Date.now(),
          description: 'Test signal 1',
          suggestedAction: 'Buy SOL',
          factors: [],
          metadata: {}
        };
        
        // Set up listener for filtered signals
        clientSocket.once('filtered_signals', (data: { signals: Signal[] }) => {
          try {
            expect(data).toHaveProperty('signals');
            expect(data.signals.length).toBe(1);
            expect(data.signals[0].id).toBe('signal-1');
            safeDone();
          } catch (error) {
            safeDone(error);
          }
        });
        
        // Broadcast the signal
        webSocketService.broadcastSignals([entrySignal]);
      });
    });
    
    test('should filter out signals that do not match criteria', (done) => {
      // Subscribe with filter options that will only match ENTRY signals for pool-1
      const options = {
        signalTypes: [SignalType.ENTRY],
        poolAddresses: ['pool-1']
      };
      
      clientSocket.emit('subscribe', { topic: 'signals', options }, (response: { success: boolean, subscriptionId: string }) => {
        expect(response.success).toBe(true);
        
        // Create a signal that should NOT pass the filter (wrong type and pool)
        const exitSignal: Signal = {
          id: 'signal-2',
          poolAddress: 'pool-2', // Different pool address
          tokenPair: 'ETH/USDC',
          type: SignalType.EXIT, // Different signal type
          strength: SignalStrength.STRONG,
          timeframe: SignalTimeframe.SHORT_TERM,
          reliability: SignalReliability.MEDIUM,
          timestamp: Date.now(),
          description: 'Test signal 2',
          suggestedAction: 'Sell ETH',
          factors: [],
          metadata: {}
        };
        
        // Flag to track if filtered signals were received
        let filteredSignalsReceived = false;
        let signalsReceived = false;
        
        // Set up listener for filtered signals (should not be called)
        clientSocket.once('filtered_signals', (data: any) => {
          console.log('Received filtered signals:', data);
          filteredSignalsReceived = true;
        });
        
        // Set up listener for regular signals
        clientSocket.once('signals', (data: any) => {
          console.log('Received regular signals:', data);
          signalsReceived = true;
        });
        
        // Wait for subscription to be fully processed
        setTimeout(() => {
          // Broadcast the signal that should not pass the filter
          webSocketService.broadcastSignals([exitSignal]);
          
          // Wait a bit to ensure no filtered_signals event is emitted
          setTimeout(() => {
            try {
              expect(signalsReceived).toBe(true);
              expect(filteredSignalsReceived).toBe(false);
              done();
            } catch (error) {
              done(error);
            }
          }, 100);
        }, 100);
      });
    });
  });
  
  describe('Heartbeat', () => {
    test('should receive heartbeat', (done) => {
      clientSocket.on('ping', (data: { timestamp: number }) => {
        expect(data).toHaveProperty('timestamp');
        expect(typeof data.timestamp).toBe('number');
        done();
      });
      
      // Restart heartbeat with shorter interval for testing
      webSocketService.startHeartbeat(100);
    });
  });
  
  describe('Client Management', () => {
    test('should track connected clients', (done) => {
      // Create a second client
      const clientSocket2 = Client(`http://localhost:${port}`, {
        path: '/socket.io',
        transports: ['websocket']
      });
      
      clientSocket2.on('connect', () => {
        // Check if both clients are tracked
        expect(webSocketService.getConnectedClientsCount()).toBeGreaterThanOrEqual(2);
        
        clientSocket2.disconnect();
        done();
      });
    });
  });
}); 