# LiqPro 开发指南

本文档提供 LiqPro 项目的开发指南，包括项目结构、开发流程、代码规范和常见问题解决方案。

## 项目概述

LiqPro 是一款基于 Solana 区块链的 AI 驱动自动化 LP 投资平台，利用智能分析帮助用户自动捕捉高质量 LP 投资机会并执行交易，创造被动收益。项目采用微服务架构，包含多个核心服务和前端组件。

## 项目结构

```
LiqPro/
├── services/                  # 后端微服务
│   ├── signal-service/        # 信号生成和广播服务
│   ├── data-service/          # 市场数据收集和处理服务
│   ├── scoring-service/       # 信号评分和风险评估服务
│   ├── agent-service/         # Agent 引擎和状态管理服务
│   └── api-service/           # REST API 服务
├── frontend/                  # 前端应用
│   ├── dashboard/             # 用户仪表盘
│   ├── admin/                 # 管理员界面
│   └── landing/               # 落地页
├── libs/                      # 共享库
│   ├── common/                # 通用工具和类型
│   ├── solana/                # Solana 相关工具
│   └── meteora/               # Meteora DLMM 集成
├── deploy/                    # 部署配置
│   ├── kubernetes/            # K8s 配置文件
│   ├── docker/                # Docker 配置
│   └── scripts/               # 部署脚本
├── docs/                      # 项目文档
├── tests/                     # 端到端测试
└── scripts/                   # 开发和构建脚本
```

## 核心服务说明

### API 服务 (API Service)

API 服务是 LiqPro 平台的核心组件之一，负责处理前端和其他服务之间的通信。它提供了一个统一的接口，使前端能够访问各种后端服务，如信号服务、数据服务、评分服务和代理服务。

### 功能和职责

- 提供 RESTful API 接口，处理来自前端的请求
- 管理与各个微服务的通信
- 实现请求验证、认证和授权
- 处理错误和异常情况
- 提供健康检查和监控端点

### 服务管理器 (Service Manager)

API 服务使用 `ServiceManager` 类来管理与各个微服务的通信。这个类实现了单例模式，确保在整个应用程序中只有一个实例。它提供了获取各个服务客户端的方法，以及检查服务健康状态的功能。

```typescript
// 示例：获取服务客户端
const serviceManager = ServiceManager.getInstance();
const signalClient = serviceManager.getSignalClient();
const dataClient = serviceManager.getDataClient();
```

### 中间件 (Middleware)

API 服务使用多个中间件来处理请求和响应：

#### 认证中间件 (Authentication Middleware)

位于 `services/api-service/src/middleware/auth.ts`，负责验证请求中的 API 密钥。

- `apiKeyAuth`: 验证请求头中的 API 密钥，确保只有授权的客户端才能访问 API。
  - 检查请求头中是否存在 API 密钥
  - 验证 API 密钥是否有效
  - 对无效请求返回 401 Unauthorized 响应
  - 记录认证尝试的日志

#### 验证中间件 (Validation Middleware)

位于 `services/api-service/src/middleware/validator.ts`，使用 Joi 库验证请求数据。

- 定义了各种请求的验证模式 (schemas)
- 验证请求参数、查询字符串和请求体
- 对无效请求返回 400 Bad Request 响应，包含详细的错误信息

#### 错误处理中间件 (Error Handling Middleware)

位于 `services/api-service/src/middleware/error-handler.ts`，统一处理应用程序中的错误。

- `ApiError`: 自定义错误类，用于表示 API 相关的错误
- `notFoundHandler`: 处理 404 Not Found 错误
- `errorHandler`: 全局错误处理器，处理各种类型的错误并返回适当的响应
- `asyncHandler`: 捕获异步路由处理器中的错误

### 路由 (Routes)

API 服务定义了多个路由来处理不同类型的请求：

#### 信号路由 (Signal Routes)

