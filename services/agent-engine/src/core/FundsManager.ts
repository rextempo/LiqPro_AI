import { Connection, PublicKey, LAMPORTS_PER_SOL } from '@solana/web3.js';
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
export class SolanaFundsManager implements FundsManager {
  private logger: Logger;
  private fundsCache: Map<string, FundsStatus>; // agentId -> FundsStatus
  private transactionHistory: Map<string, {
    date: number;
    amount: number;
    type: string;
  }[]>; // agentId -> transactions
  private connection: Connection;
  private initialInvestments: Map<string, number>; // agentId -> 初始投资金额
  private lastBalanceCheck: Map<string, { timestamp: number, balance: number }>; // walletAddress -> 上次余额检查
  private fundsSafetyListeners: Map<string, ((safe: boolean) => void)[]>; // agentId -> 资金安全监听器
  
  // 交易限额配置
  private transactionLimits = {
    singleTransaction: 0.3, // 单笔交易上限为总资产的30%
    dailyLimit: 0.7, // 日交易限额为总资产的70%
    minSolBalance: 0.1, // 最小SOL余额
    maxPositions: 5, // 最大仓位数量
    emergencyReserve: 0.05 // 紧急情况下保留的SOL余额
  };

  constructor(logger: Logger, rpcUrl: string) {
    this.logger = logger;
    this.fundsCache = new Map<string, FundsStatus>();
    this.transactionHistory = new Map<string, { date: number; amount: number; type: string; }[]>();
    this.connection = new Connection(rpcUrl, 'confirmed');
    this.initialInvestments = new Map<string, number>();
    this.lastBalanceCheck = new Map<string, { timestamp: number, balance: number }>();
    this.fundsSafetyListeners = new Map<string, ((safe: boolean) => void)[]>();
  }

