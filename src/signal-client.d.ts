import { BaseClient } from './base-client';
import { SignalType, TimeFrame } from '../types/signal';
/**
 * 信号过滤选项接口
 */
export interface SignalFilterOptions {
    poolAddresses?: string[];
    signalTypes?: SignalType[];
    minStrength?: number;
    timeframes?: TimeFrame[];
    minReliability?: number;
    fromTimestamp?: number;
    toTimestamp?: number;
    metadata?: Record<string, any>;
    limit?: number;
    offset?: number;
}
/**
 * 信号接口
 */
export interface Signal {
    id: string;
    type: SignalType;
    poolAddress: string;
    strength: number;
    reliability: number;
    timeframe: TimeFrame;
    timestamp: number;
    expirationTimestamp?: number;
    metadata?: Record<string, any>;
}
/**
 * 信号服务客户端
 * 用于与信号服务通信
 */
export declare class SignalClient extends BaseClient {
    /**
     * 创建信号服务客户端实例
     * @param baseUrl 信号服务基础URL
     * @param timeout 请求超时时间(毫秒)
     */
    constructor(baseUrl: string, timeout?: number);
    /**
     * 获取信号列表
     * @param options 过滤选项
     * @returns 信号列表
     */
    getSignals(options?: SignalFilterOptions): Promise<Signal[]>;
    /**
     * 获取单个信号
     * @param id 信号ID
     * @returns 信号详情
     */
    getSignal(id: string): Promise<Signal>;
    /**
     * 获取特定池的信号
     * @param poolAddress 池地址
     * @param options 过滤选项
     * @returns 信号列表
     */
    getPoolSignals(poolAddress: string, options?: Omit<SignalFilterOptions, 'poolAddresses'>): Promise<Signal[]>;
    /**
     * 获取最新信号
     * @param options 过滤选项
     * @returns 最新信号列表
     */
    getLatestSignals(options?: SignalFilterOptions): Promise<Signal[]>;
    /**
     * 获取历史信号
     * @param options 过滤选项
     * @returns 历史信号列表
     */
    getHistoricalSignals(options?: SignalFilterOptions): Promise<Signal[]>;
    /**
     * 获取信号统计信息
     * @param poolAddress 池地址(可选)
     * @returns 信号统计信息
     */
    getSignalStats(poolAddress?: string): Promise<any>;
}