位于 `services/api-service/src/routes/signal-routes.ts`，处理与信号相关的请求。

- `GET /api/signals`: 获取信号列表
- `GET /api/signals/:id`: 获取单个信号
- `GET /api/signals/pool/:poolId`: 获取特定池的信号
- `GET /api/signals/latest`: 获取最新信号
- `GET /api/signals/stats`: 获取信号统计信息

#### 数据服务路由 (Data Routes)

位于 `services/api-service/src/routes/data-routes.ts`，处理与数据相关的请求。

- `GET /api/data/pools`: 获取所有池列表
- `GET /api/data/pools/:address`: 获取单个池信息
- `GET /api/data/price/:address`: 获取价格数据，支持时间范围和间隔过滤
- `GET /api/data/liquidity/:address`: 获取流动性数据，支持时间范围和间隔过滤
- `POST /api/data/price/bulk`: 批量获取多个池的价格数据
- `GET /api/data/overview`: 获取市场概览

#### 评分服务路由 (Scoring Routes)

位于 `services/api-service/src/routes/scoring-routes.ts`，处理与评分相关的请求。

- `POST /api/scoring/signal`: 对单个信号进行评分
- `POST /api/scoring/signals`: 批量对信号进行评分
- `GET /api/scoring/risk/:poolAddress`: 获取池风险评估
- `GET /api/scoring/health/:poolAddress`: 获取池健康状况
- `POST /api/scoring/health/bulk`: 批量获取多个池的健康状况
- `GET /api/scoring/accuracy`: 获取信号准确率

#### 代理服务路由 (Agent Routes)

位于 `services/api-service/src/routes/agent-routes.ts`，处理与代理相关的请求。

- `GET /api/agent`: 获取用户的所有代理，支持状态过滤
- `GET /api/agent/:id`: 获取单个代理详情
- `POST /api/agent`: 创建新代理
- `PUT /api/agent/:id/status`: 更新代理状态
- `GET /api/agent/:id/transactions`: 获取代理交易历史
- `POST /api/agent/:id/deposit`: 向代理存入资金
- `POST /api/agent/:id/withdraw`: 从代理提取资金
- `POST /api/agent/:id/emergency-exit`: 紧急退出所有仓位

#### 健康检查端点 (Health Endpoint)

位于 `services/api-service/src/routes/health-routes.ts`，提供健康检查功能。

- `GET /health`: 获取所有服务的健康状态

### 使用示例

#### 启动 API 服务

```bash
cd services/api-service
npm install
npm run dev
```

#### 发送请求到 API 服务

```bash
# 获取信号列表
curl -X GET http://localhost:3000/api/signals -H "X-API-KEY: your-api-key"

# 获取池列表
curl -X GET http://localhost:3000/api/data/pools -H "X-API-KEY: your-api-key"
```

### 开发指南

1. 添加新的路由：
   - 在 `services/api-service/src/routes` 目录中创建新的路由文件
   - 在 `services/api-service/src/routes/index.ts` 中注册新路由
   - 实现路由处理器，使用 `ServiceManager` 获取所需的服务客户端

2. 添加新的中间件：
   - 在 `services/api-service/src/middleware` 目录中创建新的中间件文件
   - 在 `services/api-service/src/app.ts` 中注册全局中间件，或在特定路由中注册路由级中间件

3. 添加新的服务客户端：
   - 在 `services/api-service/src/clients` 目录中创建新的客户端文件
   - 在 `ServiceManager` 类中添加获取新客户端的方法
   - 更新 `ServiceConfig` 接口，添加新服务的 URL

### 信号服务 (Signal Service)

负责生成、处理和广播投资信号。

**主要功能**：
- 信号生成：基于市场数据和分析结果生成投资信号
- 信号过滤：根据客户端订阅选项过滤信号
- 信号广播：通过 WebSocket 向客户端广播信号

