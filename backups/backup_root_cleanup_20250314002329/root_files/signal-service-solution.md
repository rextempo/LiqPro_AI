# Signal Service 修复方案

## 问题描述

Signal Service 容器无法正常启动，并且无法与 RabbitMQ 消息队列集成，导致无法接收来自 Data Service 的池数据并生成交易信号。

## 问题原因分析

1. 原始的 Signal Service 容器在启动时遇到了 TypeScript 编译错误，特别是与 `@types/node` 相关的错误。
2. 容器配置不正确，导致无法正确连接到 RabbitMQ 消息队列。
3. 代码中没有正确处理不同格式的池数据，导致无法从 Data Service 接收到的数据中生成信号。

## 解决方案

### 1. 创建新的 Signal Service 容器

我们创建了一个新的 Signal Service 容器，使用纯 JavaScript 而不是 TypeScript，避免了编译错误：

```bash
docker run -d --name signal-service-fixed --network production_liqpro-network -p 3007:3002 -v /Users/rex/Documents/LiqPro/signal-service-fixed:/app node:18 bash -c "cd /app && npm install && node server.js"
```

### 2. 实现 RabbitMQ 集成

我们创建了一个新的 `server.js` 文件，其中包含了与 RabbitMQ 集成的代码：

- 连接到 RabbitMQ 服务器
- 创建和确认必要的队列（`pool_data_queue` 和 `signal_queue`）
- 设置消费者来处理从 `pool_data_queue` 接收到的池数据
- 实现发布信号到 `signal_queue` 的功能

### 3. 实现信号生成逻辑

我们实现了一个简单的信号生成逻辑，基于池的价格变化：

- 当价格变化超过 5% 时生成信号
- 根据价格变化的方向确定信号的动作（BUY 或 SELL）
- 根据价格变化的幅度确定信号的置信度

### 4. 提供 API 端点

我们实现了几个 API 端点来访问生成的信号：

- `/health` - 健康检查端点
- `/api/signals` - 获取所有信号
- `/api/signals/:id` - 获取特定信号
- `/api/test/publish-signal` - 发布测试信号

### 5. 处理不同格式的池数据

我们修改了代码以处理不同格式的池数据：

- 使用 `poolData.address` 作为 `poolId` 的备选
- 使用 `poolData.tokenX` 和 `poolData.tokenY` 作为 `tokenA` 和 `tokenB` 的备选
- 使用 `poolData.priceChange` 作为 `priceChange24h` 的备选

## 验证方法

1. 检查容器状态：

```bash
docker ps | grep signal-service-fixed
```

2. 检查健康状态：

```bash
curl http://localhost:3007/health
```

3. 发送测试池数据：

```bash
curl -X POST http://localhost:3005/api/test/publish-pool-data-with-signal -H "Content-Type: application/json" -d '{"address":"TEST123","tokenX":"SOL","tokenY":"USDC","feeRate":0.01,"price":25.5,"priceChange":0.25,"liquidity":1000000,"volume":500000,"timestamp":1621234567890}'
```

4. 获取生成的信号：

```bash
curl http://localhost:3007/api/signals
```

## 注意事项

1. 这是一个临时解决方案，长期来看应该考虑以下改进：
   - 使用 Docker Compose 或 Kubernetes 来管理容器配置
   - 构建专用的 Docker 镜像，而不是在运行时安装依赖
   - 使用环境变量来配置服务参数
   - 实现更复杂的信号生成算法
   - 添加更多的错误处理和重试机制
   - 实现日志记录和监控

2. 当前的信号生成逻辑非常简单，仅基于价格变化。在实际应用中，应该考虑更多因素，如：
   - 交易量变化
   - 流动性变化
   - 市场趋势
   - 历史数据分析
   - 外部因素（如新闻、社交媒体情绪等）

3. 信号存储目前使用内存中的 Map，这不是持久化的。在生产环境中，应该考虑使用数据库来存储信号。 