/**
 * LiqPro Signal System Integration Test
 * 
 * This test verifies the integration between data-service, signal-service, and scoring-service
 * using Solana mainnet data. It tests the full flow from data collection to signal generation
 * and scoring.
 */

const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');

// Configuration - adjust as needed
const CONFIG = {
  dataServiceUrl: process.env.DATA_SERVICE_URL || 'http://localhost:3001',
  signalServiceUrl: process.env.SIGNAL_SERVICE_URL || 'http://localhost:3002',
  scoringServiceUrl: process.env.SCORING_SERVICE_URL || 'http://localhost:3003',
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  // Real Meteora pool addresses from mainnet
  testPoolAddresses: [
    'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB', // Dynamic AMM Pool
    '24Uqj9JCLxUeoC3hGfh5W3s9FM9uCHDS2SG3LYwBpyTi', // Dynamic Vaults
    'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky'  // Multi-token Stable Pool
  ],
  outputDir: path.join(__dirname, 'results'),
  testDuration: 60 * 5, // 5 minutes
};

// Ensure output directory exists
if (!fs.existsSync(CONFIG.outputDir)) {
  fs.mkdirSync(CONFIG.outputDir, { recursive: true });
}

// Logging utility
const logger = {
  logPath: path.join(CONFIG.outputDir, `integration_test_${Date.now()}.log`),
  log(message, data = null) {
    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] ${message}${data ? '\n' + JSON.stringify(data, null, 2) : ''}`;
    console.log(logMessage);
    fs.appendFileSync(this.logPath, logMessage + '\n');
  },
  error(message, error) {
    const timestamp = new Date().toISOString();
    const errorMessage = `[${timestamp}] ERROR: ${message}\n${error.stack || error}`;
    console.error(errorMessage);
    fs.appendFileSync(this.logPath, errorMessage + '\n');
  }
};

// Create connection to Solana
let connection;
try {
  connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');
  logger.log(`Connected to Solana at ${CONFIG.solanaRpcUrl}`);
} catch (error) {
  logger.error('Failed to connect to Solana RPC', error);
  process.exit(1);
}

// Test helpers
async function testDataService() {
  logger.log('Testing Data Service...');
  try {
    // 1. Test pool data fetching
    const poolDataResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/pools`);
    logger.log('Pool data retrieval:', { count: poolDataResponse.data.length });
    
    // 2. Test market price data
    const marketDataResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/market/prices`);
    logger.log('Market price data:', { tokens: Object.keys(marketDataResponse.data).length });
    
    // 3. Test specific pool monitoring
    for (const poolAddress of CONFIG.testPoolAddresses) {
      const poolDetailResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/pools/${poolAddress}`);
      logger.log(`Pool ${poolAddress} details:`, {
        liquidity: poolDetailResponse.data.liquidity,
        bins: poolDetailResponse.data.bins?.length || 0,
      });
    }
    
    return true;
  } catch (error) {
    logger.error('Data Service test failed', error);
    return false;
  }
}

async function testSignalService() {
  logger.log('Testing Signal Service...');
  try {
    // 1. Test strategy generation for pools
    for (const poolAddress of CONFIG.testPoolAddresses) {
      const strategyResponse = await axios.get(`${CONFIG.signalServiceUrl}/api/strategy/${poolAddress}`);
      logger.log(`Strategy for pool ${poolAddress}:`, {
        recommendation: strategyResponse.data.recommendation,
        confidence: strategyResponse.data.confidence,
        timestamp: strategyResponse.data.timestamp,
      });
    }
    
    // 2. Test market analysis
    const analysisResponse = await axios.get(`${CONFIG.signalServiceUrl}/api/analysis/market`);
    logger.log('Market analysis:', {
      trendDirection: analysisResponse.data.trendDirection,
      volatility: analysisResponse.data.volatility,
      timestamp: analysisResponse.data.timestamp,
    });
    
    // 3. Test backtesting
    const backtestResponse = await axios.post(`${CONFIG.signalServiceUrl}/api/backtest`, {
      poolAddress: CONFIG.testPoolAddresses[0],
      startTime: Date.now() - (86400000 * 7), // 7 days ago
      endTime: Date.now(),
      strategy: 'default'
    });
    logger.log('Backtest results:', {
      performance: backtestResponse.data.performance,
      trades: backtestResponse.data.trades?.length || 0,
    });
    
    return true;
  } catch (error) {
    logger.error('Signal Service test failed', error);
    return false;
  }
}

