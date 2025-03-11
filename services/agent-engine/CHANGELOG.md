# 变更日志

## [0.1.0] - 2023-07-12

### 新增

- **巡航模块**

  - 实现 `CruiseModule` 类，负责管理代理健康检查和仓位优化
  - 实现 `ScheduledTaskManager` 类，用于调度和执行定时任务
  - 实现 `PositionOptimizer` 类，用于优化代理仓位
  - 实现 `CruiseService` 单例类，作为巡航模块的对外接口
  - 实现 `CruiseMetrics` 类，用于收集和报告巡航模块的指标

- **API 接口**

  - 实现 `CruiseController` 类，提供 RESTful API 接口
  - 实现巡航服务路由配置，将控制器方法与 API 路由关联
  - 集成巡航服务路由到 Express 应用程序

- **测试**

  - 实现 `CruiseModule.integration.test.ts`，测试 `CruiseModule` 与其依赖的集成
  - 实现 `CruiseModule.metrics.test.ts`，测试 `CruiseModule` 与 `CruiseMetrics` 的集成
  - 实现 `CruiseService.test.ts`，使用模拟依赖测试 `CruiseService`

- **配置和文档**
  - 实现 `config.ts`，提供应用程序配置
  - 创建 `README.md`，说明项目结构和功能
  - 创建 `CHANGELOG.md`，记录变更历史

### 修复

- 修复 `logger.ts` 中的冲突，统一 Logger 接口和实现
- 修复 `ScheduledTaskManager.ts` 中的导入路径问题
- 修复测试文件中的 Logger 初始化问题

### 安全增强

- 在 `CruiseService` 中添加错误处理和日志记录
- 在 API 控制器中添加输入验证和错误处理
- 在配置中添加安全相关的设置，如交易签名超时和重试次数

## 待办事项

- 实现 `AgentStateMachine` 类
- 实现 `TransactionExecutor` 类
- 实现 `FundsManager` 类
- 实现 `RiskController` 类
- 添加更多单元测试和集成测试
- 实现用户认证和授权
- 添加更详细的 API 文档
