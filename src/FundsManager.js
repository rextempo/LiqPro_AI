"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SolanaFundsManager = void 0;
const web3_js_1 = require("@solana/web3.js");
/**
 * 资金管理器实现
 */
class SolanaFundsManager {
    constructor(logger, rpcUrl) {
        // 交易限额配置
        this.transactionLimits = {
            singleTransaction: 0.3, // 单笔交易上限为总资产的30%
            dailyLimit: 0.7, // 日交易限额为总资产的70%
            minSolBalance: 0.1, // 最小SOL余额
            maxPositions: 5, // 最大仓位数量
            emergencyReserve: 0.05 // 紧急情况下保留的SOL余额
        };
        this.logger = logger;
        this.fundsCache = new Map();
        this.transactionHistory = new Map();
        this.connection = new web3_js_1.Connection(rpcUrl, 'confirmed');
        this.initialInvestments = new Map();
        this.lastBalanceCheck = new Map();
        this.fundsSafetyListeners = new Map();
    }
    /**
     * 获取资金状态
     */
    async getFundsStatus(agentId, _walletAddress) {
        // 检查缓存
        const cachedStatus = this.fundsCache.get(agentId);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        // 如果缓存存在且不超过5分钟，返回缓存的状态
        if (cachedStatus && cachedStatus.lastUpdate && now - cachedStatus.lastUpdate < fiveMinutes) {
            this.logger.debug(`Returning cached funds status for agent ${agentId}`);
            return cachedStatus;
        }
        // 实际实现应该从区块链获取数据
        // 这里使用模拟数据
        const status = {
            totalValueUsd: 1000.0,
            totalValueSol: 100.0,
            availableSol: 10.0,
            positions: await this.getPositions(agentId, _walletAddress),
            lastUpdate: Date.now()
        };
        // 更新缓存
        this.fundsCache.set(agentId, status);
        return status;
    }
    /**
     * 获取钱包余额
     */
    async getWalletBalance(walletAddress) {
        try {
            const publicKey = new web3_js_1.PublicKey(walletAddress);
            const balance = await this.connection.getBalance(publicKey);
            const solBalance = balance / web3_js_1.LAMPORTS_PER_SOL;
            // 记录余额检查
            this.lastBalanceCheck.set(walletAddress, {
                timestamp: Date.now(),
                balance: solBalance
            });
            return solBalance;
        }
        catch (error) {
            this.logger.error(`Failed to get wallet balance for ${walletAddress}: ${error.message}`);
            throw error;
        }
    }
    /**
     * 获取仓位信息
     */
    async getPositions(_agentId, _walletAddress) {
        // 实际实现应该从区块链获取数据
        // 这里使用模拟数据
        return [
            {
                poolAddress: 'pool1',
                valueUsd: 500.0,
                valueSol: 5.0
            },
            {
                poolAddress: 'pool2',
                valueUsd: 500.0,
                valueSol: 5.0
            }
        ];
    }
    /**
     * 检查交易限额
     */
    async checkTransactionLimit(agentId, amount, transactionType) {
        try {
            // 获取资金状态
            const fundsStatus = await this.getFundsStatus(agentId, '');
            // 检查单笔交易限额
            const singleTransactionLimit = fundsStatus.totalValueSol * this.transactionLimits.singleTransaction;
            if (amount > singleTransactionLimit) {
                this.logger.warn(`Transaction amount ${amount} exceeds single transaction limit ${singleTransactionLimit} for agent ${agentId}`);
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
                this.logger.warn(`Transaction amount ${amount} would exceed daily limit ${dailyLimit} for agent ${agentId}`);
                return false;
            }
            // 检查最小SOL余额
            if ((transactionType === 'WITHDRAW' || transactionType === 'ADD_LIQUIDITY' || transactionType === 'SWAP') &&
                fundsStatus.availableSol - amount < this.transactionLimits.minSolBalance) {
                this.logger.warn(`Transaction would reduce SOL balance below minimum ${this.transactionLimits.minSolBalance} for agent ${agentId}`);
                return false;
            }
            // 检查最大仓位数量
            if (transactionType === 'ADD_LIQUIDITY' &&
                fundsStatus.positions.length >= this.transactionLimits.maxPositions) {
                this.logger.warn(`Cannot add more positions, already at maximum ${this.transactionLimits.maxPositions} for agent ${agentId}`);
                return false;
            }
            return true;
        }
        catch (error) {
            this.logger.error(`Failed to check transaction limit for agent ${agentId}: ${error.message}`);
            return false;
        }
    }
    /**
     * 更新资金状态
     */
    async updateFundsStatus(agentId, walletAddress, newStatus) {
        try {
            // 获取当前状态
            const currentStatus = await this.getFundsStatus(agentId, walletAddress);
            // 更新状态
            const updatedStatus = {
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
        }
        catch (error) {
            this.logger.error(`Failed to update funds status for agent ${agentId}: ${error.message}`);
            throw error;
        }
    }
    /**
     * 记录交易
     */
    recordTransaction(agentId, amount, type) {
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
    async calculateReturns(agentId) {
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
        }
        catch (error) {
            this.logger.error(`Failed to calculate returns for agent ${agentId}: ${error.message}`);
            throw error;
        }
    }
    /**
     * 检查资金安全
     */
    async checkFundsSafety(agentId) {
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
        }
        catch (error) {
            this.logger.error(`Failed to check funds safety for agent ${agentId}: ${error.message}`);
            return false;
        }
    }
    /**
     * 添加资金安全监听器
     */
    addFundsSafetyListener(agentId, listener) {
        const listeners = this.fundsSafetyListeners.get(agentId) || [];
        listeners.push(listener);
        this.fundsSafetyListeners.set(agentId, listeners);
    }
    /**
     * 移除资金安全监听器
     */
    removeFundsSafetyListener(agentId, listener) {
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
    notifyFundsSafetyListeners(agentId, safe) {
        const listeners = this.fundsSafetyListeners.get(agentId) || [];
        for (const listener of listeners) {
            try {
                listener(safe);
            }
            catch (error) {
                this.logger.error(`Error in funds safety listener: ${error.message}`);
            }
        }
    }
    /**
     * 设置初始投资金额
     */
    setInitialInvestment(agentId, amount) {
        this.initialInvestments.set(agentId, amount);
    }
    /**
     * 获取初始投资金额
     */
    getInitialInvestment(agentId) {
        return this.initialInvestments.get(agentId) || 0;
    }
    /**
     * 获取交易历史
     */
    getTransactionHistory(agentId) {
        return this.transactionHistory.get(agentId) || [];
    }
    /**
     * 清除缓存
     */
    clearCache(agentId) {
        if (agentId) {
            this.fundsCache.delete(agentId);
        }
        else {
            this.fundsCache.clear();
        }
    }
}
exports.SolanaFundsManager = SolanaFundsManager;
//# sourceMappingURL=FundsManager.js.map