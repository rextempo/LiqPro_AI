# LiqPro Signal System Integration Testing Approach

## Overview

This document outlines our approach to testing the integration between the data collection, signal generation, and scoring services of the LiqPro platform on Solana mainnet. These tests will verify that our signal system can generate meaningful recommendations based on real-time market data.

## Testing Strategy

We have adopted a three-tiered testing approach:

1. **Individual Service Testing**: Verifying each service's core functionality
2. **Integration Flow Testing**: Testing the end-to-end flow across services
3. **Continuous Operation Testing**: Validating stability and performance over time

## What We're Testing

The integration test focuses on the following completed modules:

- **Data Service**: Collection of Meteora pool data, market prices, and monitoring of events
- **Signal Service**: Market analysis and strategy recommendation generation
- **Scoring Service**: Health scoring, risk assessment, and recommendation generation

## Test Environment

We've established a Docker-based testing environment that:

- Simulates our production architecture
- Uses real Solana mainnet data
- Tests against actual Meteora DLMM pools
- Operates in read-only mode for safety

## Real-World Pool Testing

We're using the following Meteora pools for testing:

- Dynamic AMM Pool: `Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB`
- Dynamic Vaults: `24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi`
- Multi-token Stable Pool: `MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky`

## Key Test Cases

1. **Data Accuracy**: Verifying our data service captures accurate pool data
2. **Signal Generation**: Testing the quality of strategy recommendations
3. **Risk Assessment**: Validating risk scores and health metrics
4. **End-to-End Flow**: Testing the complete data → signal → scoring pipeline

## Running the Tests

### Option 1: Docker Environment (Recommended)

```bash
cd tests/integration
./run_tests.sh docker
```

This will:

- Start all services in Docker containers
- Run the integration tests
- Collect and save test results to the `results` directory

### Option 2: Against Existing Services

```bash
cd tests/integration
./run_tests.sh local
```

This requires:

- Data, Signal, and Scoring services running and accessible
- Environment variables set for service URLs

## Security Considerations

- All testing is read-only and non-invasive
- No transactions are executed on the blockchain
- Rate limits on RPC nodes are respected
- No private keys or sensitive data are used

## Test Results

Results are:

- Displayed in real-time in the console
- Saved to log files with timestamps
- Summarized with pass/fail status for each component

## Next Steps

After validating the signal system integration:

1. Share results with the Agent Engine team for their implementation
2. Use performance metrics to optimize service interactions
3. Expand test coverage as additional components are completed

## Getting Help

If you encounter issues running the tests:

- Check the troubleshooting section in the README
- Review the logs in the `results` directory
- Contact the integration test team for support
