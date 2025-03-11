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

// 交易队列项
interface TransactionQueueItem {
  request: TransactionRequest;
  options?: TransactionOptions;
  resolve: (result: TransactionResult) => void;
  reject: (error: Error) => void;
}

export class TransactionExecutor {
  private transactions: Map<string, TransactionRequest>;
  private logger: Logger;
  private signer: TransactionSigner;
  private sender: TransactionSender;
  private builder: TransactionBuilder;
  private queue: TransactionQueueItem[];
  private processing: boolean;
  private maxConcurrent: number;
  private activeTransactions: number;
  private transactionHistory: Map<string, TransactionRequest[]>;
  private transactionListeners: Map<string, ((request: TransactionRequest) => void)[]>;

  constructor(
    signer: TransactionSigner,
    sender: TransactionSender,
    builder: TransactionBuilder,
    logger: Logger,
    maxConcurrent = 3
  ) {
    this.transactions = new Map<string, TransactionRequest>();
    this.logger = logger;
    this.signer = signer;
    this.sender = sender;
    this.builder = builder;
    this.queue = [];
    this.processing = false;
    this.maxConcurrent = maxConcurrent;
    this.activeTransactions = 0;
    this.transactionHistory = new Map<string, TransactionRequest[]>();
    this.transactionListeners = new Map<string, ((request: TransactionRequest) => void)[]>();
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
    this.logger.info(`Created transaction request: ${request.id} of type ${type} for agent ${agentId}`);
    
    // 添加到代理的交易历史
    this.addToHistory(agentId, request);
    
    return request;
  }

  /**
   * 执行交易
   */
  public async execute(
    request: TransactionRequest,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    return new Promise<TransactionResult>((resolve, reject) => {
      // 添加到队列
      this.queue.push({
        request,
        options,
        resolve,
        reject
      });
      
      // 按优先级排序队列
      this.sortQueue();
      
      // 开始处理队列
      this.processQueue();
    });
  }

  /**
   * 处理队列
   */
  private async processQueue(): Promise<void> {
    // 如果已经在处理队列，或者没有队列项，则返回
    if (this.processing || this.queue.length === 0) {
      return;
    }
    
    this.processing = true;
    
    try {
      // 处理队列中的项目，直到队列为空
      while (this.queue.length > 0 && this.activeTransactions < this.maxConcurrent) {
        const item = this.queue.shift();
        
        if (!item) {
          continue;
        }
        
        this.activeTransactions++;
        
        // 异步执行交易，不等待完成
        this.executeTransaction(item.request, item.options)
          .then(result => {
            item.resolve(result);
          })
          .catch(error => {
            item.reject(error);
          })
          .finally(() => {
            this.activeTransactions--;
            // 继续处理队列
            this.processQueue();
          });
      }
    } finally {
      this.processing = false;
    }
  }

  /**
   * 执行单个交易
   */
  private async executeTransaction(
    request: TransactionRequest,
    options?: TransactionOptions
  ): Promise<TransactionResult> {
    const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
    let currentRequest = { ...request };
    
    try {
      this.logger.info(`Executing transaction: ${request.id} of type ${request.type} for agent ${request.agentId}`);
      
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
        TransactionStatus.CONFIRMING,
        { txHash }
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
    
    // 从队列中移除
    this.queue = this.queue.filter(item => item.request.id !== requestId);
    
    return true;
  }

  /**
   * 获取交易状态
   */
  public async getStatus(requestId: string): Promise<TransactionStatus | null> {
    const request = this.transactions.get(requestId);
    return request ? request.status : null;
  }

  /**
   * 获取代理的交易历史
   */
  public getAgentTransactionHistory(agentId: string): TransactionRequest[] {
    return this.transactionHistory.get(agentId) || [];
  }

  /**
   * 添加交易状态变更监听器
   */
  public addTransactionListener(
    agentId: string,
    listener: (request: TransactionRequest) => void
  ): void {
    const listeners = this.transactionListeners.get(agentId) || [];
    listeners.push(listener);
    this.transactionListeners.set(agentId, listeners);
  }

  /**
   * 移除交易状态变更监听器
   */
  public removeTransactionListener(
    agentId: string,
    listener: (request: TransactionRequest) => void
  ): void {
    const listeners = this.transactionListeners.get(agentId) || [];
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
      this.transactionListeners.set(agentId, listeners);
    }
  }

  /**
   * 更新请求状态
   */
  private updateRequestStatus(
    requestId: string,
    status: TransactionStatus,
    result?: Partial<TransactionResult>,
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
      result: result ? { ...request.result, ...result } as TransactionResult : request.result,
      error: error || request.error
    };
    
    this.transactions.set(requestId, updatedRequest);
    
    // 更新历史记录
    this.updateHistory(updatedRequest);
    
    // 通知监听器
    this.notifyListeners(updatedRequest);
    
    return updatedRequest;
  }

  /**
   * 添加到历史记录
   */
  private addToHistory(agentId: string, request: TransactionRequest): void {
    const history = this.transactionHistory.get(agentId) || [];
    history.push(request);
    
    // 限制历史记录大小
    if (history.length > 100) {
      history.shift();
    }
    
    this.transactionHistory.set(agentId, history);
  }

  /**
   * 更新历史记录
   */
  private updateHistory(request: TransactionRequest): void {
    const history = this.transactionHistory.get(request.agentId) || [];
    
    // 查找并更新历史记录中的请求
    for (let i = 0; i < history.length; i++) {
      if (history[i].id === request.id) {
        history[i] = request;
        break;
      }
    }
    
    this.transactionHistory.set(request.agentId, history);
  }

  /**
   * 通知监听器
   */
  private notifyListeners(request: TransactionRequest): void {
    const listeners = this.transactionListeners.get(request.agentId) || [];
    
    for (const listener of listeners) {
      try {
        listener(request);
      } catch (error: any) {
        this.logger.error(`Error in transaction listener: ${error.message}`);
      }
    }
  }

  /**
   * 按优先级排序队列
   */
  private sortQueue(): void {
    this.queue.sort((a, b) => {
      // 首先按优先级排序
      const priorityOrder = this.getPriorityOrder(a.request.priority) - this.getPriorityOrder(b.request.priority);
      
      if (priorityOrder !== 0) {
        return priorityOrder;
      }
      
      // 然后按创建时间排序
      return a.request.createdAt - b.request.createdAt;
    });
  }

  /**
   * 获取优先级顺序
   */
  private getPriorityOrder(priority: TransactionPriority): number {
    switch (priority) {
      case TransactionPriority.CRITICAL:
        return 0;
      case TransactionPriority.HIGH:
        return 1;
      case TransactionPriority.MEDIUM:
        return 2;
      case TransactionPriority.LOW:
        return 3;
      default:
        return 4;
    }
  }
} 