import { EventEmitter } from 'events';
import { PoolService } from './pool-service';
import { PositionMonitor } from './position-monitor';
import { Cache } from '../../utils/cache';

interface Task {
  id: string;
  name: string;
  execute: () => Promise<void>;
  interval: number;
  lastRun?: Date;
  nextRun?: Date;
  isRunning: boolean;
}

export class DataScheduler extends EventEmitter {
  private readonly poolService: PoolService;
  private readonly positionMonitor: PositionMonitor;
  private readonly cache: Cache;
  private tasks: Map<string, Task> = new Map();
  private schedulerInterval: NodeJS.Timeout | null = null;

  constructor(poolService: PoolService, positionMonitor: PositionMonitor) {
    super();
    this.poolService = poolService;
    this.positionMonitor = positionMonitor;
    this.cache = Cache.getInstance();
  }

  start(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
    }

    // 每30秒检查一次任务
    this.schedulerInterval = setInterval(() => {
      this.checkAndExecuteTasks();
    }, 30000);

    // 初始化任务
    this.initializeTasks();
  }

  stop(): void {
    if (this.schedulerInterval) {
      clearInterval(this.schedulerInterval);
      this.schedulerInterval = null;
    }
  }

  private initializeTasks(): void {
    // Top 100池子列表更新任务（5分钟）
    this.addTask({
      id: 'update_top_pools',
      name: 'Update Top 100 Pools',
      execute: async () => {
        try {
          const pools = await this.poolService.getTop100Pools();
          this.cache.set('top_pools', pools, 300000); // 5分钟缓存
          this.emit('taskSuccess', {
            taskId: 'update_top_pools',
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error updating top pools:', error);
          this.emit('taskError', {
            taskId: 'update_top_pools',
            error,
            timestamp: new Date()
          });
        }
      },
      interval: 300000 // 5分钟
    });

    // Agent持仓监控任务（5分钟）
    this.addTask({
      id: 'monitor_positions',
      name: 'Monitor Agent Positions',
      execute: async () => {
        try {
          // TODO: 从数据库获取所有活跃的Agent地址
          const agentAddresses: string[] = [];
          
          for (const address of agentAddresses) {
            await this.positionMonitor.monitorPositionPools(address);
          }
          
          this.emit('taskSuccess', {
            taskId: 'monitor_positions',
            timestamp: new Date()
          });
        } catch (error) {
          console.error('Error monitoring positions:', error);
          this.emit('taskError', {
            taskId: 'monitor_positions',
            error,
            timestamp: new Date()
          });
        }
      },
      interval: 300000 // 5分钟
    });
  }

  private addTask(task: Omit<Task, 'lastRun' | 'nextRun' | 'isRunning'>): void {
    const now = Date.now();
    this.tasks.set(task.id, {
      ...task,
      lastRun: undefined,
      nextRun: new Date(now + task.interval),
      isRunning: false
    });
  }

  private async checkAndExecuteTasks(): Promise<void> {
    const now = Date.now();

    for (const [taskId, task] of this.tasks.entries()) {
      if (task.isRunning) continue;

      if (!task.nextRun || task.nextRun.getTime() <= now) {
        await this.executeTask(taskId);
      }
    }
  }

  private async executeTask(taskId: string): Promise<void> {
    const task = this.tasks.get(taskId);
    if (!task) return;

    task.isRunning = true;
    task.lastRun = new Date();

    try {
      await task.execute();
    } catch (error) {
      console.error(`Error executing task ${taskId}:`, error);
    } finally {
      task.isRunning = false;
      task.nextRun = new Date(Date.now() + task.interval);
    }
  }

  // 获取任务状态
  getTaskStatus(taskId: string): Task | null {
    return this.tasks.get(taskId) || null;
  }

  // 获取所有任务状态
  getAllTaskStatus(): Task[] {
    return Array.from(this.tasks.values());
  }

  // 订阅任务成功事件
  subscribeToSuccess(callback: (data: { taskId: string; timestamp: Date }) => void): () => void {
    this.on('taskSuccess', callback);
    return () => this.off('taskSuccess', callback);
  }

  // 订阅任务错误事件
  subscribeToError(callback: (data: { taskId: string; error: Error; timestamp: Date }) => void): () => void {
    this.on('taskError', callback);
    return () => this.off('taskError', callback);
  }
} 