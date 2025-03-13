"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaTransactionSender = void 0;
/**
 * Solana交易发送器实现
 */
class SolanaTransactionSender {
    constructor(logger, rpcEndpoints) {
        this.logger = logger;
        this.rpcEndpoints = rpcEndpoints;
        this.currentEndpointIndex = 0;
    }
    /**
     * 获取当前RPC端点
     */
    getCurrentEndpoint() {
        return this.rpcEndpoints[this.currentEndpointIndex];
    }
    /**
     * 切换到下一个RPC端点
     */
    switchToNextEndpoint() {
        this.currentEndpointIndex = (this.currentEndpointIndex + 1) % this.rpcEndpoints.length;
        const newEndpoint = this.getCurrentEndpoint();
        this.logger.info(`Switched to RPC endpoint: ${newEndpoint}`);
        return newEndpoint;
    }
    /**
     * 发送交易
     * @param signedTx 已签名的交易
     */
    async send(signedTx) {
        const endpoint = this.getCurrentEndpoint();
        this.logger.info(`Sending transaction to ${endpoint}`);
        try {
            // 这里应该实现实际的交易发送逻辑
            // 使用Solana web3.js库发送交易
            this.logger.debug(`Transaction details: ${JSON.stringify(signedTx).substring(0, 100)}...`);
            // 模拟发送
            const txHash = `tx_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
            this.logger.info(`Transaction sent: ${txHash}`);
            return txHash;
        }
        catch (error) {
            this.logger.error(`Failed to send transaction: ${error.message}`);
            // 如果发送失败，尝试切换RPC端点
            this.switchToNextEndpoint();
            // 重新抛出错误，让调用者处理
            throw error;
        }
    }
    /**
     * 确认交易
     * @param txHash 交易哈希
     * @param confirmations 确认数
     */
    async confirm(txHash, confirmations = 1) {
        this.logger.info(`Confirming transaction ${txHash} with ${confirmations} confirmations`);
        try {
            // 这里应该实现实际的交易确认逻辑
            // 使用Solana web3.js库确认交易
            // 模拟确认过程
            await new Promise(resolve => setTimeout(resolve, 2000));
            // 模拟确认结果
            const result = {
                success: true,
                txHash,
                blockTime: Date.now()
            };
            this.logger.info(`Transaction ${txHash} confirmed`);
            return result;
        }
        catch (error) {
            this.logger.error(`Failed to confirm transaction ${txHash}: ${error.message}`);
            // 如果确认失败，尝试切换RPC端点
            this.switchToNextEndpoint();
            // 返回失败结果
            return {
                success: false,
                txHash,
                error: error.message
            };
        }
    }
}
exports.SolanaTransactionSender = SolanaTransactionSender;
//# sourceMappingURL=SolanaTransactionSender.js.map