**关键文件**：
- `services/signal-service/src/services/websocket-service.ts`：WebSocket 服务实现
- `services/signal-service/src/services/signal-generator.ts`：信号生成器
- `services/signal-service/src/types/signal.ts`：信号类型定义

**WebSocket 服务功能**：
- 客户端连接管理：处理客户端连接、认证和断开
- 订阅管理：支持客户端订阅特定主题和过滤条件
- 信号广播：向订阅客户端广播信号
- 信号过滤：支持多种过滤条件
  - 池地址过滤 (poolAddresses)
  - 信号类型过滤 (signalTypes)
  - 强度过滤 (minStrength)
  - 时间框架过滤 (timeframes)
  - 可靠性过滤 (minReliability)
  - 时间戳过滤 (fromTimestamp, toTimestamp)
  - 元数据过滤 (metadata)
- 信号过期处理：自动过滤过期信号并通知客户端
- 心跳检测：定期检测客户端活跃状态

### 数据服务 (Data Service)

负责收集、处理和存储市场数据。

**主要功能**：
- 市场数据收集：从 Solana 区块链和 Meteora DLMM 收集数据
- 数据处理：清洗、规范化和聚合数据
- 数据存储：将处理后的数据存储到数据库

### 评分服务 (Scoring Service)

负责评估信号质量和风险。

**主要功能**：
- 信号评分：基于多种因素评估信号质量
- 风险评估：评估投资风险
- 性能跟踪：跟踪信号性能

### Agent 引擎 (Agent Service)

负责执行投资策略和管理资金。

**主要功能**：
- 状态管理：管理 Agent 生命周期和状态
- 资金管理：管理用户资金
- 交易执行：执行买入/卖出交易
- 风险控制：实施风险控制措施

## 开发流程

### 环境设置

1. **克隆仓库**：
   ```bash
   git clone https://github.com/your-org/liqpro.git
   cd liqpro
   ```

2. **安装依赖**：
   ```bash
   npm install
   ```

3. **设置环境变量**：
   复制 `.env.example` 到 `.env` 并填写必要的环境变量。

4. **启动开发服务**：
   ```bash
   # 启动所有服务
   npm run dev
   
   # 启动特定服务
   npm run dev:signal-service
   npm run dev:api-service
   ```

### 开发工作流

1. **创建功能分支**：
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **开发功能**：
   实现功能并编写测试。

3. **运行测试**：
   ```bash
   # 运行所有测试
   npm test
   
   # 运行特定服务的测试
   npm test -- --testPathPattern=signal-service
   ```

4. **提交代码**：
   ```bash
   git add .
   git commit -m "feat: add your feature"
   git push origin feature/your-feature-name
   ```

5. **创建 Pull Request**：
   在 GitHub 上创建 Pull Request，等待代码审查。

## 代码规范

### TypeScript 规范

- 使用 TypeScript 严格模式 (`"strict": true`)
- 使用接口定义数据结构
- 避免使用 `any` 类型，优先使用 `Record<string, unknown>` 或具体类型
- 使用枚举定义常量
- 回调函数应使用具体的函数签名，避免使用通用 `Function` 类型
- 未使用的参数应以下划线开头（如 `_next`）

### 命名规范

- **文件名**：使用 kebab-case（如 `websocket-service.ts`）
- **类名**：使用 PascalCase（如 `WebSocketService`）
- **方法名**：使用 camelCase（如 `broadcastSignals`）
- **接口名**：使用 PascalCase 并以 `I` 开头（如 `ISignal`）
- **枚举名**：使用 PascalCase（如 `SignalType`）

### 代码组织

- 相关功能放在同一目录下
- 使用 barrel 文件（`index.ts`）导出模块
- 将接口和类型定义放在 `types` 目录下
- 将工具函数放在 `utils` 目录下

### 错误处理规范

