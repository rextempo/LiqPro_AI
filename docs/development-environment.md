# LiqPro 开发环境指南

本文档提供 LiqPro 项目的开发环境设置、运行和调试指南。

## 目录

1. [环境要求](#环境要求)
2. [开发环境设置](#开发环境设置)
3. [项目结构](#项目结构)
4. [运行服务](#运行服务)
5. [消息队列集成](#消息队列集成)
6. [监控系统](#监控系统)
7. [常见问题解决](#常见问题解决)

## 环境要求

开发 LiqPro 需要以下软件和工具：

- **Node.js**: v16.x 或更高版本
- **npm**: v8.x 或更高版本
- **Docker**: 最新稳定版
- **Docker Compose**: 最新稳定版
- **Git**: 最新稳定版

## 开发环境设置

### 1. 克隆代码库

```bash
git clone https://github.com/your-org/liqpro.git
cd liqpro
```

### 2. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装所有服务的依赖
npm run install:all
```

### 3. 环境变量配置

项目使用 `.env` 文件管理环境变量。每个服务目录下都有一个 `.env.example` 文件，复制并重命名为 `.env`，然后根据需要修改配置。

```bash
# 复制示例环境变量文件
cp .env.example .env

# 为每个服务复制环境变量文件
find ./services -name ".env.example" -exec sh -c 'cp "$1" "${1%.example}"' _ {} \;
```

### 4. 启动开发环境

使用 Docker Compose 启动完整的开发环境：

```bash
# 启动所有服务
docker-compose -f docker-compose.yml up -d

# 启动监控系统
docker-compose -f deploy/docker/docker-compose.monitoring.yml up -d
```

## 项目结构

LiqPro 采用微服务架构，项目结构如下：

```
LiqPro/
├── services/                  # 后端微服务
│   ├── signal-service/        # 信号生成和广播服务
│   ├── data-service/          # 市场数据收集和处理服务
│   ├── scoring-service/       # 信号评分和风险评估服务
│   ├── agent-engine/          # Agent 引擎和状态管理服务
│   └── api-service/           # REST API 服务
├── frontend/                  # 前端应用
├── libs/                      # 共享库
│   ├── common/                # 通用工具和类型
│   ├── solana/                # Solana 相关工具
│   └── meteora/               # Meteora DLMM 集成
├── deploy/                    # 部署配置
│   ├── docker/                # Docker 配置
│   │   ├── grafana/           # Grafana 配置
│   │   ├── prometheus/        # Prometheus 配置
│   │   ├── kibana/            # Kibana 配置
│   │   └── logstash/          # Logstash 配置
├── docs/                      # 项目文档
└── scripts/                   # 开发和构建脚本
```

## 运行服务

### 启动单个服务

如果你只需要开发特定服务，可以单独启动该服务：

```bash
# 启动 API 服务
cd services/api-service
npm run dev

# 启动 Agent 引擎
cd services/agent-engine
npm run dev
```

### 使用 Docker 运行单个服务

```bash
# 启动 API 服务
docker-compose up api-service

# 启动 Agent 引擎
docker-compose up agent-engine
```

### 重新构建服务

修改代码后，需要重新构建服务：

```bash
# 重新构建所有服务
docker-compose build

# 重新构建特定服务
docker-compose build api-service
```

## 消息队列集成

LiqPro 使用 RabbitMQ 作为消息队列，实现服务间通信。

### 消息队列架构

系统使用以下交换机和队列：

- **liqpro.events**: 主事件交换机（topic 类型）
- **liqpro.commands**: 命令交换机（direct 类型）
- **delayed.messages**: 延迟消息交换机（direct 类型）
- **dead.letter**: 死信交换机（direct 类型）

### 重试机制

消息处理失败时，系统会自动重试：

1. 首次失败：立即重试
2. 后续失败：使用指数退避算法增加延迟
3. 超过最大重试次数：消息发送到死信队列

### 消息队列监控

RabbitMQ 管理界面可通过 http://localhost:15672 访问，默认用户名和密码为 guest/guest。

### 示例代码

```typescript
// 发布消息
await messageQueue.publish(
  'liqpro.events',
  'agent.created',
  { agentId: 'agent-123', name: 'Test Agent' }
);

// 消费消息
await messageQueue.consume(
  'agent-service.agent-events',
  async (message) => {
    // 处理消息
    console.log('Received message:', message.content.toString());
  }
);
```

## 监控系统

LiqPro 使用 Prometheus 和 Grafana 进行系统监控。

### 访问监控界面

- **Grafana**: http://localhost:3000 (默认用户名/密码: admin/secret)
- **Prometheus**: http://localhost:9090

### 主要监控指标

- **HTTP 请求**: 请求数、响应时间、错误率
- **消息队列**: 连接状态、消息发布/消费速率、处理时间
- **Agent 操作**: Agent 数量、操作速率、操作耗时
- **系统健康**: 服务状态、资源使用情况

### 告警配置

系统配置了以下关键告警：

1. **服务宕机**: 服务不可用超过 1 分钟
2. **高错误率**: 5xx 错误率超过 5% 持续 5 分钟
3. **响应缓慢**: 95 百分位响应时间超过 1 秒持续 5 分钟
4. **RabbitMQ 连接丢失**: 服务与 RabbitMQ 断开连接超过 1 分钟

## 常见问题解决

### Docker 相关问题

#### 容器无法启动

```bash
# 检查容器日志
docker-compose logs <service-name>

# 检查网络连接
docker network inspect liqpro-network
```

#### 端口冲突

如果遇到端口冲突，可以修改 `docker-compose.yml` 文件中的端口映射。

### 消息队列问题

#### 连接失败

检查 RabbitMQ 容器是否正常运行：

```bash
docker-compose ps rabbitmq
```

确保环境变量配置正确：

```
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_VHOST=/
```

#### 消息处理失败

检查死信队列中的消息：

```bash
# 通过 RabbitMQ 管理界面查看 dead.letter.queue 队列
```

### 监控系统问题

#### Grafana 无法显示数据

检查 Prometheus 数据源配置是否正确：

```bash
# 检查 Prometheus 是否可访问
curl http://prometheus:9090/api/v1/query?query=up

# 检查 Grafana 数据源配置
cat deploy/docker/grafana/provisioning/datasources/datasources.yaml
```

#### 服务指标不显示

确保服务暴露了 `/metrics` 端点，并且 Prometheus 配置正确：

```bash
# 检查服务指标端点
curl http://api-service:3000/metrics

# 检查 Prometheus 配置
cat deploy/docker/prometheus/prometheus.yml
```

### 开发工作流问题

#### TypeScript 编译错误

```bash
# 清理构建缓存
npm run clean

# 重新安装依赖
npm run install:all

# 重新构建
npm run build
```

#### 测试失败

```bash
# 运行特定服务的测试
cd services/api-service
npm test

# 查看测试覆盖率
npm run test:coverage
```

## 贡献指南

1. 创建功能分支: `git checkout -b feature/your-feature-name`
2. 提交更改: `git commit -m 'feat: add some feature'`
3. 推送到远程: `git push origin feature/your-feature-name`
4. 提交 Pull Request

请确保代码符合项目的编码规范，并通过所有测试。 