import { TransactionSigner } from '../types/transaction';
import { Logger } from '../utils/logger';
/**
 * Solana交易签名器实现
 */
export declare class SolanaTransactionSigner implements TransactionSigner {
    private logger;
    private walletSecrets;
    constructor(logger: Logger);
    /**
     * 注册钱包
     * @param walletAddress 钱包地址
     * @param privateKey 私钥
     */
    registerWallet(walletAddress: string, privateKey: string): void;
    /**
     * 签名交易
     * @param transaction 待签名的交易
     * @param walletAddress 钱包地址
     */
    sign(transaction: any, walletAddress: string): Promise<any>;
    /**
     * 验证签名是否有效
     * @param signature 签名
     */
    isValidSignature(signature: string): boolean;
}
