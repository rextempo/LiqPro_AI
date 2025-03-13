# LiqPro 服务索引

本目录包含 LiqPro 平台的所有微服务。以下是各服务的功能说明和关键信息。

## 服务概览

| 服务名称 | 主要功能 | 技术栈 | 端口 | 依赖服务 |
|---------|---------|-------|------|---------|
| api-service | API 网关和认证服务 | Node.js, Express | 3001 | MongoDB, Redis |
| agent-engine | Agent 执行引擎 | Node.js | 3002 | RabbitMQ, MongoDB |
| data-service | 数据收集和存储 | Node.js | 3003 | MongoDB, RabbitMQ |
| signal-service | 信号生成 | Python, Flask | 3004 | MongoDB, RabbitMQ |
| scoring-service | 风险评分和分析 | Python | 3005 | MongoDB, RabbitMQ |
| solana-cache | Solana 数据缓存 | Node.js | 3006 | Redis |

## 服务详情

### API 服务 (api-service)

API 服务作为用户与平台交互的网关。它提供 RESTful 端点和 WebSocket 连接，用于管理 Agent、查看性能指标和控制平台。

**主要功能**:
- 用户认证和授权
- API 端点路由
- WebSocket 实时数据
- 请求验证和限流
- 响应缓存

**启动命令**: `npm run start:prod`

**配置文件**: `.env.production`

### Agent 引擎服务 (agent-engine)

Agent 引擎服务负责管理和执行自动化交易策略。它消费来自消息队列的事件，处理信号，并根据 Agent 配置执行交易。

**主要功能**:
- 基于 RabbitMQ 的事件驱动架构
- 自动化 Agent 生命周期管理
- 信号处理和评估
- 交易执行
- 健康监控和优化

**启动命令**: `npm run start:prod`

**配置文件**: `.env.production`

### 数据服务 (data-service)

数据服务负责从各种来源收集、处理和存储数据，包括链上数据、市场数据和平台指标。

**主要功能**:
- 链上数据收集
- 市场数据聚合
- 数据清洗和转换
- 历史数据存储
- 数据分析支持

**启动命令**: `npm run start:prod`

**配置文件**: `.env.production`

### 信号服务 (signal-service)

信号服务分析市场数据，并基于各种指标和算法生成交易信号。

**主要功能**:
- 市场趋势分析
- 技术指标计算
- 信号生成算法
- 信号质量评估
- 信号发布到消息队列

**启动命令**: `python app.py --env=production`

**配置文件**: `config/production.py`

### 评分服务 (scoring-service)

评分服务评估潜在投资的风险和机会，提供帮助 Agent 做出明智决策的评分。

**主要功能**:
- 风险评估模型
- 机会评分
- 历史表现分析
- 投资组合优化建议
- 风险报告生成

**启动命令**: `python app.py --env=production`

**配置文件**: `config/production.py`

### Solana 数据缓存 (solana-cache)

Solana 数据缓存服务负责缓存 Solana 区块链数据，减少对 RPC 节点的请求，提高性能和可靠性。

**主要功能**:
- Solana RPC 请求代理
- 区块和交易数据缓存
- 账户数据缓存
- 程序数据缓存
- 缓存失效管理

**启动命令**: `npm run start:prod`

**配置文件**: `.env.production`

## 服务间通信

服务间通信主要通过以下方式实现：

1. **RabbitMQ 消息队列**: 用于异步事件驱动通信
2. **RESTful API 调用**: 用于同步请求-响应通信
3. **Redis 发布/订阅**: 用于实时数据更新
4. **共享数据库**: 某些服务共享 MongoDB 集合

## 监控和日志

所有服务都配置了以下监控和日志功能：

- **日志**: 使用 Winston/Pino 记录日志，存储在 `logs/` 目录
- **健康检查**: 每个服务都提供 `/health` 端点
- **指标**: 使用 Prometheus 格式暴露关键指标
- **告警**: 基于预定义阈值的告警配置

## 部署和扩展

服务部署使用 Docker 容器，通过 `docker-compose-local-prod.yml` 文件配置。

扩展策略：
- **水平扩展**: 增加服务实例数量
- **垂直扩展**: 增加单个服务的资源分配
- **功能分解**: 将大型服务拆分为更小的专用服务

## 故障排除

常见问题及解决方案：

1. **服务无法启动**: 检查环境变量和依赖服务
2. **服务间通信失败**: 检查网络配置和服务发现
3. **性能下降**: 检查资源使用情况和数据库索引
4. **数据不一致**: 检查数据同步机制和事务处理

详细的故障排除指南请参考各服务目录中的 `TROUBLESHOOTING.md` 文件。 