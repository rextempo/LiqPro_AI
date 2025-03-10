# LiqPro

LiqPro is an AI-driven investment platform for Meteora DLMM liquidity pools on the Solana blockchain.

## Project Structure

```
/LiqPro
├── services/                # Microservices
│   ├── data-service/       # Data collection and processing
│   ├── signal-service/     # Market analysis and signal generation
│   ├── scoring-service/    # Pool health scoring and risk assessment
│   └── agent-engine/       # Agent lifecycle and transaction management
├── libs/                   # Shared libraries
│   ├── common/            # Common utilities and types
│   ├── database/          # Database access layer
│   └── security/          # Security related functionality
├── frontend/              # Frontend application
├── deploy/                # Deployment configurations
└── docs/                  # Project documentation
```

## Development Setup

### Prerequisites

- Node.js 16+
- Docker and Docker Compose
- Git

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
npm run dev
```

### Available Scripts

- `npm run dev` - Start development environment
- `npm run dev:build` - Rebuild and start development environment
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm test` - Run tests

## Architecture

- Frontend: React SPA with Tailwind UI/Shadcn UI
- Backend: Node.js microservices
- Databases: PostgreSQL, MongoDB, Redis
- Monitoring: Prometheus + Grafana + ELK Stack

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests and linting
4. Submit a pull request

## License

Proprietary - All rights reserved