async function testScoringService() {
  logger.log('Testing Scoring Service...');
  try {
    // 1. Test health scoring for pools
    for (const poolAddress of CONFIG.testPoolAddresses) {
      const healthResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/health/${poolAddress}`);
      logger.log(`Health score for pool ${poolAddress}:`, {
        overallScore: healthResponse.data.overallScore,
        liquidityScore: healthResponse.data.liquidityScore,
        stabilityScore: healthResponse.data.stabilityScore,
        feeEfficiencyScore: healthResponse.data.feeEfficiencyScore,
      });
    }
    
    // 2. Test risk assessment
    for (const poolAddress of CONFIG.testPoolAddresses) {
      const riskResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/risk/${poolAddress}`);
      logger.log(`Risk assessment for pool ${poolAddress}:`, {
        overallRisk: riskResponse.data.overallRisk,
        priceRisk: riskResponse.data.priceRisk,
        liquidityRisk: riskResponse.data.liquidityRisk,
        whaleActivityRisk: riskResponse.data.whaleActivityRisk,
      });
    }
    
    // 3. Test recommendation generation
    for (const poolAddress of CONFIG.testPoolAddresses) {
      const recommendationResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/recommendations/${poolAddress}`);
      logger.log(`Recommendations for pool ${poolAddress}:`, {
        action: recommendationResponse.data.action,
        allocation: recommendationResponse.data.allocation,
        riskLevel: recommendationResponse.data.riskLevel,
      });
    }
    
    return true;
  } catch (error) {
    logger.error('Scoring Service test failed', error);
    return false;
  }
}

async function testIntegrationFlow() {
  logger.log('Testing End-to-End Integration Flow...');
  try {
    // 1. Fetch pool data from Data Service
    const poolsResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/pools`);
    const testPool = poolsResponse.data[0]; // Use first available pool
    logger.log(`Selected test pool:`, { address: testPool.address });
    
    // 2. Get market analysis from Signal Service
    const marketAnalysis = await axios.get(`${CONFIG.signalServiceUrl}/api/analysis/market`);
    logger.log('Current market analysis:', marketAnalysis.data);
    
    // 3. Get strategy recommendation from Signal Service
    const strategyResponse = await axios.get(`${CONFIG.signalServiceUrl}/api/strategy/${testPool.address}`);
    logger.log('Strategy recommendation:', strategyResponse.data);
    
    // 4. Get health and risk assessment from Scoring Service
    const healthResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/health/${testPool.address}`);
    const riskResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/risk/${testPool.address}`);
    logger.log('Health and risk assessment:', {
      health: healthResponse.data,
      risk: riskResponse.data
    });
    
    // 5. Get final recommendation from Scoring Service
    const recommendationResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/recommendations/${testPool.address}`);
    logger.log('Final action recommendation:', recommendationResponse.data);
    
    // 6. Evaluate the recommendation quality (this would normally be done by the Agent)
    // This is a simulation of what the Agent would do with this data
    const recommendation = recommendationResponse.data;
    const isRecommendationValid = 
      recommendation.action && 
      recommendation.allocation !== undefined &&
      recommendation.riskLevel !== undefined;
    
    logger.log('Recommendation validation:', {
      isValid: isRecommendationValid,
      missingFields: !isRecommendationValid ? 
        Object.entries(recommendation)
          .filter(([_, value]) => value === undefined)
          .map(([key]) => key) : 
        []
    });
    
    return isRecommendationValid;
  } catch (error) {
    logger.error('Integration flow test failed', error);
    return false;
  }
}

// Main test execution
async function runTests() {
  logger.log('Starting LiqPro Signal System Integration Tests on Solana Mainnet');
  logger.log('Configuration:', CONFIG);
  
  try {
    // Test individual services
    const dataServiceResult = await testDataService();
    logger.log(`Data Service Test: ${dataServiceResult ? 'PASSED' : 'FAILED'}`);
    
    const signalServiceResult = await testSignalService();
    logger.log(`Signal Service Test: ${signalServiceResult ? 'PASSED' : 'FAILED'}`);
    
    const scoringServiceResult = await testScoringService();
    logger.log(`Scoring Service Test: ${scoringServiceResult ? 'PASSED' : 'FAILED'}`);
    
    // Test integration flow
    const integrationResult = await testIntegrationFlow();
    logger.log(`Integration Flow Test: ${integrationResult ? 'PASSED' : 'FAILED'}`);
    
    // Overall test result
    const overallResult = dataServiceResult && signalServiceResult && scoringServiceResult && integrationResult;
    logger.log(`Overall Test Result: ${overallResult ? 'PASSED' : 'FAILED'}`);
    
    return overallResult;
  } catch (error) {
    logger.error('Test execution failed', error);
    return false;
  }
}

// Run continuous testing for the configured duration
async function runContinuousTests() {
  const startTime = Date.now();
  const endTime = startTime + (CONFIG.testDuration * 1000);
  let iteration = 1;
  
  logger.log(`Starting continuous testing for ${CONFIG.testDuration} seconds`);
  
  while (Date.now() < endTime) {
    logger.log(`\n=== Test Iteration ${iteration} ===\n`);
    await runTests();
    iteration++;
    
    // Wait 30 seconds between iterations
    await new Promise(resolve => setTimeout(resolve, 30000));
  }
  
  logger.log(`Continuous testing completed after ${iteration - 1} iterations`);
}

// Execute the tests
runContinuousTests().catch(error => {
  logger.error('Test execution failed', error);
  process.exit(1);
}); 