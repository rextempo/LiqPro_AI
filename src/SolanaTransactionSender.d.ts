import { TransactionSender } from '../types/transaction';
import { TransactionResult } from '../types';
import { Logger } from '../utils/logger';
/**
 * Solana交易发送器实现
 */
export declare class SolanaTransactionSender implements TransactionSender {
    private logger;
    private rpcEndpoints;
    private currentEndpointIndex;
    constructor(logger: Logger, rpcEndpoints: string[]);
    /**
     * 获取当前RPC端点
     */
    private getCurrentEndpoint;
    /**
     * 切换到下一个RPC端点
     */
    private switchToNextEndpoint;
    /**
     * 发送交易
     * @param signedTx 已签名的交易
     */
    send(signedTx: any): Promise<string>;
    /**
     * 确认交易
     * @param txHash 交易哈希
     * @param confirmations 确认数
     */
    confirm(txHash: string, confirmations?: number): Promise<TransactionResult>;
}