- 使用 try-catch 块捕获异常
- 在回调函数中提供统一的错误响应格式
- 错误响应应包含 `success: false` 和 `message` 属性
- 记录详细的错误日志，包括相关上下文信息

### 注释规范

- 使用 JSDoc 注释格式
- 为所有公共 API 添加注释
- 为复杂逻辑添加注释

示例：
```typescript
/**
 * 过滤信号
 * @param signals 要过滤的信号数组
 * @param options 过滤选项
 * @returns 过滤后的信号数组
 */
private filterSignals(signals: Signal[], options: any): Signal[] {
  // 实现...
}
```

## 测试规范

### 单元测试

- 使用 Jest 进行单元测试
- 测试文件放在 `__tests__` 目录下
- 测试文件名以 `.test.ts` 结尾
- 使用 mock 隔离外部依赖

### 集成测试

- 测试文件名以 `.integration.test.ts` 结尾
- 使用 Docker Compose 启动依赖服务
- 清理测试数据

## REST API 使用指南

### 认证

所有 API 请求都需要在请求头中包含 API 密钥：

```
X-API-Key: your-api-key
```

### 信号 API

#### 获取信号列表

```
GET /api/signals
```

查询参数：
- `poolAddress`：池地址过滤
- `type`：信号类型过滤
- `minStrength`：最小强度过滤
- `timeframe`：时间框架过滤
- `minReliability`：最小可靠性过滤
- `fromTimestamp`：开始时间戳
- `toTimestamp`：结束时间戳
- `limit`：返回结果数量限制
- `offset`：分页偏移量

响应：
```json
{
  "status": "success",
  "data": {
    "signals": [
      {
        "id": "signal-id",
        "type": "entry",
        "poolAddress": "pool-address",
        "strength": 4,
        "reliability": 3,
        "timeframe": "medium_term",
        "timestamp": 1647432000000,
        "expirationTimestamp": 1647518400000,
        "metadata": {
          "source": "strategy-1"
        }
      }
    ],
    "total": 100,
    "limit": 10,
    "offset": 0
  }
}
```

#### 获取单个信号

```
GET /api/signals/:id
```

响应：
```json
{
  "status": "success",
  "data": {
    "signal": {
      "id": "signal-id",
      "type": "entry",
      "poolAddress": "pool-address",
      "strength": 4,
      "reliability": 3,
      "timeframe": "medium_term",
      "timestamp": 1647432000000,
      "expirationTimestamp": 1647518400000,
      "metadata": {
        "source": "strategy-1"
      }
    }
  }
}
```

### 策略 API

#### 获取策略列表

```
GET /api/strategies
```

查询参数：
- `type`：策略类型过滤
- `isActive`：活跃状态过滤
- `limit`：返回结果数量限制
- `offset`：分页偏移量

响应：
```json
{
  "status": "success",
  "data": {
    "strategies": [
      {
        "id": "strategy-id",
        "name": "Strategy 1",
        "type": "momentum",
        "description": "Momentum-based strategy",
        "parameters": {
          "lookbackPeriod": 14,
          "threshold": 0.5
        },
        "isActive": true,
        "createdAt": 1647432000000,
        "updatedAt": 1647518400000
      }
    ],
    "total": 50,
    "limit": 10,
    "offset": 0
  }
}
```

#### 创建策略

```
POST /api/strategies
```

请求体：
```json
{
  "name": "New Strategy",
  "type": "momentum",
  "description": "New momentum-based strategy",
  "parameters": {
    "lookbackPeriod": 14,
    "threshold": 0.5
  },
  "isActive": true
}
```

响应：
```json
{
  "status": "success",
  "data": {
    "strategy": {
      "id": "new-strategy-id",
      "name": "New Strategy",
      "type": "momentum",
      "description": "New momentum-based strategy",
      "parameters": {
        "lookbackPeriod": 14,
        "threshold": 0.5
      },
      "isActive": true,
      "createdAt": 1647432000000,
      "updatedAt": 1647432000000
    }
  }
}
```

