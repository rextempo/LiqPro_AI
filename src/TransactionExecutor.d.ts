import { TransactionRequest, TransactionOptions, TransactionStatus, TransactionType, TransactionSigner, TransactionSender, TransactionBuilder, TransactionResult } from '../types/transaction';
import { Logger } from '../utils/logger';
export declare class TransactionExecutor {
    private transactions;
    private logger;
    private signer;
    private sender;
    private builder;
    private queue;
    private processing;
    private maxConcurrent;
    private activeTransactions;
    private transactionHistory;
    private transactionListeners;
    constructor(signer: TransactionSigner, sender: TransactionSender, builder: TransactionBuilder, logger: Logger, maxConcurrent?: number);
    /**
     * 创建交易请求
     */
    createRequest(type: TransactionType, data: any, agentId: string, options?: TransactionOptions): TransactionRequest;
    /**
     * 执行交易
     */
    execute(request: TransactionRequest, options?: TransactionOptions): Promise<TransactionResult>;
    /**
     * 处理队列
     */
    private processQueue;
    /**
     * 执行单个交易
     */
    executeTransaction(request: TransactionRequest, options?: TransactionOptions): Promise<TransactionResult>;
    /**
     * 重试交易
     */
    retry(request: TransactionRequest, options?: TransactionOptions): Promise<TransactionResult>;
    /**
     * 取消交易
     */
    cancel(requestId: string): Promise<boolean>;
    /**
     * 获取交易状态
     */
    getStatus(requestId: string): Promise<TransactionStatus | null>;
    /**
     * 获取代理的交易历史
     */
    getAgentTransactionHistory(agentId: string): TransactionRequest[];
    /**
     * 添加交易状态变更监听器
     */
    addTransactionListener(agentId: string, listener: (request: TransactionRequest) => void): void;
    /**
     * 移除交易状态变更监听器
     */
    removeTransactionListener(agentId: string, listener: (request: TransactionRequest) => void): void;
    /**
     * 更新请求状态
     */
    private updateRequestStatus;
    /**
     * 添加到历史记录
     */
    private addToHistory;
    /**
     * 更新历史记录
     */
    private updateHistory;
    /**
     * 通知监听器
     */
    private notifyListeners;
    /**
     * 按优先级排序队列
     */
    private sortQueue;
    /**
     * 获取优先级顺序
     */
    private getPriorityOrder;
}
