/**
 * Meteora DLMM SDK类
 * 提供与Meteora DLMM池交互的方法
 */
export class MeteoraDLMMSDK {
    /**
     * 构造函数
     * @param {Connection} connection - Solana连接实例
     */
    constructor(connection: Connection);
    connection: Connection;
    /**
     * 获取所有池子
     * @returns {Promise<Array>} 池子列表
     */
    getAllPools(): Promise<any[]>;
    /**
     * 获取活跃bin信息
     * @param {string} poolAddress - 池子地址
     * @returns {Promise<Object>} bin信息
     */
    getActiveBinInfo(poolAddress: string): Promise<any>;
    /**
     * 获取bin分布
     * @param {string} poolAddress - 池子地址
     * @param {number} binId - bin ID
     * @param {number} range - 范围
     * @returns {Promise<Object>} bin分布
     */
    getBinsDistribution(poolAddress: string, binId: number, range: number): Promise<any>;
    /**
     * 获取池子费用信息
     * @param {string} poolAddress - 池子地址
     * @returns {Promise<Object>} 费用信息
     */
    getPoolFeeInfo(poolAddress: string): Promise<any>;
    /**
     * 获取流动性分布
     * @param {string} poolAddress - 池子地址
     * @returns {Promise<Object>} 流动性分布
     */
    getLiquidityDistribution(poolAddress: string): Promise<any>;
    /**
     * 获取价格历史
     * @param {string} poolAddress - 池子地址
     * @param {number} days - 天数
     * @returns {Promise<Array>} 价格历史
     */
    getPriceHistory(poolAddress: string, days: number): Promise<any[]>;
    /**
     * 获取收益率历史
     * @param {string} poolAddress - 池子地址
     * @param {number} days - 天数
     * @returns {Promise<Array>} 收益率历史
     */
    getYieldHistory(poolAddress: string, days: number): Promise<any[]>;
    /**
     * 获取交易量历史
     * @param {string} poolAddress - 池子地址
     * @param {number} days - 天数
     * @returns {Promise<Array>} 交易量历史
     */
    getVolumeHistory(poolAddress: string, days: number): Promise<any[]>;
    /**
     * 获取流动性历史
     * @param {string} poolAddress - 池子地址
     * @param {number} days - 天数
     * @returns {Promise<Array>} 流动性历史
     */
    getLiquidityHistory(poolAddress: string, days: number): Promise<any[]>;
}
import { Connection } from '@solana/web3.js';
