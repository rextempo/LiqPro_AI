#!/bin/bash

# LiqPro Signal System Quick Integration Test Runner
# This script runs a shortened version of the integration tests for quick verification

# Set a shorter test duration (60 seconds)
export TEST_DURATION=60

# Inform the user
echo "======================================================"
echo "  LiqPro Signal System Quick Integration Test"
echo "======================================================"
echo "Running a shortened integration test (60 seconds)"
echo "This is intended for quick verification only"
echo "For complete testing, use run_tests.sh"
echo "------------------------------------------------------"

# Create a quick_test specific config
cat > quick_test_config.js << EOF
// Quick test configuration - temporary file
module.exports = {
  testDuration: 60, // 1 minute
  singleIteration: true, // Run only one iteration
  skipBacktesting: true, // Skip time-consuming backtesting
  verboseLogging: false, // Reduce log output
};
EOF

# Run the test using local mode
NODE_ENV=test NODE_OPTIONS=--max-old-space-size=4096 \
QUICK_TEST_CONFIG=./quick_test_config.js \
./run_tests.sh local

# Remove the temporary config
rm quick_test_config.js

echo "------------------------------------------------------"
echo "Quick test completed!"
echo "For full testing, run: ./run_tests.sh"
echo "======================================================" 