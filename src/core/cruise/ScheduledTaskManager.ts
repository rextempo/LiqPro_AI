import { Logger } from '../../../services/agent-engine/src/utils/logger';

/**
 * 任务接口
 */
export interface Task {
  id: string;
  handler: () => Promise<void>;
  interval: number;
  lastRun: number | null;
  nextRun: number;
  tags: string[];
  enabled: boolean;
  isRecurring: boolean;
}

/**
 * 定时任务管理器
 * 负责调度和执行定时任务
 */
export class ScheduledTaskManager {
  private logger: Logger;
  private tasks: Map<string, Task> = new Map();
  private timerId: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private checkInterval: number = 1000; // 1秒检查一次

  /**
   * 构造函数
   */
  constructor(logger: Logger) {
    this.logger = logger.child({ module: 'ScheduledTaskManager' });
    this.logger.info('ScheduledTaskManager initialized');
  }

  /**
   * 启动任务管理器
   */
  public async start(): Promise<void> {
    if (this.isRunning) {
      this.logger.info('ScheduledTaskManager is already running');
      return;
    }

    this.logger.info('Starting ScheduledTaskManager...');
    this.isRunning = true;
    this.startTaskLoop();
    this.logger.info('ScheduledTaskManager started');
  }

  /**
   * 停止任务管理器
   */
  public async stop(): Promise<void> {
    if (!this.isRunning) {
      this.logger.info('ScheduledTaskManager is not running');
      return;
    }

    this.logger.info('Stopping ScheduledTaskManager...');
    this.isRunning = false;
    
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
    
    this.logger.info('ScheduledTaskManager stopped');
  }

  /**
   * 调度一次性任务
   */
  public scheduleOneTimeTask(
    id: string,
    handler: () => Promise<void>,
    delay: number,
    tags: string[] = []
  ): string {
    const now = Date.now();
    const task: Task = {
      id,
      handler,
      interval: delay,
      lastRun: null,
      nextRun: now + delay,
      tags,
      enabled: true,
      isRecurring: false
    };

    this.tasks.set(id, task);
    this.logger.info(`Scheduled one-time task: ${id}, will run in ${delay}ms`);
    return id;
  }

  /**
   * 调度循环任务
   */
  public scheduleRecurringTask(
    id: string,
    handler: () => Promise<void>,
    interval: number,
    tags: string[] = []
  ): string {
    const now = Date.now();
    const task: Task = {
      id,
      handler,
      interval,
      lastRun: null,
      nextRun: now + interval,
      tags,
      enabled: true,
      isRecurring: true
    };

    this.tasks.set(id, task);
    this.logger.info(`Scheduled recurring task: ${id}, interval: ${interval}ms`);
    return id;
  }

  /**
   * 取消任务
   */
  public cancelTask(id: string): boolean {
    if (!this.tasks.has(id)) {
      this.logger.warn(`Cannot cancel task: ${id} - task not found`);
      return false;
    }

    this.tasks.delete(id);
    this.logger.info(`Canceled task: ${id}`);
    return true;
  }

  /**
   * 根据标签取消任务
   */
  public cancelTasksByTag(tag: string): number {
    let canceledCount = 0;
    
    for (const [id, task] of this.tasks.entries()) {
      if (task.tags.includes(tag)) {
        this.tasks.delete(id);
        canceledCount++;
      }
    }
    
    if (canceledCount > 0) {
      this.logger.info(`Canceled ${canceledCount} tasks with tag: ${tag}`);
    }
    
    return canceledCount;
  }

  /**
   * 启用任务
   */
  public enableTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) {
      this.logger.warn(`Cannot enable task: ${id} - task not found`);
      return false;
    }

    task.enabled = true;
    this.logger.info(`Enabled task: ${id}`);
    return true;
  }

  /**
   * 禁用任务
   */
  public disableTask(id: string): boolean {
    const task = this.tasks.get(id);
    if (!task) {
      this.logger.warn(`Cannot disable task: ${id} - task not found`);
      return false;
    }

    task.enabled = false;
    this.logger.info(`Disabled task: ${id}`);
    return true;
  }

  /**
   * 根据标签启用任务
   */
  public enableTasksByTag(tag: string): number {
    let enabledCount = 0;
    
    for (const task of this.tasks.values()) {
      if (task.tags.includes(tag) && !task.enabled) {
        task.enabled = true;
        enabledCount++;
      }
    }
    
    if (enabledCount > 0) {
      this.logger.info(`Enabled ${enabledCount} tasks with tag: ${tag}`);
    }
    
    return enabledCount;
  }

  /**
   * 根据标签禁用任务
   */
  public disableTasksByTag(tag: string): number {
    let disabledCount = 0;
    
    for (const task of this.tasks.values()) {
      if (task.tags.includes(tag) && task.enabled) {
        task.enabled = false;
        disabledCount++;
      }
    }
    
    if (disabledCount > 0) {
      this.logger.info(`Disabled ${disabledCount} tasks with tag: ${tag}`);
    }
    
    return disabledCount;
  }

  /**
   * 获取任务数量
   */
  public getTaskCount(): number {
    return this.tasks.size;
  }

  /**
   * 获取启用的任务数量
   */
  public getEnabledTaskCount(): number {
    let count = 0;
    for (const task of this.tasks.values()) {
      if (task.enabled) {
        count++;
      }
    }
    return count;
  }

  /**
   * 启动任务循环
   */
  private startTaskLoop(): void {
    const checkTasks = async () => {
      if (!this.isRunning) {
        return;
      }

      const now = Date.now();
      const tasksToRun: Task[] = [];

      // 找出需要执行的任务
      for (const task of this.tasks.values()) {
        if (task.enabled && task.nextRun <= now) {
          tasksToRun.push(task);
        }
      }

      // 执行任务
      for (const task of tasksToRun) {
        try {
          this.logger.debug(`Executing task: ${task.id}`);
          
          // 更新任务状态
          task.lastRun = now;
          
          if (task.isRecurring) {
            task.nextRun = now + task.interval;
          } else {
            // 一次性任务执行后删除
            this.tasks.delete(task.id);
          }
          
          // 执行任务
          await task.handler();
          
        } catch (error) {
          this.logger.error(`Error executing task ${task.id}: ${error instanceof Error ? error.message : String(error)}`);
        }
      }

      // 继续循环
      this.timerId = setTimeout(checkTasks, this.checkInterval);
    };

    // 开始第一次检查
    this.timerId = setTimeout(checkTasks, this.checkInterval);
  }
} 