### 历史数据 API

#### 获取历史信号

```
GET /api/history/signals
```

查询参数：
- `poolAddress`：池地址过滤
- `type`：信号类型过滤
- `fromTimestamp`：开始时间戳
- `toTimestamp`：结束时间戳
- `limit`：返回结果数量限制
- `offset`：分页偏移量

响应：
```json
{
  "status": "success",
  "data": {
    "signals": [
      {
        "id": "signal-id",
        "type": "entry",
        "poolAddress": "pool-address",
        "strength": 4,
        "reliability": 3,
        "timeframe": "medium_term",
        "timestamp": 1647432000000,
        "expirationTimestamp": 1647518400000,
        "metadata": {
          "source": "strategy-1"
        },
        "performance": {
          "accuracy": 0.85,
          "profitLoss": 0.12
        }
      }
    ],
    "total": 200,
    "limit": 10,
    "offset": 0
  }
}
```

### 警报 API

#### 获取警报列表

```
GET /api/alerts
```

查询参数：
- `type`：警报类型过滤
- `status`：警报状态过滤
- `severity`：警报严重性过滤
- `limit`：返回结果数量限制
- `offset`：分页偏移量

响应：
```json
{
  "status": "success",
  "data": {
    "alerts": [
      {
        "id": "alert-id",
        "type": "price_movement",
        "message": "Significant price movement detected",
        "poolAddress": "pool-address",
        "severity": "high",
        "status": "active",
        "timestamp": 1647432000000,
        "metadata": {
          "priceChange": 0.15
        }
      }
    ],
    "total": 30,
    "limit": 10,
    "offset": 0
  }
}
```

## WebSocket API 使用指南

### 连接建立

```javascript
const socket = io('https://api.liqpro.ai/ws', {
  path: '/ws',
  transports: ['websocket']
});

socket.on('connect', () => {
  console.log('Connected to WebSocket server');
});
```

### 认证

```javascript
socket.emit('authenticate', { apiKey: 'your-api-key' }, (response) => {
  if (response.success) {
    console.log('Authentication successful');
  } else {
    console.error('Authentication failed:', response.error);
  }
});
```

### 订阅信号

```javascript
// 基本订阅（无过滤）
socket.emit('subscribe', { topic: 'signals' }, (response) => {
  if (response.success) {
    console.log('Subscribed to signals');
  }
});

// 带过滤条件的订阅
socket.emit('subscribe', {
  topic: 'signals',
  options: {
    poolAddresses: ['pool-address-1', 'pool-address-2'],
    signalTypes: ['entry', 'exit'],
    minStrength: 3, // MODERATE 及以上
    timeframes: ['short_term', 'medium_term'],
    minReliability: 2, // MEDIUM 及以上
    fromTimestamp: Date.now() - 3600000, // 1小时前
    toTimestamp: Date.now(), // 现在
    metadata: { source: 'strategy-1' } // 元数据过滤
  }
}, (response) => {
  if (response.success) {
    console.log('Subscribed to filtered signals:', response.subscriptionId);
  }
});
```

### 接收信号

```javascript
// 接收所有信号（无过滤订阅）
socket.on('signals', (data) => {
  console.log('Received signals:', data.signals);
});

// 接收过滤后的信号
socket.on('filtered_signals', (data) => {
  console.log('Received filtered signals for subscription:', data.subscriptionId);
  console.log('Signals:', data.signals);
});

// 接收过期信号通知
socket.on('expired_signals', (data) => {
  console.log('Signals expired:', data.signals);
});
```

### 取消订阅

```javascript
socket.emit('unsubscribe', { subscriptionId: 'your-subscription-id' }, (response) => {
  if (response.success) {
    console.log('Unsubscribed successfully');
  }
});
```

### 获取当前订阅

```javascript
socket.emit('get_subscriptions', (response) => {
  if (response.success) {
    console.log('Current subscriptions:', response.subscriptions);
  }
});
```

