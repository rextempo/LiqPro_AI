import { FundsStatus } from '../types';
import { Logger } from '../utils/logger';
/**
 * 资金管理器接口
 */
export interface FundsManager {
    /**
     * 获取资金状态
     */
    getFundsStatus(agentId: string, walletAddress: string): Promise<FundsStatus>;
    /**
     * 检查交易限额
     */
    checkTransactionLimit(agentId: string, amount: number, transactionType: string): Promise<boolean>;
    /**
     * 更新资金状态
     */
    updateFundsStatus(agentId: string, walletAddress: string, newStatus: Partial<FundsStatus>): Promise<FundsStatus>;
    /**
     * 计算收益
     */
    calculateReturns(agentId: string): Promise<{
        totalReturns: number;
        dailyReturns: number;
        weeklyReturns: number;
        monthlyReturns: number;
    }>;
    /**
     * 记录交易
     */
    recordTransaction(agentId: string, amount: number, type: string): void;
    /**
     * 获取钱包余额
     */
    getWalletBalance(walletAddress: string): Promise<number>;
    /**
     * 检查资金安全
     */
    checkFundsSafety(agentId: string): Promise<boolean>;
}
/**
 * 资金管理器实现
 */
export declare class SolanaFundsManager implements FundsManager {
    private logger;
    private fundsCache;
    private transactionHistory;
    private connection;
    private initialInvestments;
    private lastBalanceCheck;
    private fundsSafetyListeners;
    private transactionLimits;
    constructor(logger: Logger, rpcUrl: string);
    /**
     * 获取资金状态
     */
    getFundsStatus(agentId: string, _walletAddress: string): Promise<FundsStatus>;
    /**
     * 获取钱包余额
     */
    getWalletBalance(walletAddress: string): Promise<number>;
    /**
     * 获取仓位信息
     */
    private getPositions;
    /**
     * 检查交易限额
     */
    checkTransactionLimit(agentId: string, amount: number, transactionType: string): Promise<boolean>;
    /**
     * 更新资金状态
     */
    updateFundsStatus(agentId: string, walletAddress: string, newStatus: Partial<FundsStatus>): Promise<FundsStatus>;
    /**
     * 记录交易
     */
    recordTransaction(agentId: string, amount: number, type: string): void;
    /**
     * 计算收益
     */
    calculateReturns(agentId: string): Promise<{
        totalReturns: number;
        dailyReturns: number;
        weeklyReturns: number;
        monthlyReturns: number;
    }>;
    /**
     * 检查资金安全
     */
    checkFundsSafety(agentId: string): Promise<boolean>;
    /**
     * 添加资金安全监听器
     */
    addFundsSafetyListener(agentId: string, listener: (safe: boolean) => void): void;
    /**
     * 移除资金安全监听器
     */
    removeFundsSafetyListener(agentId: string, listener: (safe: boolean) => void): void;
    /**
     * 通知资金安全监听器
     */
    private notifyFundsSafetyListeners;
    /**
     * 设置初始投资金额
     */
    setInitialInvestment(agentId: string, amount: number): void;
    /**
     * 获取初始投资金额
     */
    getInitialInvestment(agentId: string): number;
    /**
     * 获取交易历史
     */
    getTransactionHistory(agentId: string): {
        date: number;
        amount: number;
        type: string;
    }[];
    /**
     * 清除缓存
     */
    clearCache(agentId?: string): void;
}
