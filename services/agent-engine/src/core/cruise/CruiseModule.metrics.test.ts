import { CruiseModule } from './CruiseModule';
import { ScheduledTaskManager } from './ScheduledTaskManager';
import { PositionOptimizer } from './PositionOptimizer';
import { CruiseMetrics } from './CruiseMetrics';
import { Logger } from '../../utils/logger';

// 模拟依赖接口
interface AgentStateMachine {
  getActiveAgents: () => Promise<any[]>;
  getAgentState: (agentId: string) => Promise<any>;
}

interface TransactionExecutor {
  executeTransaction: (request: any) => Promise<any>;
}

interface FundsManager {
  getAgentFunds: (agentId: string) => Promise<any>;
}

interface RiskController {
  assessRisk: (agentId: string, action: string) => Promise<any>;
}

describe('CruiseModule Metrics Integration Tests', () => {
  let logger: Logger;
  let cruiseModule: CruiseModule;
  let metrics: CruiseMetrics;
  let taskManager: ScheduledTaskManager;
  let positionOptimizer: PositionOptimizer;
  
  // 模拟依赖
  let mockAgentStateMachine: jest.Mocked<AgentStateMachine>;
  let mockTransactionExecutor: jest.Mocked<TransactionExecutor>;
  let mockFundsManager: jest.Mocked<FundsManager>;
  let mockRiskController: jest.Mocked<RiskController>;
  
  beforeEach(() => {
    // 创建日志记录器
    logger = new Logger({ module: 'test' });
    
    // 创建指标收集器
    metrics = new CruiseMetrics(logger);
    
    // 创建任务管理器
    taskManager = new ScheduledTaskManager(logger);
    
    // 模拟依赖
    mockAgentStateMachine = {
      getActiveAgents: jest.fn(),
      getAgentState: jest.fn()
    };
    
    mockTransactionExecutor = {
      executeTransaction: jest.fn()
    };
    
    mockFundsManager = {
      getAgentFunds: jest.fn()
    };
    
    mockRiskController = {
      assessRisk: jest.fn()
    };
    
    // 创建仓位优化器
    const getPoolRecommendations = async () => ({
      healthScore: 4.0,
      action: 'maintain',
      priceChange24h: 0.01,
      volumeChange: 0.05,
      liquidityChange: 0.02
    });
    
    positionOptimizer = new PositionOptimizer(logger, getPoolRecommendations);
    
    // 创建巡航模块
    cruiseModule = new CruiseModule(
      logger,
      mockAgentStateMachine as any,
      mockTransactionExecutor as any,
      mockFundsManager as any,
      mockRiskController as any,
      positionOptimizer,
      taskManager
    );
    
    // 启动指标收集
    metrics.startMetricsReporting();
    
    // 模拟数据
    mockAgentStateMachine.getActiveAgents.mockResolvedValue([
      { id: 'agent1', config: { healthCheckInterval: 300000 } },
      { id: 'agent2', config: { healthCheckInterval: 600000 } }
    ]);
    
    mockAgentStateMachine.getAgentState.mockResolvedValue({
      id: 'agent1',
      status: 'active',
      positions: [
        { poolAddress: 'pool1', tokenA: 'SOL', tokenB: 'USDC', value: 100 }
      ]
    });
    
    mockFundsManager.getAgentFunds.mockResolvedValue({
      totalValueSol: 1000,
      positions: [
        { poolAddress: 'pool1', tokenA: 'SOL', tokenB: 'USDC', value: 500 },
        { poolAddress: 'pool2', tokenA: 'SOL', tokenB: 'USDT', value: 500 }
      ]
    });
    
    mockRiskController.assessRisk.mockResolvedValue({
      riskLevel: 'low',
      recommendation: 'proceed'
    });
    
    mockTransactionExecutor.executeTransaction.mockResolvedValue({
      success: true,
      txId: 'tx123'
    });
  });
  
  afterEach(() => {
    // 停止指标收集
    metrics.stopMetricsReporting();
    
    // 停止任务管理器
    taskManager.stop();
    
    // 清理模拟
    jest.clearAllMocks();
  });
  
  test('should register agents and update metrics', async () => {
    // 注册代理
    await cruiseModule.registerAgent('agent1', { healthCheckInterval: 300000 });
    
    // 为指标收集器注册代理
    metrics.registerAgent('agent1');
    
    // 验证代理注册
    expect(cruiseModule.getRegisteredAgentCount()).toBe(1);
    
    // 验证指标收集器中的代理指标
    const agentMetrics = metrics.getAgentMetrics('agent1');
    expect(agentMetrics).toBeDefined();
  });
  
  test('should record health check metrics', async () => {
    // 注册代理
    await cruiseModule.registerAgent('agent1', { healthCheckInterval: 300000 });
    
    // 为指标收集器注册代理
    metrics.registerAgent('agent1');
    
    // 执行健康检查
    await cruiseModule.performHealthCheck('agent1');
    
    // 手动记录健康检查指标
    metrics.recordHealthCheck('agent1', true, 100);
    
    // 验证健康检查指标
    const agentMetrics = metrics.getAgentMetrics('agent1');
    expect(agentMetrics.healthChecks.total).toBe(1);
    expect(agentMetrics.healthChecks.successful).toBe(1);
  });
  
  test('should record optimization metrics', async () => {
    // 注册代理
    await cruiseModule.registerAgent('agent1', { healthCheckInterval: 300000 });
    
    // 为指标收集器注册代理
    metrics.registerAgent('agent1');
    
    // 执行仓位优化
    await cruiseModule.optimizePositions('agent1');
    
    // 手动记录优化指标
    metrics.recordOptimization(
      'agent1',
      true,
      200,
      1,
      1,
      0.5,
      2,
      1000
    );
    
    // 验证优化指标
    const agentMetrics = metrics.getAgentMetrics('agent1');
    expect(agentMetrics.optimizations.total).toBe(1);
    expect(agentMetrics.optimizations.successful).toBe(1);
  });
  
  test('should update task metrics', async () => {
    // 启动任务管理器
    taskManager.start();
    
    // 调度任务
    taskManager.scheduleTask(
      'task1',
      async () => { console.log('Task 1 executed'); },
      1000,
      ['agent1']
    );
    
    taskManager.scheduleRecurringTask(
      'task2',
      async () => { console.log('Task 2 executed'); },
      5000,
      0,
      ['agent1']
    );
    
    // 更新任务指标
    metrics.updateTaskMetrics(
      taskManager.getTaskCount(),
      taskManager.getEnabledTaskCount()
    );
    
    // 验证任务指标
    const metricsSummary = metrics.getMetricsSummary();
    expect(metricsSummary.tasks.total).toBe(2);
    expect(metricsSummary.tasks.active).toBe(2);
  });
  
  test('should generate metrics summary', async () => {
    // 注册代理
    await cruiseModule.registerAgent('agent1', { healthCheckInterval: 300000 });
    await cruiseModule.registerAgent('agent2', { healthCheckInterval: 600000 });
    
    // 为指标收集器注册代理
    metrics.registerAgent('agent1');
    metrics.registerAgent('agent2');
    
    // 记录健康检查指标
    metrics.recordHealthCheck('agent1', true, 100);
    metrics.recordHealthCheck('agent2', false, 150);
    
    // 记录优化指标
    metrics.recordOptimization('agent1', true, 200, 1, 1, 0.5, 2, 1000);
    
    // 更新任务指标
    metrics.updateTaskMetrics(2, 2);
    
    // 获取指标摘要
    const summary = metrics.getMetricsSummary();
    
    // 验证摘要内容
    expect(summary).toBeDefined();
    expect(summary.agents).toBe(2);
    expect(summary.healthChecks.total).toBe(2);
    expect(summary.healthChecks.successful).toBe(1);
    expect(summary.optimizations.total).toBe(1);
    expect(summary.optimizations.successful).toBe(1);
    expect(summary.tasks.total).toBe(2);
  });
}); 