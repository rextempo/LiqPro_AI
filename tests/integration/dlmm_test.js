/**
 * LiqPro Signal System DLMM 池集成测试
 * 
 * 专门针对 Meteora DLMM 池的测试，验证信号系统能否正确处理 DLMM 数据
 */

const axios = require('axios');
const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const logger = require('./logger');

// 测试配置
const CONFIG = {
  // 服务URL
  dataServiceUrl: process.env.DATA_SERVICE_URL || 'http://localhost:3001',
  signalServiceUrl: process.env.SIGNAL_SERVICE_URL || 'http://localhost:3002',
  scoringServiceUrl: process.env.SCORING_SERVICE_URL || 'http://localhost:3003',
  
  // Solana RPC配置
  solanaRpcUrl: process.env.SOLANA_RPC_URL || 'https://soft-snowy-asphalt.solana-mainnet.quiknode.pro/48639631c6e4e81af5a0b8e228f6f9a0329154b7/',
  
  // Meteora DLMM API
  meteoraApiUrl: 'https://dlmm-api.meteora.ag',
  
  // 测试池地址 - 将动态填充
  testPoolAddresses: [],
  
  // 备用池地址 (如果API获取失败)
  fallbackPoolAddresses: [
    'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo', // DLMM Program ID
    'ARmSJaUxgKJExnYvVS91JiwxG7DTTaZh2JALiy2LCkxL', // 常见DLMM池地址
    '2QdhepnKRTLjjSqPL1PtKNwpWHEZ3yjUDzJGnXTVJS7s'  // 另一个DLMM池地址
  ],
  
  // 测试设置
  testDuration: process.env.TEST_DURATION ? parseInt(process.env.TEST_DURATION) : 300, // 默认5分钟
  iterationDelay: 30000, // 两次测试迭代之间的延迟，默认30秒
};

// Solana连接
let connection;

/**
 * 从Meteora API获取DLMM池地址
 */
async function fetchDLMMPools() {
  try {
    logger.info('从Meteora API获取DLMM池地址');
    logger.request('Meteora API', '/pair/all');
    
    const response = await axios.get(`${CONFIG.meteoraApiUrl}/pair/all`);
    logger.response('Meteora API', '/pair/all', { count: response.data.length });
    
    if (response.status === 200 && response.data.length > 0) {
      // 过滤活跃的DLMM池并获取其中的前3个用于测试
      const activePools = response.data
        .filter(pool => pool.active && pool.version === "DLMM")
        .slice(0, 3)
        .map(pool => pool.address);
      
      logger.info('成功获取活跃DLMM池', activePools);
      return activePools.length > 0 ? activePools : CONFIG.fallbackPoolAddresses;
    }
    
    logger.warn('未能从API获取活跃DLMM池，使用备用池地址');
    return CONFIG.fallbackPoolAddresses;
  } catch (error) {
    logger.error('获取DLMM池时出错', error);
    return CONFIG.fallbackPoolAddresses;
  }
}

/**
 * 测试数据服务的DLMM池数据获取功能
 */
