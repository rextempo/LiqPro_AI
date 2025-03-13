/**
 * WebSocket Service Timestamp and Expiration Tests
 */
import http from 'http';
import { Server } from 'socket.io';
import { io as Client } from 'socket.io-client';
import { WebSocketService } from '../websocket-service';
import { Signal, SignalType, SignalStrength, SignalTimeframe, SignalReliability } from '../../types';
import { createServer } from 'http';
import { createLogger, transports, format } from 'winston';

// Increase Jest timeout for all tests
jest.setTimeout(10000);

describe('WebSocketService Timestamp and Expiration Features', () => {
  let httpServer: http.Server;
  let webSocketService: WebSocketService;
  let clientSocket: any;
  const port = 3002;
  
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
  
  // Mock API keys
  const validApiKey = 'test-api-key';
  
  // Sample signals with different timestamps and expiration times
  const createTestSignals = (): Signal[] => {
    const now = Date.now();
    const hourInMs = 3600000;
    
    const signals: Signal[] = [
      // Signal 1: Current, not expired
      {
        id: 'signal-1',
        poolAddress: 'pool-1',
        tokenPair: 'SOL-USDC',
        type: SignalType.ENTRY,
        strength: SignalStrength.STRONG,
        timeframe: SignalTimeframe.SHORT_TERM,
        reliability: SignalReliability.HIGH,
        timestamp: now,
        expirationTimestamp: now + (hourInMs * 2), // Expires in 2 hours
        description: 'Current signal',
        suggestedAction: 'Buy',
        parameters: {}, // Required by Signal interface
        metadata: { source: 'test' }
      },
      // Signal 2: From 1 hour ago, not expired
      {
        id: 'signal-2',
        poolAddress: 'pool-2',
        tokenPair: 'BTC-USDC',
        type: SignalType.ENTRY,
        strength: SignalStrength.MODERATE,
        timeframe: SignalTimeframe.MEDIUM_TERM,
        reliability: SignalReliability.MEDIUM,
        timestamp: now - hourInMs, // 1 hour ago
        expirationTimestamp: now + hourInMs, // Expires in 1 hour
        description: 'Signal from 1 hour ago',
        suggestedAction: 'Buy',
        parameters: {}, // Required by Signal interface
        metadata: { source: 'test' }
      },
      // Signal 3: From 2 hours ago, expired
      {
        id: 'signal-3',
        poolAddress: 'pool-3',
        tokenPair: 'ETH-USDC',
        type: SignalType.EXIT,
        strength: SignalStrength.VERY_STRONG,
        timeframe: SignalTimeframe.LONG_TERM,
        reliability: SignalReliability.HIGH,
        timestamp: now - (hourInMs * 2), // 2 hours ago
        expirationTimestamp: now - hourInMs, // Expired 1 hour ago
        description: 'Expired signal',
        suggestedAction: 'Sell',
        parameters: {}, // Required by Signal interface
        metadata: { source: 'test' }
      },
      // Signal 4: From 3 hours ago, no expiration
      {
        id: 'signal-4',
        poolAddress: 'pool-4',
        tokenPair: 'AVAX-USDC',
        type: SignalType.ALERT,
        strength: SignalStrength.WEAK,
        timeframe: SignalTimeframe.SHORT_TERM,
        reliability: SignalReliability.LOW,
        timestamp: now - (hourInMs * 3), // 3 hours ago
        expirationTimestamp: now + (hourInMs * 24), // Expires in 24 hours
        description: 'Old signal with long expiration',
        suggestedAction: 'Monitor',
        parameters: {}, // Required by Signal interface
        metadata: { priority: 'low' }
      }
    ];
    
    return signals;
  };
  
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
      path: '/ws',
      autoConnect: false,
      transports: ['websocket']
    });
    
    // Set up connection handler
    clientSocket.on('connect', () => {
      // Authenticate client
      clientSocket.emit('authenticate', { apiKey: validApiKey }, (response: any) => {
        if (response.success) {
          done();
        } else {
          done(new Error('Authentication failed'));
        }
      });
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
  
  describe('Timestamp Filtering', () => {
    test('should filter signals by fromTimestamp', (done) => {
      const signals = createTestSignals();
      const now = Date.now();
      const hourInMs = 3600000;
      
      // Subscribe with fromTimestamp filter (1.5 hours ago)
      clientSocket.emit('subscribe', {
        topic: 'signals',
        options: {
          fromTimestamp: now - (hourInMs * 1.5)
        }
      }, (response: any) => {
        expect(response.success).toBe(true);
        
        // Set up filtered signals handler
        clientSocket.on('filtered_signals', (data: any) => {
          expect(data.signals).toBeDefined();
          expect(Array.isArray(data.signals)).toBe(true);
          
          // Should only receive signals 1 and 2 (from now and 1 hour ago)
          expect(data.signals.length).toBe(2);
          expect(data.signals.map((s: Signal) => s.id).sort()).toEqual(['signal-1', 'signal-2'].sort());
          
          done();
        });
        
        // Broadcast signals
        webSocketService.broadcastSignals(signals);
      });
    });
    
    test('should filter signals by toTimestamp', (done) => {
      const signals = createTestSignals();
      const now = Date.now();
      const hourInMs = 3600000;
      
      // Subscribe with toTimestamp filter (1.5 hours ago)
      clientSocket.emit('subscribe', {
        topic: 'signals',
        options: {
          toTimestamp: now - (hourInMs * 1.5)
        }
      }, (response: any) => {
        expect(response.success).toBe(true);
        
        // Set up filtered signals handler
        clientSocket.on('filtered_signals', (data: any) => {
          expect(data.signals).toBeDefined();
          expect(Array.isArray(data.signals)).toBe(true);
          
          // Should only receive signals 3 and 4 (from 2 and 3 hours ago)
          expect(data.signals.length).toBe(2);
          expect(data.signals.map((s: Signal) => s.id).sort()).toEqual(['signal-3', 'signal-4'].sort());
          
          done();
        });
        
        // Broadcast signals
        webSocketService.broadcastSignals(signals);
      });
    });
    
    test('should filter signals by both fromTimestamp and toTimestamp', (done) => {
      const signals = createTestSignals();
      const now = Date.now();
      const hourInMs = 3600000;
      
      // Subscribe with fromTimestamp and toTimestamp filter (between 0.5 and 2.5 hours ago)
      clientSocket.emit('subscribe', {
        topic: 'signals',
        options: {
          fromTimestamp: now - (hourInMs * 2.5),
          toTimestamp: now - (hourInMs * 0.5)
        }
      }, (response: any) => {
        expect(response.success).toBe(true);
        
        // Set up filtered signals handler
        clientSocket.on('filtered_signals', (data: any) => {
          expect(data.signals).toBeDefined();
          expect(Array.isArray(data.signals)).toBe(true);
          
          // Should only receive signals 2 and 3 (from 1 and 2 hours ago)
          expect(data.signals.length).toBe(2);
          expect(data.signals.map((s: Signal) => s.id).sort()).toEqual(['signal-2', 'signal-3'].sort());
          
          done();
        });
        
        // Broadcast signals
        webSocketService.broadcastSignals(signals);
      });
    });
  });
  
  describe('Signal Expiration', () => {
    test('should filter out expired signals automatically', (done) => {
      const signals = createTestSignals();
      
      // Subscribe to signals without filters
      clientSocket.emit('subscribe', {
        topic: 'signals'
      }, (response: any) => {
        expect(response.success).toBe(true);
        
        // Set up signals handler
        clientSocket.on('signals', (data: any) => {
          expect(data.signals).toBeDefined();
          expect(Array.isArray(data.signals)).toBe(true);
          
          // Should not receive signal 3 (expired)
          expect(data.signals.length).toBe(3);
          expect(data.signals.map((s: Signal) => s.id).sort()).toEqual(['signal-1', 'signal-2', 'signal-4'].sort());
          
          done();
        });
        
        // Broadcast signals
        webSocketService.broadcastSignals(signals);
      });
    });
    
    test('should receive expired signals event', (done) => {
      const signals = createTestSignals();
      const expiredSignals = signals.filter(s => s.expirationTimestamp && s.expirationTimestamp < Date.now());
      
      // Set up expired signals handler
      clientSocket.on('expired_signals', (data: any) => {
        expect(data.signals).toBeDefined();
        expect(Array.isArray(data.signals)).toBe(true);
        expect(data.signals.length).toBe(expiredSignals.length);
        
        done();
      });
      
      // Manually trigger expired signals check
      webSocketService['broadcastExpiredSignals'](expiredSignals);
    });
  });
  
  describe('Metadata Filtering', () => {
    test('should filter signals by metadata', (done) => {
      const signals = createTestSignals();
      
      // Subscribe with metadata filter
      clientSocket.emit('subscribe', {
        topic: 'signals',
        options: {
          metadata: { source: 'test' }
        }
      }, (response: any) => {
        expect(response.success).toBe(true);
        
        // Set up filtered signals handler
        clientSocket.on('filtered_signals', (data: any) => {
          expect(data.signals).toBeDefined();
          expect(Array.isArray(data.signals)).toBe(true);
          
          // Should only receive signals 1, 2, and 3 (with source: test)
          expect(data.signals.length).toBe(3);
          expect(data.signals.map((s: Signal) => s.id).sort()).toEqual(['signal-1', 'signal-2', 'signal-3'].sort());
          
          done();
        });
        
        // Broadcast signals
        webSocketService.broadcastSignals(signals);
      });
    });
  });
}); 