# Agent Engine Service

The Agent Engine Service is responsible for managing and executing automated trading strategies for the LiqPro platform. It consumes events from the message queue, processes signals, and executes transactions based on agent configurations.

## Features

- Event-driven architecture using RabbitMQ
- Automated agent lifecycle management
- Signal processing and evaluation
- Transaction execution
- Health monitoring and optimization

## Getting Started

### Prerequisites

- Node.js 16+
- RabbitMQ
- Access to other LiqPro services (Data Service, Signal Service, Scoring Service)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   cd services/agent-engine
   npm install
   ```
3. Copy the environment example file:
   ```
   cp .env.example .env
   ```
4. Update the `.env` file with your configuration

### Running the Service

#### Development Mode

```
npm run start:dev
```

or

```
npm run dev
```

#### Production Mode

```
npm run build
npm start
```

## Architecture

The Agent Engine Service follows an event-driven architecture:

1. It subscribes to events from the message queue (RabbitMQ)
2. Processes events using appropriate handlers
3. Manages agent state and executes transactions
4. Publishes status updates and results back to the message queue

### Key Components

- **Event Handlers**: Process incoming events from the message queue
- **Agent State Machine**: Manages agent lifecycle and state transitions
- **Transaction Executor**: Executes transactions on the Solana blockchain
- **Funds Manager**: Manages agent funds and positions
- **Risk Controller**: Monitors and manages risk for agents

## API Endpoints

- `GET /health`: Health check endpoint
- Additional endpoints for agent management and monitoring

## Configuration

Configuration is managed through environment variables. See `.env.example` for available options.

## Development

### Code Structure

- `src/index-new.ts`: Application entry point
- `src/app-new.ts`: Express application setup
- `src/eventHandlers.ts`: Event handler implementations
- `src/core/`: Core business logic
- `src/services/`: Service implementations
- `src/api/`: API routes and controllers
- `src/utils/`: Utility functions
- `src/types/`: TypeScript type definitions

### Testing

```
npm test
```

### Linting

```
npm run lint
```

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
