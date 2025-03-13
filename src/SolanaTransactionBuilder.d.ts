import { TransactionBuilder } from '../types/transaction';
import { Logger } from '../utils/logger';
/**
 * Solana交易构建器实现
 */
export declare class SolanaTransactionBuilder implements TransactionBuilder {
    private logger;
    constructor(logger: Logger);
    /**
     * 构建添加流动性交易
     * @param poolAddress Meteora池子地址
     * @param amount 添加的金额
     * @param binRange 可选的bin范围
     */
    buildAddLiquidityTransaction(poolAddress: string, amount: number, binRange?: [number, number]): Promise<any>;
    /**
     * 构建移除流动性交易
     * @param poolAddress Meteora池子地址
     * @param amount 移除的金额
     * @param binRange 可选的bin范围
     */
    buildRemoveLiquidityTransaction(poolAddress: string, amount: number, binRange?: [number, number]): Promise<any>;
    /**
     * 构建交换交易
     * @param fromToken 源代币
     * @param toToken 目标代币
     * @param amount 交换金额
     * @param slippage 滑点容忍度
     */
    buildSwapTransaction(fromToken: string, toToken: string, amount: number, slippage?: number): Promise<any>;
    /**
     * 构建紧急退出交易
     * @param poolAddresses 需要退出的池子地址列表
     */
    buildEmergencyExitTransaction(poolAddresses: string[]): Promise<any>;
}
