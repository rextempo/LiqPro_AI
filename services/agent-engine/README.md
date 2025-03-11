# LiqPro Agent Engine

LiqPro Agent Engine 是一个自动化的投资平台，专注于 Meteora DLMM 流动性池在 Solana 区块链上的管理。该引擎负责监控和优化代理的仓位，执行交易，并提供全面的指标和监控功能。

## 项目结构

```
services/agent-engine/
├── src/
│   ├── api/                  # API 层
│   │   ├── controllers/      # API 控制器
│   │   └── routes/           # API 路由
│   ├── core/                 # 核心业务逻辑
│   │   ├── agent/            # 代理状态机
│   │   ├── cruise/           # 巡航模块
│   │   ├── funds/            # 资金管理
│   │   ├── risk/             # 风险控制
│   │   └── transaction/      # 交易执行
│   ├── utils/                # 工具类
│   ├── app.ts                # 应用程序入口
│   └── config.ts             # 配置文件
├── tests/                    # 测试
└── README.md                 # 项目说明
```

## 核心模块

### 巡航模块 (Cruise Module)

巡航模块是 Agent Engine 的核心组件，负责：

1. **健康检查**：定期检查代理的状态和仓位健康度
2. **仓位优化**：根据市场情况和信号服务的建议优化代理的仓位
3. **任务调度**：管理定时任务，如健康检查和仓位优化
4. **指标收集**：收集和报告关键性能指标

### 代理状态机 (Agent State Machine)

管理代理的生命周期和状态转换，包括：

- 创建和注册代理
- 跟踪代理状态（活跃、暂停、终止等）
- 管理代理配置和策略

### 资金管理 (Funds Manager)

负责管理代理的资金和仓位：

- 跟踪代理的资金和仓位
- 计算仓位价值和收益
- 管理资金分配和再平衡

### 风险控制 (Risk Controller)

评估和管理交易和仓位风险：

- 交易前风险评估
- 仓位风险监控
- 风险限制和止损策略

### 交易执行 (Transaction Executor)

负责执行交易：

- 构建交易
- 签名和提交交易
- 处理交易确认和错误

## API 接口

Agent Engine 提供了 RESTful API 接口，用于监控和控制巡航服务：

- `GET /api/cruise/status` - 获取巡航服务状态
- `GET /api/cruise/metrics` - 获取巡航服务指标
- `GET /api/cruise/metrics/:agentId` - 获取特定代理的指标
- `POST /api/cruise/agents/:agentId/health-check` - 执行代理健康检查
- `POST /api/cruise/agents/:agentId/optimize` - 执行代理仓位优化

## 指标和监控

巡航模块提供了全面的指标收集和监控功能：

- **健康检查指标**：成功率、持续时间、频率
- **优化指标**：成功率、持续时间、操作数量、健康度改善
- **任务指标**：总任务数、活跃任务数
- **代理指标**：每个代理的健康检查和优化指标

## 配置

通过环境变量或配置文件配置 Agent Engine：

- `PORT` - 服务器端口（默认：3000）
- `LOG_LEVEL` - 日志级别（默认：开发环境为 debug，生产环境为 info）
- `DEFAULT_HEALTH_CHECK_INTERVAL` - 默认健康检查间隔（毫秒，默认：300000）
- `DEFAULT_OPTIMIZATION_INTERVAL` - 默认仓位优化间隔（毫秒，默认：3600000）
- `METRICS_REPORTING_INTERVAL` - 指标报告间隔（毫秒，默认：60000）

## 开发

### 安装依赖

```bash
npm install
```

### 运行开发服务器

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行测试

```bash
npm test
```

## 安全注意事项

- 所有处理用户资金的操作都经过严格的风险评估
- 交易执行前进行多重验证
- 敏感操作需要额外的授权
- 定期进行安全审计和代码审查
