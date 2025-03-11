import { TransactionResult } from './index';

// 交易类型枚举
export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  ADD_LIQUIDITY = 'ADD_LIQUIDITY',
  REMOVE_LIQUIDITY = 'REMOVE_LIQUIDITY',
  SWAP = 'SWAP',
  REBALANCE = 'REBALANCE',
  EMERGENCY_EXIT = 'EMERGENCY_EXIT'
}

// 交易优先级枚举
export enum TransactionPriority {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

// 交易状态枚举
export enum TransactionStatus {
  PENDING = 'PENDING',
  SIGNING = 'SIGNING',
  SENDING = 'SENDING',
  CONFIRMING = 'CONFIRMING',
  CONFIRMED = 'CONFIRMED',
  FAILED = 'FAILED',
  RETRYING = 'RETRYING',
  CANCELLED = 'CANCELLED'
}

// 交易请求接口
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

// 交易选项接口
export interface TransactionOptions {
  maxRetries?: number;
  retryDelay?: number[];
  timeout?: number;
  confirmations?: number;
  priority?: TransactionPriority;
}

// 交易执行器接口
export interface TransactionExecutor {
  execute(request: TransactionRequest, options?: TransactionOptions): Promise<TransactionResult>;
  retry(request: TransactionRequest, options?: TransactionOptions): Promise<TransactionResult>;
  cancel(requestId: string): Promise<boolean>;
  getStatus(requestId: string): Promise<TransactionStatus | null>;
}

// 交易签名器接口
export interface TransactionSigner {
  sign(transaction: any, walletAddress: string): Promise<any>;
  isValidSignature(signature: string): boolean;
}

// 交易发送器接口
export interface TransactionSender {
  send(signedTransaction: any): Promise<string>;
  confirm(txHash: string, confirmations?: number): Promise<TransactionResult>;
}

// 交易构建器接口
export interface TransactionBuilder {
  buildAddLiquidityTransaction(poolAddress: string, amount: number, binRange?: [number, number]): Promise<any>;
  buildRemoveLiquidityTransaction(poolAddress: string, amount: number, binRange?: [number, number]): Promise<any>;
  buildSwapTransaction(fromToken: string, toToken: string, amount: number, slippage?: number): Promise<any>;
  buildEmergencyExitTransaction(poolAddresses: string[]): Promise<any>;
} 