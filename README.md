# LiqPro Platform

LiqPro is an AI-driven investment platform focused on Meteora DLMM liquidity pools on the Solana blockchain. The platform helps users automatically capture high-quality LP investment opportunities and execute trades to generate passive income.

## Project Structure

```
LiqPro/
├── libs/                  # Shared libraries
│   └── common/            # Common utilities and types
├── services/              # Microservices
│   ├── agent-engine/      # Agent execution engine
│   ├── api-service/       # API gateway
│   ├── data-service/      # Data collection and storage
│   ├── signal-service/    # Signal generation
│   └── scoring-service/   # Risk scoring and analysis
└── web/                   # Frontend application
```

## Services

### Agent Engine Service

The Agent Engine Service is responsible for managing and executing automated trading strategies. It consumes events from the message queue, processes signals, and executes transactions based on agent configurations.

Key features:
- Event-driven architecture using RabbitMQ
- Automated agent lifecycle management
- Signal processing and evaluation
- Transaction execution
- Health monitoring and optimization

### API Service

The API Service serves as the gateway for user interactions with the platform. It provides RESTful endpoints for managing agents, viewing performance metrics, and controlling the platform.

### Data Service

The Data Service is responsible for collecting, processing, and storing data from various sources, including on-chain data, market data, and platform metrics.

### Signal Service

The Signal Service analyzes market data and generates trading signals based on various indicators and algorithms.

### Scoring Service

The Scoring Service evaluates risk and opportunity for potential investments, providing scores that help agents make informed decisions.

## Getting Started

### Prerequisites

- Node.js 16+
- RabbitMQ
- Docker (optional)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Set up environment variables (see `.env.example` files in each service)
4. Start the services:
   ```
   npm run start:dev
   ```

## Development

### Running Individual Services

Each service can be run independently:

```
cd services/agent-engine
npm run dev
```

### Docker Compose

You can also use Docker Compose to run all services:

```
docker-compose up
```

## License

This project is proprietary and confidential. Unauthorized copying, distribution, or use is strictly prohibited.
