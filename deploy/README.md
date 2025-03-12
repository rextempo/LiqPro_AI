# LiqPro 部署指南

本文档提供 LiqPro 项目的部署指南，包括环境设置、构建和部署步骤。

## 目录

1. [部署架构](#部署架构)
2. [环境要求](#环境要求)
3. [部署流程](#部署流程)
4. [环境变量配置](#环境变量配置)
5. [CI/CD 流程](#cicd-流程)
6. [监控和告警](#监控和告警)
7. [常见问题解决](#常见问题解决)

## 部署架构

LiqPro 采用微服务架构，使用 Docker 和 Docker Compose 进行容器化部署。主要组件包括：

- **API 服务**: 提供 RESTful API 接口
- **数据服务**: 负责市场数据收集和处理
- **信号服务**: 生成交易信号
- **评分服务**: 评估信号质量
- **Agent 引擎**: 执行交易策略
- **RabbitMQ**: 消息队列，用于服务间通信
- **Nginx**: 反向代理和静态文件服务
- **Prometheus & Grafana**: 监控和告警系统

## 环境要求

部署 LiqPro 需要以下软件和工具：

- **Docker**: 20.10.x 或更高版本
- **Docker Compose**: 2.x 或更高版本
- **Git**: 最新稳定版
- **Node.js**: v16.x 或更高版本 (仅用于本地构建)
- **npm**: v8.x 或更高版本 (仅用于本地构建)

服务器硬件推荐配置：

- **CPU**: 4 核或更多
- **内存**: 8GB 或更多
- **存储**: 50GB 或更多
- **网络**: 稳定的互联网连接

## 部署流程

### 1. 克隆代码库

```bash
git clone https://github.com/your-org/liqpro.git
cd liqpro
```

### 2. 设置环境变量

使用环境设置脚本创建环境变量文件：

```bash
# 设置测试环境
./scripts/setup-env.sh --env staging

# 设置生产环境
./scripts/setup-env.sh --env production
```

### 3. 构建 Docker 镜像

使用构建脚本构建 Docker 镜像：

```bash
# 构建测试环境镜像
./scripts/build.sh --env staging

# 构建生产环境镜像
./scripts/build.sh --env production

# 构建并推送到镜像仓库
./scripts/build.sh --env production --registry your-registry.com/ --push
```

### 4. 部署应用

使用部署脚本部署应用：

```bash
# 部署到测试环境
./scripts/deploy.sh --env staging

# 部署到生产环境
./scripts/deploy.sh --env production

# 部署应用和监控系统
./scripts/deploy.sh --env production --with-monitoring
```

### 5. 验证部署

部署完成后，可以通过以下方式验证：

- 访问 API 服务: http://your-server-ip/api/health
- 访问 Grafana 监控: http://your-server-ip:3000
- 访问 Prometheus: http://your-server-ip:9090

## 环境变量配置

LiqPro 使用环境变量进行配置。主要环境变量包括：

### 基本配置

- `NODE_ENV`: 环境类型 (development, staging, production)
- `LOG_LEVEL`: 日志级别 (debug, info, warn, error)

### RabbitMQ 配置

- `RABBITMQ_HOST`: RabbitMQ 主机地址
- `RABBITMQ_PORT`: RabbitMQ 端口
- `RABBITMQ_USER`: RabbitMQ 用户名
- `RABBITMQ_PASSWORD`: RabbitMQ 密码
- `RABBITMQ_VHOST`: RabbitMQ 虚拟主机

### Solana 配置

- `SOLANA_RPC_URL`: Solana RPC URL
- `SOLANA_RPC_API_KEY`: Solana RPC API 密钥
- `WALLET_PRIVATE_KEY`: 钱包私钥 (仅生产环境)

### Docker 配置

- `REGISTRY`: Docker 镜像仓库 URL
- `TAG`: Docker 镜像标签

## CI/CD 流程

LiqPro 使用 GitHub Actions 实现 CI/CD 流程。主要工作流包括：

### 测试工作流

- 触发条件: 推送到任何分支或创建 Pull Request
- 执行操作: 代码检查、单元测试、集成测试

### 构建工作流

- 触发条件: 推送到 main 或 develop 分支
- 执行操作: 构建 Docker 镜像、推送到镜像仓库

### 部署工作流

- 触发条件: 推送到 main 分支 (生产环境) 或 develop 分支 (测试环境)
- 执行操作: 部署应用到相应环境

## 监控和告警

LiqPro 使用 Prometheus 和 Grafana 进行监控和告警。

### 监控指标

- **服务健康**: 服务可用性和响应时间
- **消息队列**: 消息处理速率和错误率
- **系统资源**: CPU、内存和磁盘使用情况

### 告警规则

- **服务宕机**: 服务不可用超过 1 分钟
- **高错误率**: 错误率超过 5% 持续 5 分钟
- **响应缓慢**: 95 百分位响应时间超过 1 秒持续 5 分钟
- **RabbitMQ 连接丢失**: 服务与 RabbitMQ 断开连接超过 1 分钟

### 告警通知

告警可以通过以下渠道发送：

- Email
- Slack
- Webhook
- PagerDuty

## 常见问题解决

### 部署失败

检查以下可能的原因：

- Docker 服务未运行
- 环境变量配置错误
- 网络连接问题
- 磁盘空间不足

解决方法：

```bash
# 检查 Docker 服务状态
systemctl status docker

# 检查环境变量
cat .env

# 检查网络连接
ping rabbitmq

# 检查磁盘空间
df -h
```

### 服务无法启动

检查服务日志：

```bash
# 查看所有服务日志
docker-compose -f deploy/docker/docker-compose.prod.yml logs

# 查看特定服务日志
docker-compose -f deploy/docker/docker-compose.prod.yml logs api-service
```

### 监控系统问题

如果监控系统无法正常工作，检查以下内容：

- Prometheus 配置
- Grafana 数据源配置
- 服务指标端点是否可访问

```bash
# 检查 Prometheus 配置
cat deploy/docker/prometheus/prometheus.yml

# 检查 Prometheus 目标状态
curl http://localhost:9090/api/v1/targets

# 检查服务指标端点
curl http://api-service:3000/metrics
```

## 更多资源

- [开发环境指南](../docs/development-environment.md)
- [消息队列集成指南](../docs/message-queue-integration.md)
- [监控系统指南](../docs/monitoring-system.md) 