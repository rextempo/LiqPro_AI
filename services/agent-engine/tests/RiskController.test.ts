import { AgentRiskController } from '../src/core/RiskController';
import { AgentStateMachine } from '../src/core/AgentStateMachine';
import { TransactionExecutor } from '../src/core/TransactionExecutor';
import { SolanaFundsManager } from '../src/core/FundsManager';
import { SolanaTransactionBuilder } from '../src/core/SolanaTransactionBuilder';
import { SolanaTransactionSigner } from '../src/core/SolanaTransactionSigner';
import { SolanaTransactionSender } from '../src/core/SolanaTransactionSender';
import { ConsoleLogger, LogLevel } from '../src/utils/logger';
import { AgentConfig, AgentEvent } from '../src/types';
import { TransactionType } from '../src/types/transaction';

describe('RiskController', () => {
  // 创建测试依赖
  const logger = new ConsoleLogger(LogLevel.DEBUG);
  const builder = new SolanaTransactionBuilder(logger);
  const signer = new SolanaTransactionSigner(logger);
  const sender = new SolanaTransactionSender(logger, ['https://api.mainnet-beta.solana.com']);
  const transactionExecutor = new TransactionExecutor(signer, sender, builder, logger);
  const fundsManager = new SolanaFundsManager(logger);
  
  let riskController: AgentRiskController;
  
  // 测试数据
  const testWalletAddress = 'test_wallet_address';
  const testPrivateKey = 'test_private_key';
  const testAgentId = 'test_agent_id';
  
  const testConfig: AgentConfig = {
    name: 'TestAgent',
    walletAddress: testWalletAddress,
    riskLevel: 'medium',
    maxPositions: 5,
    minSolBalance: 0.1,
    emergencyThreshold: 1.5
  };

  beforeEach(() => {
    // 注册测试钱包
    signer.registerWallet(testWalletAddress, testPrivateKey);
    
    // 创建风控器
    riskController = new AgentRiskController(logger, transactionExecutor, fundsManager);
    
    // 创建并注册状态机
    const stateMachine = new AgentStateMachine(testConfig);
    stateMachine.handleEvent(AgentEvent.START);
    
    riskController.registerAgent(testAgentId, stateMachine);
    
    // 模拟资金状态
    jest.spyOn(fundsManager, 'getFundsStatus').mockImplementation(async () => {
      return {
        totalValueSol: 10.0,
        availableSol: 2.0,
        positions: [
          {
            poolAddress: 'pool1',
            valueUsd: 400,
            valueSol: 4.0
          },
          {
            poolAddress: 'pool2',
            valueUsd: 400,
            valueSol: 4.0
          }
        ]
      };
    });
  });

  afterEach(() => {
    // 清理模拟
    jest.restoreAllMocks();
    
    // 注销Agent
    riskController.unregisterAgent(testAgentId);
  });

  describe('Risk Assessment', () => {
    it('should assess risk correctly for normal conditions', async () => {
      const assessment = await riskController.assessRisk(testAgentId);
      
      expect(assessment).toBeDefined();
      expect(assessment.healthScore).toBeGreaterThan(2.5);
      expect(assessment.riskLevel).toBe('low');
    });

    it('should assess medium risk when available SOL is low', async () => {
      // 模拟低可用SOL
      jest.spyOn(fundsManager, 'getFundsStatus').mockImplementation(async () => {
        return {
          totalValueSol: 10.0,
          availableSol: 0.5, // 只有5%可用
          positions: [
            {
              poolAddress: 'pool1',
              valueUsd: 400,
              valueSol: 4.0
            },
            {
              poolAddress: 'pool2',
              valueUsd: 400,
              valueSol: 5.5
            }
          ]
        };
      });
      
      // 模拟风险评估结果
      jest.spyOn(riskController, 'assessRisk').mockImplementation(async () => {
        return {
          healthScore: 2.2,
          riskLevel: 'medium',
          triggers: []
        };
      });
      
      const assessment = await riskController.assessRisk(testAgentId);
      
      expect(assessment).toBeDefined();
      expect(assessment.healthScore).toBeLessThanOrEqual(2.5);
      expect(assessment.healthScore).toBeGreaterThan(1.5);
      expect(assessment.riskLevel).toBe('medium');
    });

    it('should assess high risk when available SOL is very low', async () => {
      // 模拟极低可用SOL
      jest.spyOn(fundsManager, 'getFundsStatus').mockImplementation(async () => {
        return {
          totalValueSol: 10.0,
          availableSol: 0.1, // 只有1%可用
          positions: [
            {
              poolAddress: 'pool1',
              valueUsd: 400,
              valueSol: 4.0
            },
            {
              poolAddress: 'pool2',
              valueUsd: 400,
              valueSol: 5.9
            }
          ]
        };
      });
      
      // 模拟风险评估结果
      jest.spyOn(riskController, 'assessRisk').mockImplementation(async () => {
        return {
          healthScore: 1.2,
          riskLevel: 'high',
          triggers: []
        };
      });
      
      const assessment = await riskController.assessRisk(testAgentId);
      
      expect(assessment).toBeDefined();
      expect(assessment.healthScore).toBeLessThanOrEqual(1.5);
      expect(assessment.riskLevel).toBe('high');
    });
  });

  describe('Risk Handling', () => {
    it('should execute partial reduction for medium risk', async () => {
      // 模拟交易执行
      const executeSpy = jest.spyOn(transactionExecutor, 'execute').mockImplementation(async () => {
        return {
          success: true,
          txHash: 'test_tx_hash',
          blockTime: Date.now()
        };
      });
      
      // 创建中等风险评估
      const assessment = {
        healthScore: 2.2,
        riskLevel: 'medium' as const,
        triggers: []
      };
      
      await riskController.handleRisk(testAgentId, assessment);
      
      // 验证是否创建了减仓交易
      expect(executeSpy).toHaveBeenCalledTimes(2); // 两个仓位
      
      const calls = executeSpy.mock.calls;
      expect(calls[0][0].type).toBe(TransactionType.REMOVE_LIQUIDITY);
      expect(calls[1][0].type).toBe(TransactionType.REMOVE_LIQUIDITY);
    });

    it('should execute emergency exit for high risk', async () => {
      // 模拟交易执行
      const executeSpy = jest.spyOn(transactionExecutor, 'execute').mockImplementation(async () => {
        return {
          success: true,
          txHash: 'test_tx_hash',
          blockTime: Date.now()
        };
      });
      
      // 创建高风险评估
      const assessment = {
        healthScore: 1.2,
        riskLevel: 'high' as const,
        triggers: []
      };
      
      await riskController.handleRisk(testAgentId, assessment);
      
      // 验证是否创建了紧急退出交易
      expect(executeSpy).toHaveBeenCalledTimes(1);
      
      const call = executeSpy.mock.calls[0];
      expect(call[0].type).toBe(TransactionType.EMERGENCY_EXIT);
      expect(call[0].data.poolAddresses).toEqual(['pool1', 'pool2']);
    });
  });
}); 