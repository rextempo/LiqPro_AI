import { TransactionExecutor } from '../src/core/TransactionExecutor';
import { SolanaTransactionBuilder } from '../src/core/SolanaTransactionBuilder';
import { SolanaTransactionSigner } from '../src/core/SolanaTransactionSigner';
import { SolanaTransactionSender } from '../src/core/SolanaTransactionSender';
import { ConsoleLogger, LogLevel } from '../src/utils/logger';
import { TransactionType, TransactionStatus, TransactionPriority } from '../src/types/transaction';

describe('TransactionExecutor', () => {
  // 创建测试依赖
  const logger = new ConsoleLogger(LogLevel.DEBUG);
  const builder = new SolanaTransactionBuilder(logger);
  const signer = new SolanaTransactionSigner(logger);
  const sender = new SolanaTransactionSender(logger, ['https://api.mainnet-beta.solana.com']);
  let executor: TransactionExecutor;

  // 测试数据
  const testWalletAddress = 'test_wallet_address';
  const testPrivateKey = 'test_private_key';
  const testAgentId = 'test_agent_id';
  const testPoolAddress = 'test_pool_address';

  beforeEach(() => {
    // 注册测试钱包
    signer.registerWallet(testWalletAddress, testPrivateKey);
    
    // 创建交易执行器
    executor = new TransactionExecutor(signer, sender, builder, logger);
  });

  describe('Transaction Request Creation', () => {
    it('should create a transaction request with correct properties', () => {
      const data = {
        poolAddress: testPoolAddress,
        amount: 1.0,
        walletAddress: testWalletAddress
      };
      
      const request = executor.createRequest(
        TransactionType.ADD_LIQUIDITY,
        data,
        testAgentId
      );
      
      expect(request).toBeDefined();
      expect(request.id).toBeDefined();
      expect(request.type).toBe(TransactionType.ADD_LIQUIDITY);
      expect(request.status).toBe(TransactionStatus.PENDING);
      expect(request.data).toEqual(data);
      expect(request.agentId).toBe(testAgentId);
      expect(request.retryCount).toBe(0);
    });

    it('should create a transaction request with custom options', () => {
      const data = {
        poolAddress: testPoolAddress,
        amount: 1.0,
        walletAddress: testWalletAddress
      };
      
      const request = executor.createRequest(
        TransactionType.ADD_LIQUIDITY,
        data,
        testAgentId,
        {
          maxRetries: 5,
          priority: TransactionPriority.HIGH
        }
      );
      
      expect(request.maxRetries).toBe(5);
      expect(request.priority).toBe(TransactionPriority.HIGH);
    });
  });

  describe('Transaction Execution', () => {
    it('should execute a transaction successfully', async () => {
      const data = {
        poolAddress: testPoolAddress,
        amount: 1.0,
        walletAddress: testWalletAddress
      };
      
      const request = executor.createRequest(
        TransactionType.ADD_LIQUIDITY,
        data,
        testAgentId
      );
      
      const result = await executor.execute(request);
      
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.txHash).toBeDefined();
      expect(result.blockTime).toBeDefined();
      
      const status = executor.getStatus(request.id);
      expect(status).toBe(TransactionStatus.CONFIRMED);
    });
  });

  describe('Transaction Cancellation', () => {
    it('should cancel a pending transaction', async () => {
      const data = {
        poolAddress: testPoolAddress,
        amount: 1.0,
        walletAddress: testWalletAddress
      };
      
      const request = executor.createRequest(
        TransactionType.ADD_LIQUIDITY,
        data,
        testAgentId
      );
      
      const cancelled = await executor.cancel(request.id);
      
      expect(cancelled).toBe(true);
      
      const status = executor.getStatus(request.id);
      expect(status).toBe(TransactionStatus.CANCELLED);
    });

    it('should not cancel a non-existent transaction', async () => {
      const cancelled = await executor.cancel('non_existent_id');
      
      expect(cancelled).toBe(false);
    });
  });
}); 