export interface TransactionResult {
    success: boolean;
    txHash?: string;
    error?: string;
    blockTime?: number;
    fee?: number;
}
export declare enum TransactionType {
    DEPOSIT = "DEPOSIT",
    WITHDRAW = "WITHDRAW",
    ADD_LIQUIDITY = "ADD_LIQUIDITY",
    REMOVE_LIQUIDITY = "REMOVE_LIQUIDITY",
    SWAP = "SWAP",
    SWAP_TO_SOL = "SWAP_TO_SOL",
    REBALANCE = "REBALANCE",
    EMERGENCY_EXIT = "EMERGENCY_EXIT"
}
export declare enum TransactionPriority {
    LOW = "LOW",
    MEDIUM = "MEDIUM",
    HIGH = "HIGH",
    CRITICAL = "CRITICAL"
}
export declare enum TransactionStatus {
    PENDING = "PENDING",
    SIGNING = "SIGNING",
    SENDING = "SENDING",
    CONFIRMING = "CONFIRMING",
    CONFIRMED = "CONFIRMED",
    FAILED = "FAILED",
    RETRYING = "RETRYING",
    CANCELLED = "CANCELLED"
}
export interface TransactionRequest {
    id: string;
    type: TransactionType;
    priority: TransactionPriority;
    status: TransactionStatus;
    data: any;
    createdAt: number;
    updatedAt: number;
    retryCount: number;
    maxRetries: number;
    agentId: string;
    result?: TransactionResult;
    error?: string;
}
export interface TransactionOptions {
    maxRetries?: number;
    retryDelay?: number[];
    timeout?: number;
    confirmations?: number;
    priority?: TransactionPriority;
}
export interface TransactionExecutor {
    execute(request: TransactionRequest, options?: TransactionOptions): Promise<TransactionResult>;
    retry(request: TransactionRequest, options?: TransactionOptions): Promise<TransactionResult>;
    cancel(requestId: string): Promise<boolean>;
    getStatus(requestId: string): Promise<TransactionStatus | null>;
}
export interface TransactionSigner {
    sign(transaction: any, walletAddress: string): Promise<any>;
    isValidSignature(signature: string): boolean;
}
export interface TransactionSender {
    send(signedTransaction: any): Promise<string>;
    confirm(txHash: string, confirmations?: number): Promise<TransactionResult>;
}
export interface TransactionBuilder {
    buildAddLiquidityTransaction(poolAddress: string, amount: number, binRange?: [number, number]): Promise<any>;
    buildRemoveLiquidityTransaction(poolAddress: string, amount: number, binRange?: [number, number]): Promise<any>;
    buildSwapTransaction(fromToken: string, toToken: string, amount: number, slippage?: number): Promise<any>;
    buildEmergencyExitTransaction(poolAddresses: string[]): Promise<any>;
}