### 断开连接

```javascript
socket.disconnect();
```

## 常见问题解决方案

### API 认证问题

**问题**：API 请求返回 401 未授权错误。

**解决方案**：
1. 确保在请求头中包含正确的 API 密钥：`X-API-Key: your-api-key`
2. 检查 API 密钥是否在服务配置中注册
3. 确保 API 密钥没有过期或被撤销

### 请求验证错误

**问题**：API 请求返回 400 错误，提示请求参数无效。

**解决方案**：
1. 检查请求参数是否符合 API 文档要求
2. 确保必填字段已提供
3. 检查字段类型是否正确
4. 查看错误响应中的 `errors` 数组，了解具体的验证错误

### WebSocket 连接问题

**问题**：客户端无法连接到 WebSocket 服务。

**解决方案**：
1. 检查 CORS 配置
2. 确保客户端使用正确的 WebSocket 路径
3. 检查防火墙设置

### 信号过滤问题

**问题**：信号过滤不正确。

**解决方案**：
1. 检查过滤选项格式
2. 确保 `matchesFilter` 方法正确实现
3. 添加详细日志以跟踪过滤过程

### 时间戳过滤问题

**问题**：时间戳过滤不生效。

**解决方案**：
1. 确保时间戳使用毫秒格式（Unix 时间戳 * 1000）
2. 检查 `fromTimestamp` 和 `toTimestamp` 的值是否合理
3. 验证信号的 `timestamp` 字段格式是否一致

### 信号过期处理问题

**问题**：过期信号仍然被发送。

**解决方案**：
1. 确保信号包含 `expirationTimestamp` 字段
2. 验证 `expirationTimestamp` 使用毫秒格式
3. 检查服务器和客户端的时钟同步

### Linter 错误处理

**问题**：代码中存在 linter 错误。

**解决方案**：
1. 运行 `npm run lint` 查看具体错误
2. 对于类型错误，确保正确导入和使用类型
3. 对于未使用的变量，使用下划线前缀（如 `_variable`）或移除
4. 对于 `Function` 类型错误，替换为具体的函数签名
5. 对于对象属性错误，确保属性名与接口定义匹配

## 贡献指南

1. 确保代码通过所有测试
2. 遵循代码规范
3. 为新功能添加测试
4. 更新相关文档
5. 提交有意义的 commit 消息

## 资源链接

