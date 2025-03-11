/**
 * WebSocket Client Example
 * 
 * This example demonstrates how to connect to the Signal Service WebSocket API
 * and subscribe to real-time signals.
 * 
 * Usage:
 * 1. Start the Signal Service
 * 2. Run this example: node websocket-client.js
 */

const { io } = require('socket.io-client');

// Configuration
const CONFIG = {
  // Signal service WebSocket URL
  url: 'http://localhost:3000',
  path: '/ws',
  // API key for authentication
  apiKey: 'key1',
  // Client ID (optional, will be generated if not provided)
  clientId: `client_${Date.now()}`,
  // Topics to subscribe to
  topics: ['signals', 'system'],
  // Pool addresses to filter signals for
  poolAddresses: [],
  // Signal types to filter for (ENTRY, EXIT, REBALANCE, ALERT)
  signalTypes: [],
  // Minimum signal strength (VERY_WEAK, WEAK, MODERATE, STRONG, VERY_STRONG)
  minStrength: 'MODERATE',
  // Minimum signal reliability (LOW, MEDIUM, HIGH)
  minReliability: 'MEDIUM',
  // Signal timeframes to filter for (SHORT_TERM, MEDIUM_TERM, LONG_TERM)
  timeframes: []
};

// Create socket instance
const socket = io(CONFIG.url, {
  path: CONFIG.path,
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  timeout: 10000,
  auth: {
    clientId: CONFIG.clientId
  }
});

// Connection event
socket.on('connect', () => {
  console.log(`Connected to Signal Service (ID: ${socket.id})`);
  
  // Authenticate
  authenticate();
});

// Connection info event
socket.on('connection_info', (data) => {
  console.log('Connection info received:', data);
  console.log(`Available topics: ${data.topics.join(', ')}`);
});

// Heartbeat events
socket.on('ping', (data) => {
  console.log(`Heartbeat received: ${new Date(data.timestamp).toISOString()}`);
  socket.emit('pong');
});

// System message event
socket.on('system_message', (data) => {
  const timestamp = new Date(data.timestamp).toISOString();
  console.log(`[${timestamp}] SYSTEM (${data.type}): ${data.message}`);
});

// Signals event
socket.on('signals', (data) => {
  const timestamp = new Date(data.timestamp).toISOString();
  console.log(`[${timestamp}] Received ${data.signals.length} signals`);
  
  data.signals.forEach(signal => {
    console.log(`  - ${signal.type} signal for ${signal.tokenPair} (${signal.strength})`);
    console.log(`    ${signal.description}`);
    console.log(`    Action: ${signal.suggestedAction}`);
  });
});

// Filtered signals event
socket.on('filtered_signals', (data) => {
  const timestamp = new Date(data.timestamp).toISOString();
  console.log(`[${timestamp}] Received ${data.signals.length} filtered signals for subscription ${data.subscriptionId}`);
  
  data.signals.forEach(signal => {
    console.log(`  - ${signal.type} signal for ${signal.tokenPair} (${signal.strength})`);
    console.log(`    ${signal.description}`);
    console.log(`    Action: ${signal.suggestedAction}`);
  });
});

// Disconnect event
socket.on('disconnect', (reason) => {
  console.log(`Disconnected: ${reason}`);
});

// Error event
socket.on('connect_error', (error) => {
  console.error('Connection error:', error.message);
});

/**
 * Authenticate with the server
 */
function authenticate() {
  socket.emit('authenticate', { apiKey: CONFIG.apiKey }, (response) => {
    if (response.success) {
      console.log('Authentication successful');
      
      // Subscribe to topics after authentication
      subscribeToTopics();
    } else {
      console.error('Authentication failed:', response.error);
    }
  });
}

/**
 * Subscribe to topics
 */
function subscribeToTopics() {
  // Subscribe to system messages
  subscribeToTopic('system');
  
  // Subscribe to signals with filters
  subscribeToTopic('signals', {
    poolAddresses: CONFIG.poolAddresses,
    signalTypes: CONFIG.signalTypes,
    minStrength: CONFIG.minStrength,
    minReliability: CONFIG.minReliability,
    timeframes: CONFIG.timeframes
  });
}

/**
 * Subscribe to a specific topic
 * @param {string} topic Topic name
 * @param {object} options Subscription options
 */
function subscribeToTopic(topic, options = {}) {
  socket.emit('subscribe', { topic, options }, (response) => {
    if (response.success) {
      console.log(`Subscribed to ${topic} (ID: ${response.subscriptionId})`);
    } else {
      console.error(`Failed to subscribe to ${topic}:`, response.error);
    }
  });
}

/**
 * Get current subscriptions
 */
function getSubscriptions() {
  socket.emit('getSubscriptions', (response) => {
    if (response.success) {
      console.log('Current subscriptions:');
      response.subscriptions.forEach(sub => {
        console.log(`  - ${sub.id}: ${sub.topic}`);
      });
    } else {
      console.error('Failed to get subscriptions:', response.error);
    }
  });
}

/**
 * Unsubscribe from a topic
 * @param {string} subscriptionId Subscription ID
 */
function unsubscribe(subscriptionId) {
  socket.emit('unsubscribe', { subscriptionId }, (response) => {
    if (response.success) {
      console.log(`Unsubscribed from ${subscriptionId}`);
    } else {
      console.error(`Failed to unsubscribe from ${subscriptionId}:`, response.error);
    }
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('Disconnecting from server...');
  socket.disconnect();
  process.exit(0);
}); 