async function testDataService() {
  logger.startTest('数据服务DLMM池测试');
  
  try {
    // 1. 测试DLMM池列表获取
    logger.info('测试DLMM池列表获取');
    logger.request('Data Service', '/api/dlmm/pools');
    
    const poolsResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/dlmm/pools`);
    logger.response('Data Service', '/api/dlmm/pools', { count: poolsResponse.data.length });
    
    if (!poolsResponse.data || poolsResponse.data.length === 0) {
      logger.error('数据服务未返回任何DLMM池数据');
      return false;
    }
    
    // 2. 测试特定DLMM池数据获取
    let specificPoolTestSuccess = true;
    
    for (const poolAddress of CONFIG.testPoolAddresses) {
      try {
        logger.info(`测试特定DLMM池数据: ${poolAddress}`);
        logger.request('Data Service', `/api/dlmm/pools/${poolAddress}`);
        
        const poolDetailResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/dlmm/pools/${poolAddress}`);
        logger.response('Data Service', `/api/dlmm/pools/${poolAddress}`, {
          tokenX: poolDetailResponse.data.tokenX,
          tokenY: poolDetailResponse.data.tokenY,
          bins: poolDetailResponse.data.bins?.length || 0
        });
        
        // 验证池数据
        if (!poolDetailResponse.data || !poolDetailResponse.data.tokenX || !poolDetailResponse.data.tokenY) {
          logger.warn(`池 ${poolAddress} 数据不完整`);
          specificPoolTestSuccess = false;
        }
      } catch (error) {
        logger.error(`获取池 ${poolAddress} 数据时出错`, error);
        specificPoolTestSuccess = false;
      }
    }
    
    // 3. 测试市场价格数据
    logger.info('测试市场价格数据');
    logger.request('Data Service', '/api/market/prices');
    
    const pricesResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/market/prices`);
    logger.response('Data Service', '/api/market/prices', { 
      tokenCount: Object.keys(pricesResponse.data || {}).length 
    });
    
    if (!pricesResponse.data || Object.keys(pricesResponse.data).length === 0) {
      logger.warn('市场价格数据为空');
    }
    
    const testResult = specificPoolTestSuccess && poolsResponse.data.length > 0;
    logger.endTest('数据服务DLMM池测试', testResult);
    return testResult;
  } catch (error) {
    logger.error('数据服务测试失败', error);
    logger.endTest('数据服务DLMM池测试', false);
    return false;
  }
}

/**
 * 测试信号服务对DLMM池的处理功能
 */
async function testSignalService() {
  logger.startTest('信号服务DLMM测试');
  
  try {
    // 1. 测试市场分析
    logger.info('测试市场分析');
    logger.request('Signal Service', '/api/analysis/market');
    
    const marketAnalysisResponse = await axios.get(`${CONFIG.signalServiceUrl}/api/analysis/market`);
    logger.response('Signal Service', '/api/analysis/market', marketAnalysisResponse.data);
    
    // 2. 测试DLMM池策略生成
    let strategyTestSuccess = true;
    
    for (const poolAddress of CONFIG.testPoolAddresses) {
      try {
        logger.info(`测试DLMM策略生成: ${poolAddress}`);
        logger.request('Signal Service', `/api/strategy/${poolAddress}`);
        
        const strategyResponse = await axios.get(`${CONFIG.signalServiceUrl}/api/strategy/${poolAddress}`);
        logger.response('Signal Service', `/api/strategy/${poolAddress}`, strategyResponse.data);
        
        // 验证策略数据
        if (!strategyResponse.data || !strategyResponse.data.recommendation) {
          logger.warn(`池 ${poolAddress} 的策略数据不完整`);
          strategyTestSuccess = false;
        }
      } catch (error) {
        logger.error(`获取池 ${poolAddress} 的策略时出错`, error);
        strategyTestSuccess = false;
      }
    }
    
    // 3. 测试回测功能
    try {
      if (CONFIG.testPoolAddresses.length > 0) {
        const testPool = CONFIG.testPoolAddresses[0];
        logger.info(`测试回测功能: ${testPool}`);
        logger.request('Signal Service', '/api/backtest', {
          poolAddress: testPool,
          startTime: Date.now() - (86400000 * 7), // 7天前
          endTime: Date.now(),
          strategy: 'default'
        });
        
        const backtestResponse = await axios.post(`${CONFIG.signalServiceUrl}/api/backtest`, {
          poolAddress: testPool,
          startTime: Date.now() - (86400000 * 7),
          endTime: Date.now(),
          strategy: 'default'
        });
        
        logger.response('Signal Service', '/api/backtest', {
          performance: backtestResponse.data.performance,
          trades: backtestResponse.data.trades?.length || 0
        });
      }
    } catch (error) {
      logger.warn('回测功能测试失败', error);
      // 回测失败不影响整体测试结果
    }
    
    const testResult = strategyTestSuccess && marketAnalysisResponse.data;
    logger.endTest('信号服务DLMM测试', testResult);
    return testResult;
  } catch (error) {
    logger.error('信号服务测试失败', error);
    logger.endTest('信号服务DLMM测试', false);
    return false;
  }
}

/**
 * 测试评分服务对DLMM池的评估功能
 */
async function testScoringService() {
  logger.startTest('评分服务DLMM测试');
  
  try {
    let healthTestSuccess = true;
    let riskTestSuccess = true;
    let recommendationTestSuccess = true;
    
    // 测试每个池的健康评分、风险评估和推荐
    for (const poolAddress of CONFIG.testPoolAddresses) {
      // 1. 测试健康评分
      try {
        logger.info(`测试健康评分: ${poolAddress}`);
        logger.request('Scoring Service', `/api/health/${poolAddress}`);
        
        const healthResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/health/${poolAddress}`);
        logger.response('Scoring Service', `/api/health/${poolAddress}`, healthResponse.data);
        
        if (!healthResponse.data || !healthResponse.data.overallScore) {
          logger.warn(`池 ${poolAddress} 的健康评分数据不完整`);
          healthTestSuccess = false;
        }
      } catch (error) {
        logger.error(`获取池 ${poolAddress} 的健康评分时出错`, error);
        healthTestSuccess = false;
      }
      
      // 2. 测试风险评估
      try {
        logger.info(`测试风险评估: ${poolAddress}`);
        logger.request('Scoring Service', `/api/risk/${poolAddress}`);
        
        const riskResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/risk/${poolAddress}`);
        logger.response('Scoring Service', `/api/risk/${poolAddress}`, riskResponse.data);
        
        if (!riskResponse.data || !riskResponse.data.overallRisk) {
          logger.warn(`池 ${poolAddress} 的风险评估数据不完整`);
          riskTestSuccess = false;
        }
      } catch (error) {
        logger.error(`获取池 ${poolAddress} 的风险评估时出错`, error);
        riskTestSuccess = false;
      }
      
      // 3. 测试推荐生成
      try {
        logger.info(`测试推荐生成: ${poolAddress}`);
        logger.request('Scoring Service', `/api/recommendations/${poolAddress}`);
        
        const recResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/recommendations/${poolAddress}`);
        logger.response('Scoring Service', `/api/recommendations/${poolAddress}`, recResponse.data);
        
        if (!recResponse.data || !recResponse.data.action) {
          logger.warn(`池 ${poolAddress} 的推荐数据不完整`);
          recommendationTestSuccess = false;
        }
      } catch (error) {
        logger.error(`获取池 ${poolAddress} 的推荐时出错`, error);
        recommendationTestSuccess = false;
      }
    }
    
    const testResult = healthTestSuccess && riskTestSuccess && recommendationTestSuccess;
    logger.endTest('评分服务DLMM测试', testResult);
    return testResult;
  } catch (error) {
    logger.error('评分服务测试失败', error);
    logger.endTest('评分服务DLMM测试', false);
    return false;
  }
}

