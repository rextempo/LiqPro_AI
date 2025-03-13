"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScheduledTaskManager = void 0;
/**
 * 定时任务管理器
 * 负责调度和执行定时任务
 */
class ScheduledTaskManager {
    /**
     * 构造函数
     */
    constructor(logger) {
        this.tasks = new Map();
        this.intervalId = null;
        this.isRunning = false;
        this.logger = logger.child({ module: 'ScheduledTaskManager' });
        this.logger.info('ScheduledTaskManager initialized');
    }
    /**
     * 启动任务管理器
     */
    start() {
        if (this.isRunning) {
            this.logger.info('ScheduledTaskManager is already running');
            return;
        }
        this.logger.info('Starting ScheduledTaskManager');
        this.isRunning = true;
        // 每秒检查一次是否有任务需要执行
        this.intervalId = setInterval(() => {
            this.checkAndRunTasks();
        }, 1000);
    }
    /**
     * 停止任务管理器
     */
    stop() {
        if (!this.isRunning) {
            this.logger.info('ScheduledTaskManager is not running');
            return;
        }
        this.logger.info('Stopping ScheduledTaskManager');
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.isRunning = false;
    }
    /**
     * 检查并执行到期的任务
     */
    checkAndRunTasks() {
        const now = Date.now();
        this.tasks.forEach(async (task) => {
            if (task.enabled && task.nextRun <= now) {
                try {
                    this.logger.debug(`Executing task: ${task.id}`);
                    task.lastRun = now;
                    // 如果是重复任务，更新下次执行时间
                    if (task.isRecurring) {
                        task.nextRun = now + task.interval;
                    }
                    else {
                        // 一次性任务执行后禁用
                        task.enabled = false;
                    }
                    await task.handler();
                    this.logger.debug(`Task ${task.id} executed successfully`);
                }
                catch (error) {
                    this.logger.error(`Error executing task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
                }
            }
        });
    }
    /**
     * 调度一次性任务
     * @param id 任务ID
     * @param handler 任务处理函数
     * @param delayMs 延迟执行时间（毫秒）
     * @param tags 任务标签
     * @returns 任务ID
     */
    scheduleTask(id, handler, delayMs = 0, tags = []) {
        const now = Date.now();
        const task = {
            id,
            handler,
            interval: delayMs,
            lastRun: 0,
            nextRun: now + delayMs,
            tags,
            enabled: true,
            isRecurring: false
        };
        this.tasks.set(id, task);
        this.logger.info(`Scheduled one-time task: ${id} to run in ${delayMs}ms`);
        return id;
    }
    /**
     * 调度重复执行的任务
     * @param id 任务ID
     * @param handler 任务处理函数
     * @param intervalMs 重复间隔（毫秒）
     * @param startDelayMs 首次执行延迟（毫秒）
     * @param tags 任务标签
     * @returns 任务ID
     */
    scheduleRecurringTask(id, handler, intervalMs, startDelayMs = 0, tags = []) {
        const now = Date.now();
        const task = {
            id,
            handler,
            interval: intervalMs,
            lastRun: 0,
            nextRun: now + (startDelayMs || intervalMs),
            tags,
            enabled: true,
            isRecurring: true
        };
        this.tasks.set(id, task);
        this.logger.info(`Scheduled recurring task: ${id} with interval ${intervalMs}ms`);
        return id;
    }
    /**
     * 取消任务
     * @param id 任务ID
     * @returns 是否成功取消
     */
    cancelTask(id) {
        const result = this.tasks.delete(id);
        if (result) {
            this.logger.info(`Cancelled task: ${id}`);
        }
        else {
            this.logger.warn(`Failed to cancel task: ${id} - task not found`);
        }
        return result;
    }
    /**
     * 启用任务
     * @param id 任务ID
     * @returns 是否成功启用
     */
    enableTask(id) {
        const task = this.tasks.get(id);
        if (task) {
            task.enabled = true;
            this.logger.info(`Enabled task: ${id}`);
            return true;
        }
        else {
            this.logger.warn(`Failed to enable task: ${id} - task not found`);
            return false;
        }
    }
    /**
     * 禁用任务
     * @param id 任务ID
     * @returns 是否成功禁用
     */
    disableTask(id) {
        const task = this.tasks.get(id);
        if (task) {
            task.enabled = false;
            this.logger.info(`Disabled task: ${id}`);
            return true;
        }
        else {
            this.logger.warn(`Failed to disable task: ${id} - task not found`);
            return false;
        }
    }
    /**
     * 根据标签启用任务
     * @param tag 任务标签
     * @returns 启用的任务数量
     */
    enableTasksByTag(tag) {
        let count = 0;
        this.tasks.forEach(task => {
            if (task.tags.includes(tag)) {
                task.enabled = true;
                count++;
            }
        });
        this.logger.info(`Enabled ${count} tasks with tag: ${tag}`);
        return count;
    }
    /**
     * 根据标签禁用任务
     * @param tag 任务标签
     * @returns 禁用的任务数量
     */
    disableTasksByTag(tag) {
        let count = 0;
        this.tasks.forEach(task => {
            if (task.tags.includes(tag)) {
                task.enabled = false;
                count++;
            }
        });
        this.logger.info(`Disabled ${count} tasks with tag: ${tag}`);
        return count;
    }
    /**
     * 获取任务总数
     * @returns 任务总数
     */
    getTaskCount() {
        return this.tasks.size;
    }
    /**
     * 获取已启用任务数量
     * @returns 已启用任务数量
     */
    getEnabledTaskCount() {
        let count = 0;
        this.tasks.forEach(task => {
            if (task.enabled) {
                count++;
            }
        });
        return count;
    }
    /**
     * 获取特定标签的任务数量
     * @param tag 任务标签
     * @returns 具有指定标签的任务数量
     */
    getTaskCountByTag(tag) {
        let count = 0;
        this.tasks.forEach(task => {
            if (task.tags.includes(tag)) {
                count++;
            }
        });
        return count;
    }
    /**
     * 获取特定标签的已启用任务数量
     * @param tag 任务标签
     * @returns 具有指定标签的已启用任务数量
     */
    getEnabledTaskCountByTag(tag) {
        let count = 0;
        this.tasks.forEach(task => {
            if (task.enabled && task.tags.includes(tag)) {
                count++;
            }
        });
        return count;
    }
}
exports.ScheduledTaskManager = ScheduledTaskManager;
//# sourceMappingURL=ScheduledTaskManager.js.map