"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionExecutor = void 0;
const uuid_1 = require("uuid");
const transaction_1 = require("../types/transaction");
// 默认交易选项
const DEFAULT_OPTIONS = {
    maxRetries: 3,
    retryDelay: [5000, 15000, 30000], // 5秒, 15秒, 30秒
    timeout: 60000, // 60秒
    confirmations: 1,
    priority: transaction_1.TransactionPriority.MEDIUM
};
class TransactionExecutor {
    constructor(signer, sender, builder, logger, maxConcurrent = 3) {
        this.transactions = new Map();
        this.logger = logger;
        this.signer = signer;
        this.sender = sender;
        this.builder = builder;
        this.queue = [];
        this.processing = false;
        this.maxConcurrent = maxConcurrent;
        this.activeTransactions = 0;
        this.transactionHistory = new Map();
        this.transactionListeners = new Map();
    }
    /**
     * 创建交易请求
     */
    createRequest(type, data, agentId, options) {
        const now = Date.now();
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        const request = {
            id: (0, uuid_1.v4)(),
            type,
            priority: mergedOptions.priority || transaction_1.TransactionPriority.MEDIUM,
            status: transaction_1.TransactionStatus.PENDING,
            data,
            createdAt: now,
            updatedAt: now,
            retryCount: 0,
            maxRetries: mergedOptions.maxRetries || DEFAULT_OPTIONS.maxRetries,
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
    async execute(request, options) {
        return new Promise((resolve, reject) => {
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
    async processQueue() {
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
        }
        finally {
            this.processing = false;
        }
    }
    /**
     * 执行单个交易
     */
    async executeTransaction(request, options) {
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        let currentRequest = { ...request };
        try {
            this.logger.info(`Executing transaction: ${request.id || 'new'} of type ${request.type} for agent ${request.agentId}`);
            // 如果没有ID，创建一个新的请求
            if (!currentRequest.id) {
                currentRequest = this.createRequest(request.type, request.data, request.agentId, options);
            }
            // 更新状态为签名中
            currentRequest = this.updateRequestStatus(currentRequest.id, transaction_1.TransactionStatus.SIGNING);
            // 构建交易
            let transaction;
            switch (currentRequest.type) {
                case transaction_1.TransactionType.ADD_LIQUIDITY:
                    transaction = await this.builder.buildAddLiquidityTransaction(currentRequest.data.poolAddress, currentRequest.data.amount, currentRequest.data.binRange);
                    break;
                case transaction_1.TransactionType.REMOVE_LIQUIDITY:
                    transaction = await this.builder.buildRemoveLiquidityTransaction(currentRequest.data.poolAddress, currentRequest.data.percentage, currentRequest.data.binRange);
                    break;
                case transaction_1.TransactionType.SWAP:
                case transaction_1.TransactionType.SWAP_TO_SOL:
                    transaction = await this.builder.buildSwapTransaction(currentRequest.type === transaction_1.TransactionType.SWAP_TO_SOL ? 'SOL' : currentRequest.data.fromToken, currentRequest.type === transaction_1.TransactionType.SWAP_TO_SOL ? currentRequest.data.toToken : 'SOL', currentRequest.data.amount, currentRequest.data.maxSlippage);
                    break;
                case transaction_1.TransactionType.EMERGENCY_EXIT:
                    transaction = await this.builder.buildEmergencyExitTransaction(currentRequest.data.poolAddresses);
                    break;
                default:
                    throw new Error(`Unsupported transaction type: ${currentRequest.type}`);
            }
            // 签名交易
            const signedTransaction = await this.signer.sign(transaction, currentRequest.data.walletAddress);
            // 更新状态为发送中
            currentRequest = this.updateRequestStatus(currentRequest.id, transaction_1.TransactionStatus.SENDING);
            // 发送交易
            const txHash = await this.sender.send(signedTransaction);
            // 更新状态为确认中
            currentRequest = this.updateRequestStatus(currentRequest.id, transaction_1.TransactionStatus.CONFIRMING, { txHash });
            // 确认交易
            const result = await this.sender.confirm(txHash, mergedOptions.confirmations);
            // 更新状态为已确认
            currentRequest = this.updateRequestStatus(currentRequest.id, transaction_1.TransactionStatus.CONFIRMED, result);
            return {
                ...result,
                txHash,
                success: true
            };
        }
        catch (error) {
            // 更新状态为失败
            currentRequest = this.updateRequestStatus(currentRequest.id, transaction_1.TransactionStatus.FAILED, undefined, error.message);
            // 如果还有重试次数，尝试重试
            if (currentRequest.retryCount < currentRequest.maxRetries) {
                this.logger.info(`Retrying transaction ${currentRequest.id}, attempt ${currentRequest.retryCount + 1}`);
                return this.retry(currentRequest, options);
            }
            return {
                success: false,
                error: error.message
            };
        }
    }
    /**
     * 重试交易
     */
    async retry(request, options) {
        const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
        // 更新重试计数和状态
        const updatedRequest = {
            ...request,
            retryCount: request.retryCount + 1,
            status: transaction_1.TransactionStatus.RETRYING,
            updatedAt: Date.now()
        };
        this.transactions.set(updatedRequest.id, updatedRequest);
        // 计算重试延迟
        const retryIndex = Math.min(updatedRequest.retryCount - 1, (mergedOptions.retryDelay || DEFAULT_OPTIONS.retryDelay).length - 1);
        const delay = (mergedOptions.retryDelay || DEFAULT_OPTIONS.retryDelay)[retryIndex];
        this.logger.info(`Retrying transaction ${updatedRequest.id} (${updatedRequest.retryCount}/${updatedRequest.maxRetries}) after ${delay}ms`);
        // 延迟执行
        await new Promise(resolve => setTimeout(resolve, delay));
        // 执行交易
        return this.execute(updatedRequest, options);
    }
    /**
     * 取消交易
     */
    async cancel(requestId) {
        const request = this.transactions.get(requestId);
        if (!request) {
            this.logger.warn(`Cannot cancel transaction ${requestId}: not found`);
            return false;
        }
        // 只有处于等待状态的交易可以取消
        if (request.status !== transaction_1.TransactionStatus.PENDING &&
            request.status !== transaction_1.TransactionStatus.RETRYING) {
            this.logger.warn(`Cannot cancel transaction ${requestId}: status is ${request.status}`);
            return false;
        }
        // 更新状态为已取消
        this.updateRequestStatus(requestId, transaction_1.TransactionStatus.CANCELLED);
        this.logger.info(`Transaction ${requestId} cancelled`);
        // 从队列中移除
        this.queue = this.queue.filter(item => item.request.id !== requestId);
        return true;
    }
    /**
     * 获取交易状态
     */
    async getStatus(requestId) {
        const request = this.transactions.get(requestId);
        return request ? request.status : null;
    }
    /**
     * 获取代理的交易历史
     */
    getAgentTransactionHistory(agentId) {
        return this.transactionHistory.get(agentId) || [];
    }
    /**
     * 添加交易状态变更监听器
     */
    addTransactionListener(agentId, listener) {
        const listeners = this.transactionListeners.get(agentId) || [];
        listeners.push(listener);
        this.transactionListeners.set(agentId, listeners);
    }
    /**
     * 移除交易状态变更监听器
     */
    removeTransactionListener(agentId, listener) {
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
    updateRequestStatus(requestId, status, result, error) {
        const request = this.transactions.get(requestId);
        if (!request) {
            throw new Error(`Transaction ${requestId} not found`);
        }
        const updatedRequest = {
            ...request,
            status,
            updatedAt: Date.now(),
            result: result ? { ...request.result, ...result } : request.result,
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
    addToHistory(agentId, request) {
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
    updateHistory(request) {
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
    notifyListeners(request) {
        const listeners = this.transactionListeners.get(request.agentId) || [];
        for (const listener of listeners) {
            try {
                listener(request);
            }
            catch (error) {
                this.logger.error(`Error in transaction listener: ${error.message}`);
            }
        }
    }
    /**
     * 按优先级排序队列
     */
    sortQueue() {
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
    getPriorityOrder(priority) {
        switch (priority) {
            case transaction_1.TransactionPriority.CRITICAL:
                return 0;
            case transaction_1.TransactionPriority.HIGH:
                return 1;
            case transaction_1.TransactionPriority.MEDIUM:
                return 2;
            case transaction_1.TransactionPriority.LOW:
                return 3;
            default:
                return 4;
        }
    }
}
exports.TransactionExecutor = TransactionExecutor;
//# sourceMappingURL=TransactionExecutor.js.map