/**
 * 测试端到端集成流程
 */
async function testIntegrationFlow() {
  logger.startTest('端到端集成流程测试');
  
  try {
    if (CONFIG.testPoolAddresses.length === 0) {
      logger.error('没有可用的测试池地址');
      logger.endTest('端到端集成流程测试', false);
      return false;
    }
    
    const testPool = CONFIG.testPoolAddresses[0];
    logger.info(`选择测试池: ${testPool}`);
    
    // 1. 从数据服务获取池数据
    logger.info('获取池数据');
    logger.request('Data Service', `/api/dlmm/pools/${testPool}`);
    
    const poolResponse = await axios.get(`${CONFIG.dataServiceUrl}/api/dlmm/pools/${testPool}`);
    logger.response('Data Service', `/api/dlmm/pools/${testPool}`, {
      tokenX: poolResponse.data.tokenX,
      tokenY: poolResponse.data.tokenY
    });
    
    // 2. 获取市场分析
    logger.info('获取市场分析');
    logger.request('Signal Service', '/api/analysis/market');
    
    const marketAnalysis = await axios.get(`${CONFIG.signalServiceUrl}/api/analysis/market`);
    logger.response('Signal Service', '/api/analysis/market', marketAnalysis.data);
    
    // 3. 获取策略推荐
    logger.info('获取策略推荐');
    logger.request('Signal Service', `/api/strategy/${testPool}`);
    
    const strategyResponse = await axios.get(`${CONFIG.signalServiceUrl}/api/strategy/${testPool}`);
    logger.response('Signal Service', `/api/strategy/${testPool}`, strategyResponse.data);
    
    // 4. 获取健康评分和风险评估
    logger.info('获取健康评分');
    logger.request('Scoring Service', `/api/health/${testPool}`);
    
    const healthResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/health/${testPool}`);
    logger.response('Scoring Service', `/api/health/${testPool}`, healthResponse.data);
    
    logger.info('获取风险评估');
    logger.request('Scoring Service', `/api/risk/${testPool}`);
    
    const riskResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/risk/${testPool}`);
    logger.response('Scoring Service', `/api/risk/${testPool}`, riskResponse.data);
    
    // 5. 获取最终推荐
    logger.info('获取最终推荐');
    logger.request('Scoring Service', `/api/recommendations/${testPool}`);
    
    const recommendationResponse = await axios.get(`${CONFIG.scoringServiceUrl}/api/recommendations/${testPool}`);
    logger.response('Scoring Service', `/api/recommendations/${testPool}`, recommendationResponse.data);
    
    // 6. 评估推荐质量
    const recommendation = recommendationResponse.data;
    const isRecommendationValid = 
      recommendation && 
      recommendation.action && 
      recommendation.allocation !== undefined &&
      recommendation.riskLevel !== undefined;
    
    logger.info('推荐有效性评估', {
      isValid: isRecommendationValid,
      missingFields: !isRecommendationValid ? 
        Object.entries(recommendation || {})
          .filter(([_, value]) => value === undefined)
          .map(([key]) => key) : 
        []
    });
    
    logger.endTest('端到端集成流程测试', isRecommendationValid);
    return isRecommendationValid;
  } catch (error) {
    logger.error('端到端集成流程测试失败', error);
    logger.endTest('端到端集成流程测试', false);
    return false;
  }
}

