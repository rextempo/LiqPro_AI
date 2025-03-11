import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ConsoleLogger, LogLevel } from '../../src/utils/logger';
import { SolanaTransactionBuilder } from '../../src/core/SolanaTransactionBuilder';
import { SolanaTransactionSigner } from '../../src/core/SolanaTransactionSigner';
import { SolanaTransactionSender } from '../../src/core/SolanaTransactionSender';
import { TransactionExecutor } from '../../src/core/TransactionExecutor';
import { SolanaFundsManager } from '../../src/core/FundsManager';
import { AgentRiskController } from '../../src/core/RiskController';
import { AgentStateMachine } from '../../src/core/AgentStateMachine';
import { AgentConfig, AgentEvent, AgentState, FundsStatus } from '../../src/types';
import { TransactionType, TransactionPriority, TransactionStatus } from '../../src/types/transaction';

// 使用Solana开发网络进行测试
const SOLANA_DEVNET_URL = 'https://api.devnet.solana.com';

// 跳过集成测试，除非明确启用
// 要运行集成测试，使用: INTEGRATION_TEST=true npm test -- -t "Agent Engine Integration"
const runIntegrationTests = process.env.INTEGRATION_TEST === 'true';

// 增加Jest超时时间
jest.setTimeout(60000);

describe('Agent Engine Integration', () => {
  // 创建测试依赖
  const logger = new ConsoleLogger(LogLevel.DEBUG);
  const builder = new SolanaTransactionBuilder(logger);
  const signer = new SolanaTransactionSigner(logger);
  const sender = new SolanaTransactionSender(logger, [SOLANA_DEVNET_URL]);
  const transactionExecutor = new TransactionExecutor(signer, sender, builder, logger);
  const fundsManager = new SolanaFundsManager(logger, SOLANA_DEVNET_URL);
  const riskController = new AgentRiskController(logger, transactionExecutor, fundsManager);
  
  // 使用预定义的测试钱包地址
  const testWalletAddress = 'test_wallet_address';
  
  // 测试配置
  const testAgentId = 'agent_engine_integration_test';
  const testConfig: AgentConfig = {
    name: 'AgentEngineIntegrationTest',
    walletAddress: testWalletAddress,
    riskLevel: 'medium',
    maxPositions: 5,
    minSolBalance: 0.1,
    emergencyThreshold: 1.5
  };
  
  // 测试状态机
  let stateMachine: AgentStateMachine;
  
  // 设置测试环境
  beforeAll(async () => {
    if (!runIntegrationTests) {
      return;
    }
    
    // 注册测试钱包（在实际测试中，这里应该使用真实的钱包密钥）
    signer.registerWallet(testWalletAddress, 'test_wallet_key');
    
    // 创建并初始化状态机
    stateMachine = new AgentStateMachine(testConfig, logger);
    await stateMachine.initialize();
    
    // 注册状态机到风险控制器
    riskController.registerAgent(testAgentId, stateMachine);
    
    logger.info('Test environment setup completed');
  });
  
  // 测试用例：状态机状态转换
  test('should transition through agent states correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 初始状态应该是INITIALIZING
    expect(stateMachine.getStatus().state).toBe(AgentState.INITIALIZING);
    
    // 启动代理
    const startResult = stateMachine.handleEvent(AgentEvent.START);
    expect(startResult).toBe(true);
    expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    
    // 模拟资金不足
    const lowFundsStatus: FundsStatus = {
      totalValueSol: 1.0,
      availableSol: 0.05, // 低于minSolBalance
      positions: [],
      lastUpdate: Date.now()
    };
    stateMachine.updateFunds(lowFundsStatus);
    expect(stateMachine.getStatus().state).toBe(AgentState.WAITING);
    
    // 模拟资金充足
    const sufficientFundsStatus: FundsStatus = {
      totalValueSol: 1.0,
      availableSol: 0.2, // 高于minSolBalance
      positions: [],
      lastUpdate: Date.now()
    };
    stateMachine.updateFunds(sufficientFundsStatus);
    expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    
    // 停止代理
    const stopResult = stateMachine.handleEvent(AgentEvent.STOP);
    expect(stopResult).toBe(true);
    expect(stateMachine.getStatus().state).toBe(AgentState.STOPPED);
    
    // 重新启动代理
    stateMachine.handleEvent(AgentEvent.START);
    expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    
    logger.info('State transition test completed');
  });
  
  // 测试用例：风险评估和处理
  test('should assess and handle risk correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 确保代理处于RUNNING状态
    if (stateMachine.getStatus().state !== AgentState.RUNNING) {
      stateMachine.handleEvent(AgentEvent.START);
    }
    
    // 模拟资金状态
    jest.spyOn(fundsManager, 'getFundsStatus').mockImplementation(async (_: string, __: string): Promise<FundsStatus> => {
      return {
        totalValueSol: 1.0,
        availableSol: 0.2,
        positions: [
          {
            poolAddress: 'test_pool_1',
            valueUsd: 50,
            valueSol: 0.5
          }
        ],
        lastUpdate: Date.now()
      };
    });
    
    // 执行风险评估
    const assessment = await riskController.assessRisk(testAgentId);
    
    // 验证风险评估结果
    expect(assessment).toBeDefined();
    expect(assessment.healthScore).toBeGreaterThan(0);
    expect(['low', 'medium', 'high']).toContain(assessment.riskLevel);
    
    // 处理风险
    await riskController.handleRisk(testAgentId, assessment);
    
    // 如果风险级别为高，状态应该变为EMERGENCY_EXIT
    if (assessment.riskLevel === 'high') {
      expect(stateMachine.getStatus().state).toBe(AgentState.EMERGENCY_EXIT);
    }
    // 如果风险级别为中，状态可能变为PARTIAL_REDUCING（取决于持续时间）
    else if (assessment.riskLevel === 'medium') {
      // 注意：这里不做断言，因为状态转换依赖于风险持续时间
    }
    // 如果风险级别为低，状态应该保持RUNNING
    else {
      expect(stateMachine.getStatus().state).toBe(AgentState.RUNNING);
    }
    
    // 恢复模拟
    jest.restoreAllMocks();
    
    logger.info('Risk assessment and handling test completed');
  });
  
  // 测试用例：交易执行和队列管理
  test('should execute transactions and manage queue correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 确保代理处于RUNNING状态
    if (stateMachine.getStatus().state !== AgentState.RUNNING) {
      stateMachine.handleEvent(AgentEvent.START);
    }
    
    // 模拟交易构建和发送
    jest.spyOn(builder, 'buildSwapTransaction').mockImplementation(async () => {
      return { instructions: [], recentBlockhash: 'mock_blockhash' };
    });
    
    jest.spyOn(signer, 'sign').mockImplementation(async () => {
      return { signature: 'mock_signature' };
    });
    
    jest.spyOn(sender, 'send').mockImplementation(async () => {
      return 'mock_tx_hash';
    });
    
    jest.spyOn(sender, 'confirm').mockImplementation(async () => {
      return {
        success: true,
        txHash: 'mock_tx_hash',
        blockTime: Date.now()
      };
    });
    
    // 创建多个交易请求，测试优先级队列
    const lowPriorityRequest = transactionExecutor.createRequest(
      TransactionType.SWAP,
      {
        fromToken: 'token_a',
        toToken: 'token_b',
        amount: 0.01 * LAMPORTS_PER_SOL,
        walletAddress: testWalletAddress
      },
      testAgentId,
      {
        priority: TransactionPriority.LOW
      }
    );
    
    const highPriorityRequest = transactionExecutor.createRequest(
      TransactionType.SWAP,
      {
        fromToken: 'token_c',
        toToken: 'token_d',
        amount: 0.02 * LAMPORTS_PER_SOL,
        walletAddress: testWalletAddress
      },
      testAgentId,
      {
        priority: TransactionPriority.HIGH
      }
    );
    
    // 执行交易
    const highPriorityPromise = transactionExecutor.execute(highPriorityRequest);
    const lowPriorityPromise = transactionExecutor.execute(lowPriorityRequest);
    
    // 等待交易完成
    const [highPriorityResult, lowPriorityResult] = await Promise.all([
      highPriorityPromise,
      lowPriorityPromise
    ]);
    
    // 验证交易结果
    expect(highPriorityResult.success).toBe(true);
    expect(lowPriorityResult.success).toBe(true);
    
    // 验证交易状态
    const highPriorityStatus = await transactionExecutor.getStatus(highPriorityRequest.id);
    const lowPriorityStatus = await transactionExecutor.getStatus(lowPriorityRequest.id);
    
    expect(highPriorityStatus).toBe(TransactionStatus.CONFIRMED);
    expect(lowPriorityStatus).toBe(TransactionStatus.CONFIRMED);
    
    // 验证交易历史
    const history = transactionExecutor.getAgentTransactionHistory(testAgentId);
    expect(history).toHaveLength(2);
    expect(history.some(tx => tx.id === highPriorityRequest.id)).toBe(true);
    expect(history.some(tx => tx.id === lowPriorityRequest.id)).toBe(true);
    
    // 恢复模拟
    jest.restoreAllMocks();
    
    logger.info('Transaction execution and queue management test completed');
  });
  
  // 测试用例：资金管理和安全检查
  test('should manage funds and perform safety checks correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 模拟钱包余额
    jest.spyOn(fundsManager, 'getWalletBalance').mockImplementation(async () => {
      return 1.5;
    });
    
    // 获取资金状态
    const fundsStatus = await fundsManager.getFundsStatus(testAgentId, testWalletAddress);
    
    // 验证资金状态
    expect(fundsStatus).toBeDefined();
    expect(fundsStatus.availableSol).toBe(1.5);
    
    // 设置初始投资
    fundsManager.setInitialInvestment(testAgentId, 1.0);
    
    // 记录交易
    fundsManager.recordTransaction(testAgentId, 0.1, 'SWAP');
    fundsManager.recordTransaction(testAgentId, 0.05, 'FEE');
    
    // 计算收益
    const returns = await fundsManager.calculateReturns(testAgentId);
    
    // 验证收益计算
    expect(returns).toBeDefined();
    expect(returns.totalReturns).toBeGreaterThan(0);
    
    // 检查交易限额
    const withinLimit = await fundsManager.checkTransactionLimit(
      testAgentId,
      0.1,
      'SWAP'
    );
    
    // 验证限额检查
    expect(withinLimit).toBe(true);
    
    // 检查资金安全
    const isSafe = await fundsManager.checkFundsSafety(testAgentId);
    
    // 验证安全检查
    expect(isSafe).toBe(true);
    
    // 恢复模拟
    jest.restoreAllMocks();
    
    logger.info('Funds management and safety check test completed');
  });
  
  // 测试用例：状态机事件监听
  test('should handle state change listeners correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 创建状态变更监听器
    let lastState: AgentState | null = null;
    const listener = (status: any) => {
      lastState = status.state;
    };
    
    // 添加监听器
    stateMachine.addStateChangeListener(listener);
    
    // 触发状态变更
    stateMachine.handleEvent(AgentEvent.STOP);
    
    // 验证监听器被调用
    expect(lastState).toBe(AgentState.STOPPED);
    
    // 移除监听器
    stateMachine.removeStateChangeListener(listener);
    
    // 重置状态
    lastState = null;
    
    // 再次触发状态变更
    stateMachine.handleEvent(AgentEvent.START);
    
    // 验证监听器未被调用
    expect(lastState).toBeNull();
    
    logger.info('State change listener test completed');
  });
  
  // 测试用例：紧急退出机制
  test('should execute emergency exit correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 确保代理处于RUNNING状态
    if (stateMachine.getStatus().state !== AgentState.RUNNING) {
      stateMachine.handleEvent(AgentEvent.START);
    }
    
    // 模拟资金状态
    jest.spyOn(fundsManager, 'getFundsStatus').mockImplementation(async (_: string, __: string): Promise<FundsStatus> => {
      return {
        totalValueSol: 1.0,
        availableSol: 0.2,
        positions: [
          {
            poolAddress: 'test_pool_1',
            valueUsd: 50,
            valueSol: 0.5
          },
          {
            poolAddress: 'test_pool_2',
            valueUsd: 30,
            valueSol: 0.3
          }
        ],
        lastUpdate: Date.now()
      };
    });
    
    // 模拟交易构建和发送
    jest.spyOn(builder, 'buildEmergencyExitTransaction').mockImplementation(async () => {
      return { instructions: [], recentBlockhash: 'mock_blockhash' };
    });
    
    jest.spyOn(signer, 'sign').mockImplementation(async () => {
      return { signature: 'mock_signature' };
    });
    
    jest.spyOn(sender, 'send').mockImplementation(async () => {
      return 'mock_tx_hash';
    });
    
    jest.spyOn(sender, 'confirm').mockImplementation(async () => {
      return {
        success: true,
        txHash: 'mock_tx_hash',
        blockTime: Date.now()
      };
    });
    
    // 执行紧急退出
    const result = await riskController.executeEmergencyExit(
      testAgentId,
      'Emergency exit test'
    );
    
    // 验证紧急退出结果
    expect(result).toBe(true);
    
    // 验证状态机状态
    expect(stateMachine.getStatus().state).toBe(AgentState.EMERGENCY_EXIT);
    
    // 恢复模拟
    jest.restoreAllMocks();
    
    logger.info('Emergency exit test completed');
  });
  
  // 清理测试环境
  afterAll(async () => {
    if (!runIntegrationTests) {
      return;
    }
    
    // 清理资源
    logger.info('Cleaning up test resources');
    
    // 取消注册状态机
    riskController.unregisterAgent(testAgentId);
    
    // 清除模拟
    jest.restoreAllMocks();
  });
}); 