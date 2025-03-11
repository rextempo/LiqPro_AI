# Signal Service

The Signal Service is a core component of the LiqPro platform, responsible for generating, managing, and distributing trading signals for Meteora DLMM liquidity pools on the Solana blockchain.

## Features

- **Signal Generation**: Analyzes market data to generate trading signals for Meteora DLMM pools
- **Strategy Management**: Supports multiple trading strategies with configurable parameters
- **Signal Subscription**: Allows clients to subscribe to signals via REST API and WebSocket
- **Performance Evaluation**: Tracks and evaluates the performance of generated signals
- **Security**: Authentication and rate limiting to protect the service

## Technical Architecture

The Signal Service is built with:

- **TypeScript**: For type-safe code development
- **Express.js**: For REST API endpoints
- **Socket.IO**: For real-time WebSocket communication
- **LRU Cache**: For efficient data caching
- **Winston**: For structured logging

## Installation

```bash
# Navigate to the signal service directory
cd services/signal-service

# Install dependencies
npm install

# Build the service
npm run build

# Start the service
npm start
```

## Configuration

Configuration is managed through environment variables or a `.env` file:

```
PORT=3000
LOG_LEVEL=info
API_KEYS=key1,key2,key3
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
CACHE_MAX_SIZE=1000
CACHE_TTL_MS=300000
```

## API Documentation

### REST API

The service exposes the following REST endpoints:

- `GET /api/signals`: Get all signals
- `GET /api/signals/:id`: Get a specific signal by ID
- `GET /api/signals/pool/:address`: Get signals for a specific pool
- `POST /api/signals/generate`: Manually trigger signal generation

All endpoints require authentication via an API key in the `X-API-Key` header.

### WebSocket API

The service provides real-time updates via WebSocket:

#### Connection

Connect to the WebSocket server:

```javascript
const socket = io('http://localhost:3000', {
  path: '/ws',
  auth: {
    clientId: 'your_client_id' // Optional
  }
});
```

#### Authentication

Authenticate with the server:

```javascript
socket.emit('authenticate', { apiKey: 'your_api_key' }, (response) => {
  if (response.success) {
    console.log('Authentication successful');
  } else {
    console.error('Authentication failed:', response.error);
  }
});
```

#### Subscribing to Topics

Subscribe to signal updates:

```javascript
socket.emit('subscribe', {
  topic: 'signals',
  options: {
    poolAddresses: ['pool_address_1', 'pool_address_2'], // Optional
    signalTypes: ['ENTRY', 'EXIT'], // Optional
    minStrength: 'MODERATE', // Optional
    minReliability: 'MEDIUM', // Optional
    timeframes: ['SHORT_TERM', 'MEDIUM_TERM'] // Optional
  }
}, (response) => {
  if (response.success) {
    console.log(`Subscribed to signals (ID: ${response.subscriptionId})`);
  }
});
```

Subscribe to system messages:

```javascript
socket.emit('subscribe', { topic: 'system' }, (response) => {
  if (response.success) {
    console.log(`Subscribed to system messages (ID: ${response.subscriptionId})`);
  }
});
```

#### Receiving Events

Listen for signal events:

```javascript
socket.on('signals', (data) => {
  console.log(`Received ${data.signals.length} signals`);
  data.signals.forEach(signal => {
    console.log(`${signal.type} signal for ${signal.tokenPair}`);
  });
});

socket.on('filtered_signals', (data) => {
  console.log(`Received ${data.signals.length} filtered signals for subscription ${data.subscriptionId}`);
});

socket.on('system_message', (data) => {
  console.log(`SYSTEM (${data.type}): ${data.message}`);
});
```

#### Managing Subscriptions

Get current subscriptions:

```javascript
socket.emit('getSubscriptions', (response) => {
  if (response.success) {
    console.log('Current subscriptions:', response.subscriptions);
  }
});
```

Unsubscribe from a topic:

```javascript
socket.emit('unsubscribe', { subscriptionId: 'your_subscription_id' }, (response) => {
  if (response.success) {
    console.log('Unsubscribed successfully');
  }
});
```

#### Heartbeat

The server sends periodic heartbeats to keep the connection alive:

```javascript
socket.on('ping', (data) => {
  console.log(`Heartbeat received: ${data.timestamp}`);
  socket.emit('pong');
});
```

## Security Considerations

- All API requests and WebSocket connections require authentication
- Rate limiting is applied to prevent abuse
- Input validation is performed on all requests
- Sensitive data is not logged or exposed

## Development

```bash
# Run in development mode with hot reloading
npm run dev

# Run tests
npm test

# Run linting
npm run lint

# Generate documentation
npm run docs
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 