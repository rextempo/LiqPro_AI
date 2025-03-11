# LiqPro

LiqPro is an AI-driven automated LP investment platform for Meteora DLMM liquidity pools on the Solana blockchain. The platform helps users automatically capture high-quality LP investment opportunities and execute trades to generate passive income.

## Current Status (v0.4.3)

### Component Completion

- Core Backend: 95%
- Data Service: 90%
- Scoring Service: 85%
- Signal Service: 80%
- WebSocket API: 80%
- REST API: 95%
- Frontend Interface: 5%
- System Integration: 15%
- Deployment Preparation: 20%

### Recent Updates

- Completed API service integration with performance testing framework
- Implemented caching mechanism with Redis support
- Enhanced WebSocket service with connection management and fault tolerance
- Improved signal filtering and processing capabilities

## Project Structure

```
/LiqPro
├── services/                # Microservices
│   ├── api-service/        # REST API and service integration
│   ├── data-service/       # Market data collection and processing
│   ├── signal-service/     # Market analysis and signal generation
│   ├── scoring-service/    # Pool health scoring and risk assessment
│   └── agent-engine/       # Agent lifecycle and transaction management
├── libs/                   # Shared libraries
│   ├── common/            # Common utilities and types
│   ├── database/          # Database access layer
│   └── security/          # Security related functionality
├── frontend/              # Frontend application (in development)
├── deploy/                # Deployment configurations
│   └── docker/           # Docker development environment
└── docs/                  # Project documentation
```

## Technology Stack

### Backend

- **Core Services**: Node.js with TypeScript
- **API Layer**: Express.js with WebSocket support
- **Database**: PostgreSQL (main data), MongoDB (market data), Redis (caching)
- **Message Queue**: Redis Pub/Sub
- **Blockchain Integration**: Solana Web3.js, Anchor Framework
- **DEX Integration**: Jupiter API, Meteora DLMM SDK

### Frontend (Planned)

- **Framework**: React with TypeScript
- **UI Components**: Chakra UI, TailwindUI, Headless UI, Tremor
- **State Management**: Redux Toolkit
- **Data Visualization**: Tremor, Chart.js
- **Wallet Integration**: Solana Wallet Adapter

### DevOps

- **Containerization**: Docker & Docker Compose
- **Monitoring**: Prometheus + Grafana + ELK Stack
- **CI/CD**: GitHub Actions (planned)

## Development Setup

### Prerequisites

- Node.js 16+
- Docker and Docker Compose
- Git
- Solana CLI tools
- Redis (for local development)

### Installation

1. Clone the repository:

```bash
git clone https://github.com/yourusername/liqpro.git
cd liqpro
```

2. Install dependencies:

```bash
npm install
```

3. Start development environment:

```bash
# Using the one-click startup script
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

### Docker Development Environment

We provide a Docker-based development environment:

1. Ensure Docker and Docker Compose are installed
2. Run the development script:

```bash
./scripts/start-dev.sh
```

The script provides options for:

- Starting all services
- Stopping services
- Restarting services
- Checking service status
- Viewing logs
- Rebuilding services

For detailed setup instructions, see [DEVELOPMENT.md](DEVELOPMENT.md).

### Available Scripts

- `npm run dev` - Start development environment
- `npm run dev:build` - Rebuild and start development environment
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests
- `npm run test:integration` - Run integration tests
- `npm run test:performance` - Run performance tests

## Documentation

- [Development Guide](DEVELOPMENT.md) - Detailed development setup and guidelines
- [API Documentation](docs/api/README.md) - REST API and WebSocket documentation
- [Architecture Overview](docs/architecture/README.md) - System architecture and design
- [Deployment Guide](docs/deployment/README.md) - Deployment instructions

## Contributing

1. Create a feature branch from `main`
2. Follow the coding standards and guidelines
3. Run tests and ensure linting passes
4. Submit a pull request with detailed description

## Security

- All user funds are managed through secure wallet integration
- Private keys are encrypted and never stored in plain text
- Regular security audits and penetration testing
- Comprehensive error handling and input validation

## License

Proprietary - All rights reserved

© 2024 LiqPro. All rights reserved.
