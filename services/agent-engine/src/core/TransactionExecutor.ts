import { v4 as uuidv4 } from 'uuid';
import { 
  TransactionRequest, 
  TransactionOptions, 
  TransactionStatus, 
  TransactionPriority,
  TransactionType,
  TransactionSigner,
  TransactionSender,
  TransactionBuilder
} from '../types/transaction';
import { TransactionResult } from '../types';
import { Logger } from '../utils/logger';

// 默认交易选项
const DEFAULT_OPTIONS: TransactionOptions = {
  maxRetries: 3,
  retryDelay: [5000, 15000, 30000], // 5秒, 15秒, 30秒
  timeout: 60000, // 60秒
  confirmations: 1,
  priority: TransactionPriority.MEDIUM
};

export class TransactionExecutor {
  private transactions: Map<string, TransactionRequest>;
  private logger: Logger;
  private signer: TransactionSigner;
  private sender: TransactionSender;
  private builder: TransactionBuilder;

  constructor(
    signer: TransactionSigner,
    sender: TransactionSender,
    builder: TransactionBuilder,
    logger: Logger
  ) {
    this.transactions = new Map<string, TransactionRequest>();
    this.logger = logger;
    this.signer = signer;
    this.sender = sender;
    this.builder = builder;
  }

  /**
   * 创建交易请求
   */
  public createRequest(
    type: TransactionType,
    data: any,
    agentId: string,
    options?: TransactionOptions
  ): TransactionRequest {
    const now = Date.now();
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    const request: TransactionRequest = {
      id: uuidv4(),
      type,
      priority: mergedOptions.priority || TransactionPriority.MEDIUM,
      status: TransactionStatus.PENDING,
      data,
      createdAt: now,
      updatedAt: now,
      retryCount: 0,
      maxRetries: mergedOptions.maxRetries || DEFAULT_OPTIONS.maxRetries!,
      agentId
    };

    this.transactions.set(request.id, request);
    this.logger.info(`Created transaction request: ${request.id} of type ${type}`);
    
    return request;
  }

  /**
   * 执行交易
   */
  public async execute(
    request: TransactionRequest,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    let currentRequest = { ...request };
    
    try {
      this.logger.info(`Executing transaction: ${request.id}`);
      
      // 更新状态为签名中
      currentRequest = this.updateRequestStatus(
        currentRequest.id,
        TransactionStatus.SIGNING
      );
      
      // 构建交易
      let transaction;
      switch (currentRequest.type) {
        case TransactionType.ADD_LIQUIDITY:
          transaction = await this.builder.buildAddLiquidityTransaction(
            currentRequest.data.poolAddress,
            currentRequest.data.amount,
            currentRequest.data.binRange
          );
          break;
        case TransactionType.REMOVE_LIQUIDITY:
          transaction = await this.builder.buildRemoveLiquidityTransaction(
            currentRequest.data.poolAddress,
            currentRequest.data.amount,
            currentRequest.data.binRange
          );
          break;
        case TransactionType.SWAP:
          transaction = await this.builder.buildSwapTransaction(
            currentRequest.data.fromToken,
            currentRequest.data.toToken,
            currentRequest.data.amount,
            currentRequest.data.slippage
          );
          break;
        case TransactionType.EMERGENCY_EXIT:
          transaction = await this.builder.buildEmergencyExitTransaction(
            currentRequest.data.poolAddresses
          );
          break;
        default:
          throw new Error(`Unsupported transaction type: ${currentRequest.type}`);
      }
      
      // 签名交易
      const signedTransaction = await this.signer.sign(
        transaction,
        currentRequest.data.walletAddress
      );
      
      // 更新状态为发送中
      currentRequest = this.updateRequestStatus(
        currentRequest.id,
        TransactionStatus.SENDING
      );
      
      // 发送交易
      const txHash = await this.sender.send(signedTransaction);
      
      // 更新状态为确认中
      currentRequest = this.updateRequestStatus(
        currentRequest.id,
        TransactionStatus.CONFIRMING
      );
      
      // 确认交易
      const result = await this.sender.confirm(
        txHash,
        mergedOptions.confirmations
      );
      
      // 更新状态为已确认
      currentRequest = this.updateRequestStatus(
        currentRequest.id,
        TransactionStatus.CONFIRMED,
        result
      );
      
      this.logger.info(`Transaction ${currentRequest.id} confirmed: ${txHash}`);
      return result;
      
    } catch (error: any) {
      this.logger.error(`Transaction ${currentRequest.id} failed: ${error.message}`);
      
      // 更新状态为失败
      currentRequest = this.updateRequestStatus(
        currentRequest.id,
        TransactionStatus.FAILED,
        undefined,
        error.message
      );
      
      // 如果可以重试，则重试
      if (currentRequest.retryCount < currentRequest.maxRetries) {
        return this.retry(currentRequest, mergedOptions);
      }
      
      // 返回失败结果
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 重试交易
   */
  public async retry(
    request: TransactionRequest,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    
    // 更新重试计数和状态
    const updatedRequest = {
      ...request,
      retryCount: request.retryCount + 1,
      status: TransactionStatus.RETRYING,
      updatedAt: Date.now()
    };
    
    this.transactions.set(updatedRequest.id, updatedRequest);
    
    // 计算重试延迟
    const retryIndex = Math.min(
      updatedRequest.retryCount - 1,
      (mergedOptions.retryDelay || DEFAULT_OPTIONS.retryDelay!).length - 1
    );
    const delay = (mergedOptions.retryDelay || DEFAULT_OPTIONS.retryDelay!)[retryIndex];
    
    this.logger.info(
      `Retrying transaction ${updatedRequest.id} (${updatedRequest.retryCount}/${updatedRequest.maxRetries}) after ${delay}ms`
    );
    
    // 延迟执行
    await new Promise(resolve => setTimeout(resolve, delay));
    
    // 执行交易
    return this.execute(updatedRequest, options);
  }

  /**
   * 取消交易
   */
  public async cancel(requestId: string): Promise<boolean> {
    const request = this.transactions.get(requestId);
    
    if (!request) {
      this.logger.warn(`Cannot cancel transaction ${requestId}: not found`);
      return false;
    }
    
    // 只有处于等待状态的交易可以取消
    if (
      request.status !== TransactionStatus.PENDING &&
      request.status !== TransactionStatus.RETRYING
    ) {
      this.logger.warn(
        `Cannot cancel transaction ${requestId}: status is ${request.status}`
      );
      return false;
    }
    
    // 更新状态为已取消
    this.updateRequestStatus(requestId, TransactionStatus.CANCELLED);
    this.logger.info(`Transaction ${requestId} cancelled`);
    
    return true;
  }

  /**
   * 获取交易状态
   */
  public getStatus(requestId: string): TransactionStatus | null {
    const request = this.transactions.get(requestId);
    return request ? request.status : null;
  }

  /**
   * 获取交易请求
   */
  public getRequest(requestId: string): TransactionRequest | null {
    return this.transactions.get(requestId) || null;
  }

  /**
   * 更新交易请求状态
   */
  private updateRequestStatus(
    requestId: string,
    status: TransactionStatus,
    result?: TransactionResult,
    error?: string
  ): TransactionRequest {
    const request = this.transactions.get(requestId);
    
    if (!request) {
      throw new Error(`Transaction ${requestId} not found`);
    }
    
    const updatedRequest: TransactionRequest = {
      ...request,
      status,
      updatedAt: Date.now(),
      result,
      error
    };
    
    this.transactions.set(requestId, updatedRequest);
    this.logger.debug(`Transaction ${requestId} status updated to ${status}`);
    
    return updatedRequest;
  }
} 