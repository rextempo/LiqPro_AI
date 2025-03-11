/**
 * WebSocket 服务单元测试
 */
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { WebSocketService } from './mock-websocket-service';
import { Signal } from '../../types/signal';
import { createServer } from 'http';
import { Logger } from 'winston';
import { 
  SignalType, 
  SignalStrength, 
  SignalTimeframe, 
  SignalReliability 
} from '../../types/index';

// Increase Jest timeout for all tests
jest.setTimeout(10000);

// Mock logger
const mockLogger = {
  info: jest.fn(),
  error: jest.fn(),
  warn: jest.fn(),
  debug: jest.fn()
} as unknown as Logger;

// Mock API keys
const API_KEYS = ['test-key-1', 'test-key-2'];

describe('WebSocketService', () => {
  let httpServer: http.Server;
  let webSocketService: WebSocketService;
  let clientSocket: any; // Use any type to avoid namespace issues
  let port: number;

  beforeAll((done) => {
    // Create HTTP server
    httpServer = createServer();
    
    // Get a free port
    httpServer.listen(() => {
      const address = httpServer.address();
      if (address && typeof address !== 'string') {
        port = address.port;
      } else {
        port = 0;
      }
      
      // Initialize WebSocket service
      webSocketService = new WebSocketService(httpServer, mockLogger);
      
      // Set API keys directly using type assertion
      (webSocketService as any).apiKeys = API_KEYS;
      
      done();
    });
  });

  afterAll((done) => {
    // Close WebSocket service and HTTP server
    webSocketService.close();
    httpServer.close(() => {
      done();
    });
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
      // Disconnect and reconnect to ensure we get the connection_info event
      if (clientSocket.connected) {
        clientSocket.disconnect();
      }
      
      const newSocket = Client(`http://localhost:${port}`, {
        path: '/socket.io',
        autoConnect: false,
        transports: ['websocket']
      });
      
      newSocket.on('connection_info', (data: { clientId: string, topics: string[] }) => {
        expect(data).toHaveProperty('clientId');
        expect(data).toHaveProperty('topics');
        expect(data.topics).toContain('signals');
        newSocket.disconnect();
        done();
      });
      
      newSocket.connect();
    });
  });

  describe('Authentication', () => {
    test('should authenticate with valid API key', (done) => {
      clientSocket.emit('authenticate', { apiKey: 'test-key-1' }, (response: { success: boolean, error?: string }) => {
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
      // Authenticate before each test
      clientSocket.emit('authenticate', { apiKey: 'test-key-1' }, () => {
        done();
      });
    });

    test('should subscribe to signals topic', (done) => {
      clientSocket.emit('subscribe', { topic: 'signals' }, (response: { success: boolean, subscriptionId: string }) => {
        expect(response.success).toBe(true);
        expect(response.subscriptionId).toBeTruthy();
        done();
      });
    });

    test('should subscribe to signals with filter options', (done) => {
      const options = {
        poolAddresses: ['pool-1'],
        signalTypes: [SignalType.ENTRY],
        minStrength: SignalStrength.MODERATE,
        timeframes: [SignalTimeframe.MEDIUM_TERM],
        minReliability: SignalReliability.MEDIUM
      };
      
      clientSocket.emit('subscribe', { topic: 'signals', options }, (response: { success: boolean, subscriptionId: string }) => {
        expect(response.success).toBe(true);
        expect(response.subscriptionId).toBeTruthy();
        done();
      });
    });

    test('should get current subscriptions', (done) => {
      // First subscribe to a topic
      clientSocket.emit('subscribe', { topic: 'signals' }, () => {
        // Then get subscriptions
        clientSocket.emit('getSubscriptions', (response: { success: boolean, subscriptions: any[] }) => {
          expect(response.success).toBe(true);
          expect(response.subscriptions).toBeInstanceOf(Array);
          expect(response.subscriptions.length).toBeGreaterThan(0);
          done();
        });
      });
    });

    test('should unsubscribe from a topic', (done) => {
      // First subscribe to a topic
      clientSocket.emit('subscribe', { topic: 'signals' }, (response: { success: boolean, subscriptionId: string }) => {
        const subscriptionId = response.subscriptionId;
        
        // Then unsubscribe
        clientSocket.emit('unsubscribe', { subscriptionId }, (response: { success: boolean }) => {
          expect(response.success).toBe(true);
          
          // Verify subscription is removed
          clientSocket.emit('getSubscriptions', (response: { success: boolean, subscriptions: any[] }) => {
            const subscription = response.subscriptions.find(s => s.id === subscriptionId);
            expect(subscription).toBeUndefined();
            done();
          });
        });
      });
    });
  });

  describe('Broadcasting', () => {
    beforeEach((done) => {
      // Authenticate before each test
      clientSocket.emit('authenticate', { apiKey: 'test-key-1' }, () => {
        // Subscribe to signals
        clientSocket.emit('subscribe', { topic: 'signals' }, () => {
          done();
        });
      });
    });

    test('should broadcast signals to all subscribers', (done) => {
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
          description: 'Test signal 1',
          suggestedAction: 'Buy SOL',
          factors: [
            {
              factorId: 'price_trend',
              value: 0.8,
              description: 'Strong upward trend',
              weight: 0.7,
              confidence: 0.9
            }
          ],
          metadata: {}
        }
      ];

      clientSocket.on('signals', (data: { signals: Signal[] }) => {
        expect(data).toHaveProperty('signals');
        expect(data.signals).toHaveLength(1);
        expect(data.signals[0].id).toBe('signal-1');
        done();
      });

      // Use type assertion to avoid type errors
      (webSocketService as any).broadcastSignals(mockSignals);
    });

    test('should broadcast system messages to all subscribers', (done) => {
      // Subscribe to system messages
      clientSocket.emit('subscribe', { topic: 'system' }, () => {
        const message = 'System maintenance scheduled';
        const type = 'info';

        clientSocket.on('system_message', (data: { message: string, type: string, timestamp: number }) => {
          expect(data).toHaveProperty('message');
          expect(data).toHaveProperty('type');
          expect(data).toHaveProperty('timestamp');
          expect(data.message).toBe(message);
          expect(data.type).toBe(type);
          done();
        });

        webSocketService.broadcastSystemMessage(message, type);
      });
    });

    test('should filter signals based on subscription options', (done) => {
      // Subscribe with filter options
      const options = {
        signalTypes: [SignalType.ENTRY],
        poolAddresses: ['pool-1']
      };
      
      clientSocket.emit('subscribe', { topic: 'signals', options }, (response: { success: boolean, subscriptionId: string }) => {
        const subscriptionId = response.subscriptionId;
        
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
            description: 'Test signal 1',
            suggestedAction: 'Buy SOL',
            factors: [
              {
                factorId: 'price_trend',
                value: 0.8,
                description: 'Strong upward trend',
                weight: 0.7,
                confidence: 0.9
              }
            ],
            metadata: {}
          },
          {
            id: 'signal-2',
            poolAddress: 'pool-2',
            tokenPair: 'ETH/USDC',
            type: SignalType.EXIT,  // This should be filtered out
            strength: SignalStrength.STRONG,
            timeframe: SignalTimeframe.SHORT_TERM,
            reliability: SignalReliability.MEDIUM,
            timestamp: Date.now(),
            description: 'Test signal 2',
            suggestedAction: 'Sell ETH',
            factors: [
              {
                factorId: 'price_trend',
                value: -0.7,
                description: 'Strong downward trend',
                weight: 0.7,
                confidence: 0.8
              }
            ],
            metadata: {}
          }
        ];

        clientSocket.on('filtered_signals', (data: { signals: Signal[], subscriptionId: string }) => {
          expect(data).toHaveProperty('signals');
          expect(data).toHaveProperty('subscriptionId');
          expect(data.subscriptionId).toBe(subscriptionId);
          expect(data.signals).toHaveLength(1);
          expect(data.signals[0].id).toBe('signal-1');
          done();
        });

        // Use type assertion to avoid type errors
        (webSocketService as any).broadcastSignals(mockSignals);
      });
    });
  });

  describe('Heartbeat', () => {
    test('should send periodic heartbeats', (done) => {
      // Enable heartbeat with a short interval for testing
      // Use type assertion to access private method
      (webSocketService as any).startHeartbeat(100);
      
      clientSocket.on('ping', (data: { timestamp: number }) => {
        expect(data).toHaveProperty('timestamp');
        // Use type assertion to access private method
        (webSocketService as any).stopHeartbeat();
        done();
      });
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
        // Check if both clients are tracked using type assertion
        expect(Object.keys((webSocketService as any).clients).length).toBeGreaterThanOrEqual(2);
        
        clientSocket2.disconnect();
        done();
      });
    });
  });
}); 