/**
 * 运行所有测试
 */
async function runTests() {
  logger.info('开始 LiqPro 信号系统 DLMM 集成测试');
  logger.info('测试配置', CONFIG);
  
  try {
    // 初始化 Solana 连接
    try {
      logger.info(`连接到 Solana: ${CONFIG.solanaRpcUrl}`);
      connection = new Connection(CONFIG.solanaRpcUrl, 'confirmed');
      const version = await connection.getVersion();
      logger.info('Solana 连接成功', { version });
    } catch (error) {
      logger.error('Solana 连接失败', error);
      return false;
    }
    
    // 测试各个服务
    const dataServiceResult = await testDataService();
    const signalServiceResult = await testSignalService();
    const scoringServiceResult = await testScoringService();
    
    // 测试端到端流程
    const integrationResult = await testIntegrationFlow();
    
    // 整体测试结果
    const overallResult = dataServiceResult && signalServiceResult && scoringServiceResult && integrationResult;
    
    logger.info('测试结果摘要', {
      数据服务: dataServiceResult ? '通过' : '失败',
      信号服务: signalServiceResult ? '通过' : '失败',
      评分服务: scoringServiceResult ? '通过' : '失败',
      集成流程: integrationResult ? '通过' : '失败',
      整体结果: overallResult ? '通过' : '失败'
    });
    
    return overallResult;
  } catch (error) {
    logger.error('测试执行失败', error);
    return false;
  }
}

/**
 * 运行连续测试
 */
async function runContinuousTests() {
  logger.info(`开始连续测试，持续 ${CONFIG.testDuration} 秒`);
  
  // 获取DLMM池地址
  CONFIG.testPoolAddresses = await fetchDLMMPools();
  if (CONFIG.testPoolAddresses.length === 0) {
    logger.error('没有可用的DLMM池地址，测试无法继续');
    return false;
  }
  
  logger.info('测试将使用以下DLMM池', CONFIG.testPoolAddresses);
  
  const startTime = Date.now();
  const endTime = startTime + (CONFIG.testDuration * 1000);
  let iteration = 1;
  let passedTests = 0;
  let failedTests = 0;
  
  while (Date.now() < endTime) {
    logger.info(`\n===== 测试迭代 ${iteration} =====\n`);
    const testResult = await runTests();
    
    if (testResult) {
      passedTests++;
    } else {
      failedTests++;
    }
    
    iteration++;
    
    // 如果还有时间，等待一段时间后进行下一次迭代
    const currentTime = Date.now();
    if (currentTime + CONFIG.iterationDelay < endTime) {
      logger.info(`等待 ${CONFIG.iterationDelay / 1000} 秒后进行下一次测试...`);
      await new Promise(resolve => setTimeout(resolve, CONFIG.iterationDelay));
    } else {
      break;
    }
  }
  
  logger.info('连续测试完成', {
    总迭代次数: iteration - 1,
    通过次数: passedTests,
    失败次数: failedTests,
    通过率: `${(passedTests / (iteration - 1) * 100).toFixed(2)}%`
  });
  
  return passedTests > failedTests;
}

// 主函数
async function main() {
  try {
    await runContinuousTests();
    logger.printSummary();
  } catch (error) {
    logger.error('测试主程序执行失败', error);
    process.exit(1);
  }
}

// 执行主函数
if (require.main === module) {
  main().catch(error => {
    logger.error('未捕获的错误', error);
    process.exit(1);
  });
} 