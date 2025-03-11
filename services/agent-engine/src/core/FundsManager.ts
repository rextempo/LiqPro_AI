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
  checkTransactionLimit(
    agentId: string,
    amount: number,
    transactionType: string
  ): Promise<boolean>;
  
  /**
   * 更新资金状态
   */
  updateFundsStatus(
    agentId: string,
    walletAddress: string,
    newStatus: Partial<FundsStatus>
  ): Promise<FundsStatus>;
  
  /**
   * 计算收益
   */
  calculateReturns(agentId: string): Promise<{
    totalReturns: number;
    dailyReturns: number;
    weeklyReturns: number;
    monthlyReturns: number;
  }>;
}

/**
 * 资金管理器实现
 */
export class SolanaFundsManager implements FundsManager {
  private logger: Logger;
  private fundsCache: Map<string, FundsStatus>; // agentId -> FundsStatus
  private transactionHistory: Map<string, {
    date: number;
    amount: number;
    type: string;
  }[]>; // agentId -> transactions
  
  // 交易限额配置
  private transactionLimits = {
    singleTransaction: 0.3, // 单笔交易上限为总资产的30%
    dailyLimit: 0.7, // 日交易限额为总资产的70%
    minSolBalance: 0.1 // 最小SOL余额
  };

  constructor(logger: Logger) {
    this.logger = logger;
    this.fundsCache = new Map<string, FundsStatus>();
    this.transactionHistory = new Map<string, { date: number; amount: number; type: string; }[]>();
  }

  /**
   * 获取资金状态
   */
  public async getFundsStatus(agentId: string, _walletAddress: string): Promise<FundsStatus> {
    // 检查缓存
    if (this.fundsCache.has(agentId)) {
      return this.fundsCache.get(agentId)!;
    }
    
    // 如果缓存中没有，则从链上获取数据
    try {
      // 这里应该实现实际的链上数据获取逻辑
      // 使用Solana web3.js库获取钱包余额和代币余额
      // 实际实现中应该使用_walletAddress获取链上数据
      
      // 模拟数据
      const fundsStatus: FundsStatus = {
        totalValueSol: 10.0,
        availableSol: 2.0,
        positions: [
          {
            poolAddress: 'pool1',
            valueUsd: 400,
            valueSol: 4.0
          },
          {
            poolAddress: 'pool2',
            valueUsd: 400,
            valueSol: 4.0
          }
        ]
      };
      
      // 更新缓存
      this.fundsCache.set(agentId, fundsStatus);
      
      return fundsStatus;
    } catch (error: any) {
      this.logger.error(`Failed to get funds status for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查交易限额
   */
  public async checkTransactionLimit(
    agentId: string,
    amount: number,
    transactionType: string
  ): Promise<boolean> {
    try {
      // 获取资金状态
      const fundsStatus = await this.getFundsStatus(agentId, '');
      
      // 检查单笔交易限额
      const singleTransactionLimit = fundsStatus.totalValueSol * this.transactionLimits.singleTransaction;
      if (amount > singleTransactionLimit) {
        this.logger.warn(
          `Transaction amount ${amount} exceeds single transaction limit ${singleTransactionLimit} for agent ${agentId}`
        );
        return false;
      }
      
      // 检查日交易限额
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const todayTransactions = (this.transactionHistory.get(agentId) || [])
        .filter(tx => tx.date >= today.getTime());
      
      const todayTotal = todayTransactions.reduce((sum, tx) => sum + tx.amount, 0);
      const dailyLimit = fundsStatus.totalValueSol * this.transactionLimits.dailyLimit;
      
      if (todayTotal + amount > dailyLimit) {
        this.logger.warn(
          `Transaction amount ${amount} would exceed daily limit ${dailyLimit} for agent ${agentId}`
        );
        return false;
      }
      
      // 检查最小SOL余额
      if (
        transactionType === 'WITHDRAW' &&
        fundsStatus.availableSol - amount < this.transactionLimits.minSolBalance
      ) {
        this.logger.warn(
          `Transaction would reduce SOL balance below minimum ${this.transactionLimits.minSolBalance} for agent ${agentId}`
        );
        return false;
      }
      
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to check transaction limit for agent ${agentId}: ${error.message}`);
      return false;
    }
  }

  /**
   * 更新资金状态
   */
  public async updateFundsStatus(
    agentId: string,
    walletAddress: string,
    newStatus: Partial<FundsStatus>
  ): Promise<FundsStatus> {
    try {
      // 获取当前状态
      const currentStatus = await this.getFundsStatus(agentId, walletAddress);
      
      // 更新状态
      const updatedStatus: FundsStatus = {
        ...currentStatus,
        ...newStatus,
        // 如果提供了新的positions，则完全替换，否则保留原来的
        positions: newStatus.positions || currentStatus.positions
      };
      
      // 更新缓存
      this.fundsCache.set(agentId, updatedStatus);
      
      this.logger.info(`Updated funds status for agent ${agentId}`);
      
      return updatedStatus;
    } catch (error: any) {
      this.logger.error(`Failed to update funds status for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 记录交易
   */
  public recordTransaction(agentId: string, amount: number, type: string): void {
    const transactions = this.transactionHistory.get(agentId) || [];
    
    transactions.push({
      date: Date.now(),
      amount,
      type
    });
    
    this.transactionHistory.set(agentId, transactions);
    
    this.logger.info(`Recorded ${type} transaction of ${amount} SOL for agent ${agentId}`);
  }

  /**
   * 计算收益
   */
  public async calculateReturns(agentId: string): Promise<{
    totalReturns: number;
    dailyReturns: number;
    weeklyReturns: number;
    monthlyReturns: number;
  }> {
    try {
      // 这里应该实现实际的收益计算逻辑
      // 需要获取历史数据并计算收益率
      
      // 模拟数据
      return {
        totalReturns: 0.15, // 15%
        dailyReturns: 0.002, // 0.2%
        weeklyReturns: 0.015, // 1.5%
        monthlyReturns: 0.06 // 6%
      };
    } catch (error: any) {
      this.logger.error(`Failed to calculate returns for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }
} 