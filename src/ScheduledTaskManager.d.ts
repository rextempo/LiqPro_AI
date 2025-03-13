import { Logger } from '../../utils/logger';
/**
 * 任务接口
 */
export interface Task {
    id: string;
    handler: () => Promise<void>;
    interval: number;
    lastRun: number;
    nextRun: number;
    tags: string[];
    enabled: boolean;
    isRecurring: boolean;
}
/**
 * 定时任务管理器
 * 负责调度和执行定时任务
 */
export declare class ScheduledTaskManager {
    private logger;
    private tasks;
    private intervalId;
    private isRunning;
    /**
     * 构造函数
     */
    constructor(logger: Logger);
    /**
     * 启动任务管理器
     */
    start(): void;
    /**
     * 停止任务管理器
     */
    stop(): void;
    /**
     * 检查并执行到期的任务
     */
    private checkAndRunTasks;
    /**
     * 调度一次性任务
     * @param id 任务ID
     * @param handler 任务处理函数
     * @param delayMs 延迟执行时间（毫秒）
     * @param tags 任务标签
     * @returns 任务ID
     */
    scheduleTask(id: string, handler: () => Promise<void>, delayMs?: number, tags?: string[]): string;
    /**
     * 调度重复执行的任务
     * @param id 任务ID
     * @param handler 任务处理函数
     * @param intervalMs 重复间隔（毫秒）
     * @param startDelayMs 首次执行延迟（毫秒）
     * @param tags 任务标签
     * @returns 任务ID
     */
    scheduleRecurringTask(id: string, handler: () => Promise<void>, intervalMs: number, startDelayMs?: number, tags?: string[]): string;
    /**
     * 取消任务
     * @param id 任务ID
     * @returns 是否成功取消
     */
    cancelTask(id: string): boolean;
    /**
     * 启用任务
     * @param id 任务ID
     * @returns 是否成功启用
     */
    enableTask(id: string): boolean;
    /**
     * 禁用任务
     * @param id 任务ID
     * @returns 是否成功禁用
     */
    disableTask(id: string): boolean;
    /**
     * 根据标签启用任务
     * @param tag 任务标签
     * @returns 启用的任务数量
     */
    enableTasksByTag(tag: string): number;
    /**
     * 根据标签禁用任务
     * @param tag 任务标签
     * @returns 禁用的任务数量
     */
    disableTasksByTag(tag: string): number;
    /**
     * 获取任务总数
     * @returns 任务总数
     */
    getTaskCount(): number;
    /**
     * 获取已启用任务数量
     * @returns 已启用任务数量
     */
    getEnabledTaskCount(): number;
    /**
     * 获取特定标签的任务数量
     * @param tag 任务标签
     * @returns 具有指定标签的任务数量
     */
    getTaskCountByTag(tag: string): number;
    /**
     * 获取特定标签的已启用任务数量
     * @param tag 任务标签
     * @returns 具有指定标签的已启用任务数量
     */
    getEnabledTaskCountByTag(tag: string): number;
}
