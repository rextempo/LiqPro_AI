import { TransactionExecutor } from '../src/core/TransactionExecutor';
import { SolanaTransactionBuilder } from '../src/core/SolanaTransactionBuilder';
import { SolanaTransactionSigner } from '../src/core/SolanaTransactionSigner';
import { SolanaTransactionSender } from '../src/core/SolanaTransactionSender';
import { Logger, LoggerOptions, LogLevel } from '../src/utils/logger';
import { TransactionType, TransactionStatus } from '../src/types/transaction';

describe('TransactionExecutor', () => {
  // 创建测试依赖
  const logger = new Logger({ module: 'test' });
  const builder = new SolanaTransactionBuilder(logger);
  const signer = new SolanaTransactionSigner(logger);
  const sender = new SolanaTransactionSender(logger, ['https://api.mainnet-beta.solana.com']);
  
  // 测试数据
  const testWalletAddress = 'test_wallet_address';
  const testAgentId = 'test_agent_id';
  
  beforeEach(() => {
    // 注册测试钱包
    signer.registerWallet(testWalletAddress, 'test_wallet_key');
    
    // 模拟交易构建
    jest.spyOn(builder, 'buildAddLiquidityTransaction').mockImplementation(async () => {
      return { instructions: [], recentBlockhash: 'mock_blockhash' };
    });
    
    // 模拟交易签名
    jest.spyOn(signer, 'sign').mockImplementation(async () => {
      return { signature: `sig_${Date.now()}_${Math.random().toString(36).substring(2, 15)}` };
    });
    
    // 模拟交易发送
    jest.spyOn(sender, 'send').mockImplementation(async () => {
      return `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    });
    
    // 模拟交易确认
    jest.spyOn(sender, 'confirm').mockImplementation(async () => {
      return {
        success: true,
        txHash: `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`,
        blockTime: Date.now()
      };
    });
  });
  
  afterEach(() => {
    jest.restoreAllMocks();
  });
  
  describe('Transaction Execution', () => {
    it('should execute a transaction successfully', async () => {
      const executor = new TransactionExecutor(signer, sender, builder, logger);
      
      // 创建交易请求
      const request = executor.createRequest(
        TransactionType.ADD_LIQUIDITY,
        {
          poolAddress: 'test_pool_address',
          amount: 1,
          binRange: [-10, 10]
        },
        testAgentId
      );
      
      // 执行交易
      const result = await executor.execute(request);
      
      // 验证结果
      expect(result).toBeDefined();
      expect(result.txHash).toBeDefined();
      
      // 验证状态
      const statusMap = (executor as any).transactions;
      expect(statusMap.get(request.id).status).toBe(TransactionStatus.CONFIRMED);
    });
  });
  
  describe('Transaction Cancellation', () => {
    it('should cancel a pending transaction', async () => {
      const executor = new TransactionExecutor(signer, sender, builder, logger);
      
      // 创建交易请求
      const request = executor.createRequest(
        TransactionType.ADD_LIQUIDITY,
        {
          poolAddress: 'test_pool_address',
          amount: 1,
          binRange: [-10, 10]
        },
        testAgentId
      );
      
      // 取消交易
      const result = await executor.cancel(request.id);
      
      // 验证结果
      expect(result).toBe(true);
      
      // 验证状态
      const statusMap = (executor as any).transactions;
      expect(statusMap.get(request.id).status).toBe(TransactionStatus.CANCELLED);
    });
    
    it('should not cancel a non-existent transaction', async () => {
      const executor = new TransactionExecutor(signer, sender, builder, logger);
      
      // 尝试取消不存在的交易
      const result = await executor.cancel('non_existent_id');
      
      // 验证结果
      expect(result).toBe(false);
    });
  });
  
  describe('Transaction History', () => {
    it('should maintain transaction history', async () => {
      const executor = new TransactionExecutor(signer, sender, builder, logger);
      
      // 创建并执行交易
      const request = executor.createRequest(
        TransactionType.ADD_LIQUIDITY,
        {
          poolAddress: 'test_pool_address',
          amount: 1,
          binRange: [-10, 10]
        },
        testAgentId
      );
      
      await executor.execute(request);
      
      // 获取历史记录
      const history = executor.getAgentTransactionHistory(testAgentId);
      
      // 验证历史记录
      expect(history).toBeDefined();
      expect(history.length).toBeGreaterThan(0);
      expect(history[0].id).toBe(request.id);
    });
  });
}); 