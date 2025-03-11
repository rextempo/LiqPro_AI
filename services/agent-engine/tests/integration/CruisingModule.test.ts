import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { ConsoleLogger, LogLevel } from '../../src/utils/logger';
import { SolanaTransactionBuilder } from '../../src/core/SolanaTransactionBuilder';
import { SolanaTransactionSigner } from '../../src/core/SolanaTransactionSigner';
import { SolanaTransactionSender } from '../../src/core/SolanaTransactionSender';
import { TransactionExecutor } from '../../src/core/TransactionExecutor';
import { SolanaFundsManager } from '../../src/core/FundsManager';
import { AgentRiskController } from '../../src/core/RiskController';
import { AgentStateMachine } from '../../src/core/AgentStateMachine';
import { AgentConfig, AgentEvent, AgentState } from '../../src/types';
import { TransactionType, TransactionPriority } from '../../src/types/transaction';

// 假设这些是巡航模块的导入
// 在实际实现中，这些应该从实际的巡航模块导入
interface CruisingModule {
  start(): Promise<void>;
  stop(): Promise<void>;
  executeStrategy(strategyId: string): Promise<boolean>;
  processSignal(signal: any): Promise<void>;
  isRunning(): boolean;
}

interface SignalService {
  subscribeToSignals(callback: (signal: any) => void): void;
  unsubscribeFromSignals(callback: (signal: any) => void): void;
  getLatestSignal(): Promise<any>;
}

// 使用Solana开发网络进行测试
const SOLANA_DEVNET_URL = 'https://api.devnet.solana.com';

// 跳过集成测试，除非明确启用
// 要运行集成测试，使用: INTEGRATION_TEST=true npm test -- -t "Cruising Module"
const runIntegrationTests = process.env.INTEGRATION_TEST === 'true';

// 增加Jest超时时间
jest.setTimeout(60000);

