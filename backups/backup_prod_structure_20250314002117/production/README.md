# LiqPro 生产环境

LiqPro 是一个基于 Solana 区块链的 AI 驱动投资平台，专注于 Meteora DLMM 流动性池。本仓库包含生产环境部署和运行所需的所有文件和配置。

## 目录结构

```
production/
├── services/              # 微服务
│   ├── agent-engine/      # Agent 执行引擎
│   ├── api-service/       # API 网关和认证服务
│   ├── data-service-real/ # 数据收集和存储
│   ├── signal-service/    # 信号生成
│   ├── scoring-service/   # 风险评分和分析
│   └── solana-cache/      # Solana 数据缓存
├── frontend/              # 前端应用
├── data/                  # 数据存储目录
│   ├── mongodb/           # MongoDB 数据
│   ├── rabbitmq/          # RabbitMQ 数据
│   └── redis/             # Redis 数据
├── libs/                  # 共享库
│   └── common/            # 通用工具和类型
├── scripts/               # 部署和维护脚本
├── deploy/                # 部署配置
└── .env-files/            # 环境变量配置
```

## 快速启动

使用以下命令启动本地生产环境：

```bash
./scripts/start-local-production.sh
```

或者使用部署脚本进行完整部署：

```bash
./scripts/local-production-deploy.sh
```

这将启动所有必要的 Docker 容器，并配置它们使用生产环境设置。

## 主要文件说明

- `docker-compose-local-prod.yml` - 本地生产环境 Docker Compose 配置
- `scripts/local-production-deploy.sh` - 本地生产环境部署脚本
- `scripts/backup-local-prod.sh` - 数据库备份脚本
- `scripts/monitor-local-prod.sh` - 监控服务状态的脚本
- `scripts/start-local-production.sh` - 启动本地生产环境脚本
- `scripts/stop-local-production.sh` - 停止本地生产环境脚本

# LiqPro 数据服务

本项目包含LiqPro平台的数据服务，负责收集、处理和提供Meteora DLMM池的数据。

## 功能特性

- 实时收集Meteora DLMM池数据
- 生成并存储池数据的时间维度快照（每小时、每日、每周）
- 提供RESTful API访问池数据和历史快照
- 支持RabbitMQ消息队列集成
- 完整的日志记录和监控

## 环境要求

- Node.js 18+
- Docker 和 Docker Compose
- MongoDB
- RabbitMQ

## 目录结构

```
production/
├── src/                    # 源代码
│   ├── models/             # 数据模型
│   ├── routes/             # API路由
│   ├── services/           # 服务层
│   ├── utils/              # 工具函数
│   └── meteora/            # Meteora相关功能
├── scripts/                # 部署和管理脚本
├── logs/                   # 日志文件
├── server-real.js          # 服务入口文件
├── Dockerfile.data-service-real  # Docker构建文件
├── docker-compose-local-prod.yml # Docker Compose配置
└── .env                    # 环境变量配置
```

## 快速开始

### 环境配置

1. 确保MongoDB和RabbitMQ已启动并运行
2. 复制`.env.example`为`.env`并根据需要修改配置

### 使用脚本部署

部署data-service-real服务:

```bash
./scripts/deploy-data-service-real.sh
```

清理旧版data-service:

```bash
./scripts/cleanup-old-data-service.sh
```

### 手动部署

1. 构建Docker镜像:

```bash
docker build -t liqpro/data-service-real -f Dockerfile.data-service-real .
```

2. 运行容器:

```bash
docker run -d \
  --name data-service-real \
  -p 3004:3000 \
  -e PORT=3000 \
  -e DATA_COLLECTION_INTERVAL=300000 \
  -e MONGO_URI=mongodb://host.docker.internal:27017/liqpro \
  -e RABBITMQ_HOST=host.docker.internal \
  -e RABBITMQ_PORT=5672 \
  -e RABBITMQ_USER=liqpro \
  -e RABBITMQ_PASS=liqpro \
  -e SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com \
  -e LOG_LEVEL=info \
  -e HOURLY_SNAPSHOTS_TO_KEEP=168 \
  -e DAILY_SNAPSHOTS_TO_KEEP=90 \
  -e WEEKLY_SNAPSHOTS_TO_KEEP=52 \
  -v "$(pwd)/logs:/app/logs" \
  --restart unless-stopped \
  liqpro/data-service-real
```

## API端点

### 健康检查

```
GET /health
```

### Meteora池数据

```
GET /api/v1/meteora/pools                # 获取所有池
GET /api/v1/meteora/pools/:address       # 获取特定池信息
GET /api/v1/meteora/pools/pair/:token0/:token1  # 获取特定代币对的池
```

### 快照数据

```
GET /api/v1/meteora/snapshots/hourly     # 获取小时级快照
GET /api/v1/meteora/snapshots/daily      # 获取日级快照
GET /api/v1/meteora/snapshots/weekly     # 获取周级快照
GET /api/v1/meteora/snapshots/:poolAddress/hourly  # 获取特定池的小时级快照
GET /api/v1/meteora/snapshots/:poolAddress/daily   # 获取特定池的日级快照
GET /api/v1/meteora/snapshots/:poolAddress/weekly  # 获取特定池的周级快照
```

## 环境变量

| 变量名 | 描述 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3000 |
| DATA_COLLECTION_INTERVAL | 数据收集间隔(毫秒) | 300000 |
| MONGO_URI | MongoDB连接URI | mongodb://localhost:27017/liqpro |
| RABBITMQ_HOST | RabbitMQ主机 | rabbitmq |
| RABBITMQ_PORT | RabbitMQ端口 | 5672 |
| RABBITMQ_USER | RabbitMQ用户名 | liqpro |
| RABBITMQ_PASS | RabbitMQ密码 | liqpro |
| SOLANA_RPC_ENDPOINT | Solana RPC端点 | https://api.mainnet-beta.solana.com |
| LOG_LEVEL | 日志级别 | info |
| HOURLY_SNAPSHOTS_TO_KEEP | 保留的小时级快照数量 | 168 |
| DAILY_SNAPSHOTS_TO_KEEP | 保留的日级快照数量 | 90 |
| WEEKLY_SNAPSHOTS_TO_KEEP | 保留的周级快照数量 | 52 |

## 日志

日志文件存储在`logs`目录中:

- `logs/combined.log`: 所有级别的日志
- `logs/error.log`: 仅错误级别的日志

查看容器日志:

```bash
docker logs -f data-service-real
```

## 故障排除

1. 如果服务无法连接到MongoDB或RabbitMQ，请检查这些服务是否正在运行，以及连接URI是否正确
2. 如果数据收集失败，请检查Solana RPC端点是否可用
3. 对于Docker网络问题，请确保使用`host.docker.internal`来访问主机上的服务 