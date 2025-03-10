#!/bin/bash

# LiqPro Signal System Integration Test Runner
# This script helps run the integration tests for the LiqPro signal system

# Default values
RPC_URL=${SOLANA_RPC_URL:-"https://api.mainnet-beta.solana.com"}
MODE=${1:-"docker"} # docker or local
TEST_DURATION=${2:-300} # 5 minutes by default

# Print header
echo "======================================================"
echo "  LiqPro Signal System Integration Test"
echo "======================================================"
echo "Mode: $MODE"
echo "RPC URL: $RPC_URL"
echo "Test Duration: $TEST_DURATION seconds"
echo "------------------------------------------------------"

# Create results directory if it doesn't exist
mkdir -p results

# Run tests based on mode
if [ "$MODE" == "docker" ]; then
    echo "Running tests in Docker environment..."
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        echo "Error: Docker is not running. Please start Docker and try again."
        exit 1
    fi
    
    # Set environment variables for docker-compose
    export SOLANA_RPC_URL=$RPC_URL
    
    # Run tests using docker-compose
    docker-compose -f docker-compose.test.yml up --build
    
    # Get the exit code from the integration-test container
    TEST_EXIT_CODE=$(docker-compose -f docker-compose.test.yml ps -q integration-test | xargs docker inspect -f '{{ .State.ExitCode }}')
    
    # Clean up containers
    docker-compose -f docker-compose.test.yml down
    
    # Check the exit code
    if [ "$TEST_EXIT_CODE" == "0" ]; then
        echo "Tests completed successfully!"
    else
        echo "Tests failed with exit code $TEST_EXIT_CODE"
        exit $TEST_EXIT_CODE
    fi
    
elif [ "$MODE" == "local" ]; then
    echo "Running tests in local environment..."
    
    # Check for Node.js
    if ! command -v node > /dev/null; then
        echo "Error: Node.js is not installed. Please install Node.js and try again."
        exit 1
    fi
    
    # Set environment variables
    export SOLANA_RPC_URL=$RPC_URL
    export DATA_SERVICE_URL=${DATA_SERVICE_URL:-"http://localhost:3001"}
    export SIGNAL_SERVICE_URL=${SIGNAL_SERVICE_URL:-"http://localhost:3002"}
    export SCORING_SERVICE_URL=${SCORING_SERVICE_URL:-"http://localhost:3003"}
    
    # Install dependencies if needed
    if [ ! -d "node_modules" ]; then
        echo "Installing dependencies..."
        npm install
    fi
    
    # Run the tests
    node signal_system_test.js
    
    # Get the exit code
    TEST_EXIT_CODE=$?
    
    # Check the exit code
    if [ "$TEST_EXIT_CODE" == "0" ]; then
        echo "Tests completed successfully!"
    else
        echo "Tests failed with exit code $TEST_EXIT_CODE"
        exit $TEST_EXIT_CODE
    fi
    
else
    echo "Error: Invalid mode '$MODE'. Use 'docker' or 'local'."
    echo "Usage: ./run_tests.sh [docker|local] [test_duration_in_seconds]"
    exit 1
fi

echo "------------------------------------------------------"
echo "Test results saved to: $(pwd)/results/"
echo "======================================================" 