  /**
   * 获取资金状态
   */
  public async getFundsStatus(agentId: string, walletAddress: string): Promise<FundsStatus> {
    try {
      // 检查缓存是否过期（5分钟）
      const cachedStatus = this.fundsCache.get(agentId);
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      if (cachedStatus && now - cachedStatus.lastUpdate < fiveMinutes) {
        return cachedStatus;
      }
      
      // 从链上获取钱包余额
      const walletBalance = await this.getWalletBalance(walletAddress);
      
      // 获取仓位信息
      const positions = await this.getPositions(agentId, walletAddress);
      
      // 计算总价值
      const totalValueSol = walletBalance + positions.reduce((sum, pos) => sum + pos.valueSol, 0);
      
      // 创建资金状态
      const fundsStatus: FundsStatus = {
        totalValueSol,
        availableSol: walletBalance,
        positions,
        lastUpdate: now
      };
      
      // 更新缓存
      this.fundsCache.set(agentId, fundsStatus);
      
      // 检查资金安全
      this.checkFundsSafety(agentId);
      
      return fundsStatus;
    } catch (error: any) {
      this.logger.error(`Failed to get funds status for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取钱包余额
   */
  public async getWalletBalance(walletAddress: string): Promise<number> {
    try {
      const publicKey = new PublicKey(walletAddress);
      const balance = await this.connection.getBalance(publicKey);
      const solBalance = balance / LAMPORTS_PER_SOL;
      
      // 记录余额检查
      this.lastBalanceCheck.set(walletAddress, {
        timestamp: Date.now(),
        balance: solBalance
      });
      
      return solBalance;
    } catch (error: any) {
      this.logger.error(`Failed to get wallet balance for ${walletAddress}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 获取仓位信息
   */
  private async getPositions(agentId: string, walletAddress: string): Promise<{
    poolAddress: string;
    valueUsd: number;
    valueSol: number;
  }[]> {
    try {
      // 这里应该实现实际的链上数据获取逻辑
      // 使用Meteora SDK获取LP仓位信息
      
      // 模拟数据
      const cachedStatus = this.fundsCache.get(agentId);
      if (cachedStatus) {
        return cachedStatus.positions;
      }
      
      return [];
    } catch (error: any) {
      this.logger.error(`Failed to get positions for agent ${agentId}: ${error.message}`);
      return [];
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
        (transactionType === 'WITHDRAW' || transactionType === 'ADD_LIQUIDITY' || transactionType === 'SWAP') &&
        fundsStatus.availableSol - amount < this.transactionLimits.minSolBalance
      ) {
        this.logger.warn(
          `Transaction would reduce SOL balance below minimum ${this.transactionLimits.minSolBalance} for agent ${agentId}`
        );
        return false;
      }
      
      // 检查最大仓位数量
      if (
        transactionType === 'ADD_LIQUIDITY' &&
        fundsStatus.positions.length >= this.transactionLimits.maxPositions
      ) {
        this.logger.warn(
          `Cannot add more positions, already at maximum ${this.transactionLimits.maxPositions} for agent ${agentId}`
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
        positions: newStatus.positions || currentStatus.positions,
        // 更新时间戳
        lastUpdate: Date.now()
      };
      
      // 更新缓存
      this.fundsCache.set(agentId, updatedStatus);
      
      this.logger.info(`Updated funds status for agent ${agentId}`);
      
      // 检查资金安全
      this.checkFundsSafety(agentId);
      
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
    
    // 限制历史记录大小
    if (transactions.length > 1000) {
      transactions.shift();
    }
    
    this.transactionHistory.set(agentId, transactions);
    
    this.logger.info(`Recorded ${type} transaction of ${amount} SOL for agent ${agentId}`);
    
    // 如果是存款交易，更新初始投资金额
    if (type === 'DEPOSIT') {
      const currentInvestment = this.initialInvestments.get(agentId) || 0;
      this.initialInvestments.set(agentId, currentInvestment + amount);
    }
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
      // 获取当前资金状态
      const fundsStatus = this.fundsCache.get(agentId);
      if (!fundsStatus) {
        throw new Error(`No funds status found for agent ${agentId}`);
      }
      
      // 获取初始投资金额
      const initialInvestment = this.initialInvestments.get(agentId) || 0;
      if (initialInvestment === 0) {
        return {
          totalReturns: 0,
          dailyReturns: 0,
          weeklyReturns: 0,
          monthlyReturns: 0
        };
      }
      
      // 计算总收益率
      const totalValue = fundsStatus.totalValueSol;
      const totalReturns = (totalValue - initialInvestment) / initialInvestment;
      
      // 获取交易历史
      const transactions = this.transactionHistory.get(agentId) || [];
      
      // 计算日收益率
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      const dayTransactions = transactions.filter(tx => tx.date >= oneDayAgo);
      const dayFees = dayTransactions
        .filter(tx => tx.type === 'FEE')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const dailyReturns = dayFees / totalValue;
      
      // 计算周收益率
      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      const weekTransactions = transactions.filter(tx => tx.date >= oneWeekAgo);
      const weekFees = weekTransactions
        .filter(tx => tx.type === 'FEE')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const weeklyReturns = weekFees / totalValue;
      
      // 计算月收益率
      const oneMonthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const monthTransactions = transactions.filter(tx => tx.date >= oneMonthAgo);
      const monthFees = monthTransactions
        .filter(tx => tx.type === 'FEE')
        .reduce((sum, tx) => sum + tx.amount, 0);
      const monthlyReturns = monthFees / totalValue;
      
      return {
        totalReturns,
        dailyReturns,
        weeklyReturns,
        monthlyReturns
      };
    } catch (error: any) {
      this.logger.error(`Failed to calculate returns for agent ${agentId}: ${error.message}`);
      throw error;
    }
  }

  /**
   * 检查资金安全
   */
  public async checkFundsSafety(agentId: string): Promise<boolean> {
    try {
      const fundsStatus = this.fundsCache.get(agentId);
      if (!fundsStatus) {
        return true; // 没有资金状态，默认安全
      }
      
      // 检查可用SOL是否低于紧急储备
      const isSafe = fundsStatus.availableSol >= this.transactionLimits.emergencyReserve;
      
      // 如果不安全，通知监听器
      if (!isSafe) {
        this.logger.warn(`Funds safety check failed for agent ${agentId}: available SOL ${fundsStatus.availableSol} < emergency reserve ${this.transactionLimits.emergencyReserve}`);
        this.notifyFundsSafetyListeners(agentId, false);
      }
      
      return isSafe;
    } catch (error: any) {
      this.logger.error(`Failed to check funds safety for agent ${agentId}: ${error.message}`);
      return false;
    }
  }

  /**
   * 添加资金安全监听器
   */
  public addFundsSafetyListener(agentId: string, listener: (safe: boolean) => void): void {
    const listeners = this.fundsSafetyListeners.get(agentId) || [];
    listeners.push(listener);
    this.fundsSafetyListeners.set(agentId, listeners);
  }

  /**
   * 移除资金安全监听器
   */
  public removeFundsSafetyListener(agentId: string, listener: (safe: boolean) => void): void {
    const listeners = this.fundsSafetyListeners.get(agentId) || [];
    const index = listeners.indexOf(listener);
    
    if (index !== -1) {
      listeners.splice(index, 1);
      this.fundsSafetyListeners.set(agentId, listeners);
    }
  }

  /**
   * 通知资金安全监听器
   */
  private notifyFundsSafetyListeners(agentId: string, safe: boolean): void {
    const listeners = this.fundsSafetyListeners.get(agentId) || [];
    
    for (const listener of listeners) {
      try {
        listener(safe);
      } catch (error: any) {
        this.logger.error(`Error in funds safety listener: ${error.message}`);
      }
    }
  }

  /**
   * 设置初始投资金额
   */
  public setInitialInvestment(agentId: string, amount: number): void {
    this.initialInvestments.set(agentId, amount);
  }

  /**
   * 获取初始投资金额
   */
  public getInitialInvestment(agentId: string): number {
    return this.initialInvestments.get(agentId) || 0;
  }

  /**
   * 获取交易历史
   */
  public getTransactionHistory(agentId: string): {
    date: number;
    amount: number;
    type: string;
  }[] {
    return this.transactionHistory.get(agentId) || [];
  }

  /**
   * 清除缓存
   */
  public clearCache(agentId?: string): void {
    if (agentId) {
      this.fundsCache.delete(agentId);
    } else {
      this.fundsCache.clear();
    }
  }
} 