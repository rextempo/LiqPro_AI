# LiqPro Signal System Integration Tests

This directory contains integration tests for the LiqPro signal system targeting Solana mainnet. The tests validate that the data collection, signal generation, and scoring services can work together to produce meaningful investment signals for Meteora DLMM liquidity pools.

## Test Overview

The integration tests verify:

1. **Data Service**: Collects accurate data from Meteora pools on Solana mainnet
2. **Signal Service**: Generates market analysis and strategy recommendations based on collected data
3. **Scoring Service**: Evaluates pool health, assesses risks, and provides action recommendations
4. **End-to-End Flow**: Tests the complete signal generation workflow as it would be used by the Agent engine

## Prerequisites

- Node.js v16+ and npm
- Docker and Docker Compose (for containerized testing)
- A Solana RPC endpoint with access to mainnet (can be public or private)

## Configuration

Before running tests, configure the following:

1. Update the `testPoolAddresses` array in `signal_system_test.js` with at least 3 real Meteora DLMM pool addresses

2. Set the following environment variables:
   - `SOLANA_RPC_URL`: Your Solana RPC endpoint (defaults to public endpoint if not set)
   - `DATA_SERVICE_URL`: URL of the data service (default: http://localhost:3001)
   - `SIGNAL_SERVICE_URL`: URL of the signal service (default: http://localhost:3002)
   - `SCORING_SERVICE_URL`: URL of the scoring service (default: http://localhost:3003)

## Running Tests

### Option 1: Running with Docker Compose (Recommended)

This method will build and run all services together, including databases:

```bash
# From the integration test directory
npm run test:docker

# Or manually with Docker Compose
docker-compose -f docker-compose.test.yml up --build
```

### Option 2: Running Against Existing Services

If you already have the services running:

```bash
# Set environment variables to point to your services
export DATA_SERVICE_URL=http://your-data-service:3001
export SIGNAL_SERVICE_URL=http://your-signal-service:3002
export SCORING_SERVICE_URL=http://your-scoring-service:3003
export SOLANA_RPC_URL=https://your-solana-rpc-endpoint

# Run the tests
npm test
```

## Test Results

Test results will be:

1. Displayed in the console
2. Saved to log files in the `results` directory with timestamps
3. Summarized at the end with PASS/FAIL status for each service and the integration flow

## Security Considerations

- The tests use read-only operations and do not execute any transactions
- No private keys or sensitive data are used
- RPC rate limits should be considered when running tests

## Troubleshooting

- **RPC Errors**: Ensure your Solana RPC endpoint is accessible and has sufficient rate limits
- **Service Connectivity**: Check that all services are running and their health endpoints are accessible
- **Pool Data**: Verify that the test pool addresses are valid and active on mainnet
