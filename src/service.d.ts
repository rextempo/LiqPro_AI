/**
 * 信号服务类
 */
export class SignalService {
    /**
     * 构造函数
     * @param {Connection} connection - Solana连接实例
     * @param {Object} options - 配置选项
     * @param {number} options.historyDays - 历史数据天数
     * @param {number} options.updateInterval - 更新间隔（毫秒）
     */
    constructor(connection: Connection, options?: {
        historyDays: number;
        updateInterval: number;
    });
    connection: Connection;
    options: {
        historyDays: number;
        updateInterval: number;
        maxT1Pools: any;
        maxT2Pools: any;
        maxT3Pools: any;
    };
    sdk: MeteoraDLMMSDK;
    monitor: SignalMonitor;
    /**
     * 启动监控
     */
    startMonitoring(): void;
    memoryMonitorInterval: NodeJS.Timeout | undefined;
    reportInterval: NodeJS.Timeout | undefined;
    /**
     * 停止监控
     */
    stopMonitoring(): void;
    /**
     * 获取增强的池子数据
     * @param {Object} pool - 池子基础数据
     * @returns {Promise<Object>} 增强的池子数据
     */
    getEnhancedPoolData(pool: any): Promise<any>;
    /**
     * 分析池子
     * @param {Array} pools - 池子列表
     * @returns {Promise<Object>} 分析结果
     */
    analyzePools(pools: any[]): Promise<any>;
    /**
     * 计算池子评分
     * @param {Object} pool - 池子数据
     * @returns {Object} 带有评分的池子数据
     * @private
     */
    private _calculateScores;
}
import { Connection } from "@solana/web3.js";
import { MeteoraDLMMSDK } from "../meteora/sdk";
import { SignalMonitor } from "./monitor";