- [项目 JIRA 看板](https://your-org.atlassian.net/jira/software/projects/LIQPRO/boards/1)
- [API 文档](https://docs.liqpro.ai/api)
- [架构文档](https://docs.liqpro.ai/architecture)
- [Meteora DLMM 文档](https://docs.meteora.ag/)

## 开发进度

### 2023-03-20 开发环境配置完成

#### 完成的工作

1. **Docker开发环境配置**
   - 更新了Docker Compose配置文件，添加了API服务
   - 创建了API服务的Dockerfile
   - 实现了一键启动脚本，支持启动、停止、重启、查看状态和日志等功能
   - 更新了开发环境文档，添加了Docker开发环境的详细说明

2. **一键启动脚本功能**
   - 实现了启动所有服务功能
   - 实现了停止所有服务功能
   - 实现了重启所有服务功能
   - 实现了查看服务状态功能
   - 实现了查看服务日志功能
   - 实现了重建并启动所有服务功能
   - 添加了服务URL显示功能
   - 添加了错误处理和用户友好的提示

3. **开发环境文档更新**
   - 添加了Docker开发环境的前置条件说明
   - 添加了目录结构说明
   - 添加了服务配置说明
   - 添加了一键启动脚本使用说明
   - 添加了手动管理服务的命令说明
   - 添加了服务访问地址说明
   - 添加了注意事项说明

#### 相关文件

- `deploy/docker/docker-compose.dev.yml` - Docker Compose配置文件
- `services/api-service/Dockerfile` - API服务的Dockerfile
- `scripts/start-dev.sh` - 一键启动脚本
- `DEVELOPMENT.md` - 开发环境文档

#### 下一步计划

1. **API服务集成**
   - 实现与信号服务的集成
   - 实现与数据服务的集成
   - 实现与评分服务的集成
   - 实现与Agent引擎的集成

2. **API服务性能优化**
   - 实现缓存机制
   - 优化数据处理流程
   - 添加性能监控指标

3. **API服务测试**
   - 编写单元测试
   - 编写集成测试
   - 进行性能测试

## 开发环境配置

### Docker 开发环境

LiqPro 项目使用 Docker 和 Docker Compose 来简化开发环境的搭建和管理。通过 Docker，开发人员可以在本地快速启动所有必要的服务，而无需手动安装和配置每个服务的依赖项。

#### 前置条件

- 安装 [Docker](https://docs.docker.com/get-docker/)
- 安装 [Docker Compose](https://docs.docker.com/compose/install/)

#### 目录结构

```
LiqPro/
├── deploy/
│   └── docker/
│       ├── docker-compose.dev.yml      # 开发环境配置
│       ├── docker-compose.monitoring.yml # 监控配置
│       └── ...
├── services/
│   ├── api-service/
│   │   └── Dockerfile                  # API服务Docker配置
│   ├── signal-service/
│   │   └── Dockerfile                  # 信号服务Docker配置
│   └── ...
└── scripts/
    └── start-dev.sh                    # 开发环境启动脚本
```

#### 服务配置

开发环境包含以下服务：

1. **API 服务** - 端口: 3000
2. **信号服务** - 端口: 3002
3. **数据服务** - 端口: 3001
4. **评分服务** - 端口: 3003
5. **Agent 引擎** - 端口: 3004
6. **Redis** - 端口: 6379
7. **MongoDB** - 端口: 27017
8. **PostgreSQL** - 端口: 5432

#### 使用一键启动脚本

我们提供了一个便捷的脚本来管理开发环境：

```bash
# 给脚本添加执行权限（仅首次运行需要）
chmod +x scripts/start-dev.sh

# 运行脚本
./scripts/start-dev.sh
```

脚本提供以下功能：

1. **启动所有服务** - 使用 Docker Compose 启动所有服务
2. **停止所有服务** - 停止并移除所有容器
3. **重启所有服务** - 重启所有服务
4. **查看服务状态** - 显示所有服务的运行状态
5. **查看服务日志** - 查看指定服务或所有服务的日志
6. **重建并启动所有服务** - 重新构建并启动所有服务

#### 手动管理服务

如果您不想使用脚本，也可以直接使用 Docker Compose 命令：

```bash
# 启动所有服务
cd /path/to/LiqPro
docker-compose -f deploy/docker/docker-compose.dev.yml up -d

# 停止所有服务
docker-compose -f deploy/docker/docker-compose.dev.yml down

# 查看日志
docker-compose -f deploy/docker/docker-compose.dev.yml logs -f [service_name]
```

#### 访问服务

启动服务后，可以通过以下地址访问各个服务：

- API 服务: http://localhost:3000
- 信号服务: http://localhost:3002
- 数据服务: http://localhost:3001
- 评分服务: http://localhost:3003
- Agent 引擎: http://localhost:3004
- Redis: localhost:6379
- MongoDB: mongodb://admin:secret@localhost:27017
- PostgreSQL: postgresql://admin:secret@localhost:5432/liqpro

#### 注意事项

- 确保 Docker 和 Docker Compose 已正确安装并运行
- 首次启动可能需要一些时间来下载和构建镜像
- 如果遇到端口冲突，请检查是否有其他应用程序正在使用相同的端口
- 服务之间的依赖关系已在 Docker Compose 配置中定义，服务将按正确的顺序启动 