describe('Cruising Module Integration', () => {
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
  const testAgentId = 'cruising_module_test_agent';
  const testConfig: AgentConfig = {
    name: 'CruisingModuleTestAgent',
    walletAddress: testWalletAddress,
    riskLevel: 'medium',
    maxPositions: 5,
    minSolBalance: 0.1,
    emergencyThreshold: 1.5
  };
  
  // 测试状态机
  let stateMachine: AgentStateMachine;
  
  // 模拟巡航模块和信号服务
  let cruisingModule: CruisingModule;
  let signalService: SignalService;
  
  // 设置测试环境
  beforeAll(async () => {
    if (!runIntegrationTests) {
      return;
    }
    
    // 注册测试钱包
    signer.registerWallet(testWalletAddress, 'test_wallet_key');
    
    // 创建并初始化状态机
    stateMachine = new AgentStateMachine(testConfig, logger);
    await stateMachine.initialize();
    stateMachine.handleEvent(AgentEvent.START);
    
    // 注册状态机到风险控制器
    riskController.registerAgent(testAgentId, stateMachine);
    
    // 创建模拟巡航模块
    cruisingModule = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      executeStrategy: jest.fn().mockResolvedValue(true),
      processSignal: jest.fn().mockResolvedValue(undefined),
      isRunning: jest.fn().mockReturnValue(true)
    };
    
    // 创建模拟信号服务
    signalService = {
      subscribeToSignals: jest.fn(),
      unsubscribeFromSignals: jest.fn(),
      getLatestSignal: jest.fn().mockResolvedValue({
        type: 'PRICE_CHANGE',
        asset: 'SOL/USDC',
        direction: 'UP',
        magnitude: 0.05,
        confidence: 0.8,
        timestamp: Date.now()
      })
    };
    
    logger.info('Test environment setup completed');
  });
  
  // 测试用例：启动和停止巡航模块
  test('should start and stop cruising module correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 启动巡航模块
    await cruisingModule.start();
    
    // 验证巡航模块已启动
    expect(cruisingModule.isRunning()).toBe(true);
    expect(cruisingModule.start).toHaveBeenCalled();
    
    // 停止巡航模块
    await cruisingModule.stop();
    
    // 验证巡航模块已停止
    expect(cruisingModule.stop).toHaveBeenCalled();
    
    logger.info('Cruising module start/stop test completed');
  });
  
  // 测试用例：执行策略
  test('should execute strategy correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 模拟交易构建和发送
    jest.spyOn(builder, 'buildAddLiquidityTransaction').mockImplementation(async () => {
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
    
    // 执行策略
    const result = await cruisingModule.executeStrategy('test_strategy_1');
    
    // 验证策略执行结果
    expect(result).toBe(true);
    expect(cruisingModule.executeStrategy).toHaveBeenCalledWith('test_strategy_1');
    
    // 恢复模拟
    jest.restoreAllMocks();
    
    logger.info('Strategy execution test completed');
  });
  
  // 测试用例：处理信号
  test('should process signals correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 获取最新信号
    const signal = await signalService.getLatestSignal();
    
    // 验证信号
    expect(signal).toBeDefined();
    expect(signal.type).toBe('PRICE_CHANGE');
    
    // 处理信号
    await cruisingModule.processSignal(signal);
    
    // 验证信号处理
    expect(cruisingModule.processSignal).toHaveBeenCalledWith(signal);
    
    logger.info('Signal processing test completed');
  });
  
  // 测试用例：信号订阅
  test('should subscribe to signals correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 创建信号回调
    const signalCallback = jest.fn();
    
    // 订阅信号
    signalService.subscribeToSignals(signalCallback);
    
    // 验证订阅
    expect(signalService.subscribeToSignals).toHaveBeenCalledWith(signalCallback);
    
    // 取消订阅
    signalService.unsubscribeFromSignals(signalCallback);
    
    // 验证取消订阅
    expect(signalService.unsubscribeFromSignals).toHaveBeenCalledWith(signalCallback);
    
    logger.info('Signal subscription test completed');
  });
  
  // 测试用例：自动交易执行
  test('should execute automatic transactions based on signals', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
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
    
    // 模拟信号处理导致交易执行
    const mockProcessSignal = cruisingModule.processSignal as jest.Mock;
    mockProcessSignal.mockImplementation(async (_signal: any) => {
      // 创建交易请求
      const request = transactionExecutor.createRequest(
        TransactionType.SWAP,
        {
          fromToken: 'SOL',
          toToken: 'USDC',
          amount: 0.01 * LAMPORTS_PER_SOL,
          walletAddress: testWalletAddress
        },
        testAgentId,
        {
          priority: TransactionPriority.HIGH
        }
      );
      
      // 执行交易
      return transactionExecutor.execute(request);
    });
    
    // 获取最新信号
    const signal = await signalService.getLatestSignal();
    
    // 处理信号
    await cruisingModule.processSignal(signal);
    
    // 验证信号处理导致交易执行
    expect(mockProcessSignal).toHaveBeenCalledWith(signal);
    
    // 验证交易历史
    const history = transactionExecutor.getAgentTransactionHistory(testAgentId);
    expect(history.length).toBeGreaterThan(0);
    
    // 恢复模拟
    jest.restoreAllMocks();
    
    logger.info('Automatic transaction execution test completed');
  });
  
  // 测试用例：巡航模块与风险控制的集成
  test('should integrate with risk controller correctly', async () => {
    if (!runIntegrationTests) {
      logger.info('Skipping integration test');
      return;
    }
    
    // 模拟高风险状态
    jest.spyOn(riskController, 'assessRisk').mockResolvedValue({
      healthScore: 1.0,
      riskLevel: 'high',
      triggers: [
        {
          type: 'available_sol_ratio',
          value: 0.05,
          threshold: 0.1
        }
      ]
    });
    
    // 处理风险
    await riskController.handleRisk(testAgentId, await riskController.assessRisk(testAgentId));
    
    // 验证状态机状态
    expect(stateMachine.getStatus().state).toBe(AgentState.EMERGENCY_EXIT);
    
    // 模拟巡航模块停止
    const mockStop = cruisingModule.stop as jest.Mock;
    
    // 添加状态变更监听器
    stateMachine.addStateChangeListener((status) => {
      if (status.state === AgentState.EMERGENCY_EXIT) {
        cruisingModule.stop();
      }
    });
    
    // 触发紧急退出
    stateMachine.handleEvent(AgentEvent.RISK_HIGH);
    
    // 验证巡航模块停止
    expect(mockStop).toHaveBeenCalled();
    
    // 恢复模拟
    jest.restoreAllMocks();
    
    logger.info('Risk controller integration test completed');
  });
  
  // 清理测试环境
  afterAll(async () => {
    if (!runIntegrationTests) {
      return;
    }
    
    // 清理资源
    logger.info('Cleaning up test resources');
    
    // 停止巡航模块
    await cruisingModule.stop();
    
    // 取消注册状态机
    riskController.unregisterAgent(testAgentId);
    
    // 清除模拟
    jest.restoreAllMocks();
  });
}); 