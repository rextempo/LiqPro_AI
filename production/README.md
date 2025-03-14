# LiqPro 生产环境

本目录包含LiqPro平台的生产环境配置和管理脚本。

## 目录结构

```
production/
├── config/                # 配置文件
│   ├── docker-compose.yml        # 生产环境Docker Compose配置
│   ├── docker-compose-local.yml  # 本地生产环境Docker Compose配置
│   └── .env.template             # 环境变量模板
├── scripts/               # 管理脚本
│   ├── start.sh                  # 启动服务
│   ├── stop.sh                   # 停止服务
│   ├── monitor.sh                # 监控服务
│   └── backup.sh                 # 备份数据
├── logs/                  # 日志文件
├── data/                  # 数据文件
├── backups/               # 备份文件
└── monitoring/            # 监控配置
    └── prometheus/               # Prometheus配置
```

## 使用方法

### 初始配置

1. 复制环境变量模板并填写适当的值：
   ```
   cp config/.env.template config/.env
   vi config/.env
   ```

### 启动服务

```
./scripts/start.sh
```

### 停止服务

```
./scripts/stop.sh
```

### 监控服务

```
./scripts/monitor.sh
```

### 备份数据

```
./scripts/backup.sh
```

## 服务列表

LiqPro平台包含以下微服务：

1. **API服务** (`api-service`) - API网关服务
2. **数据服务Real** (`data-service-real`) - 真实数据收集和处理服务
3. **信号服务** (`signal-service`) - 信号生成服务
4. **评分服务** (`scoring-service`) - 风险评分服务
5. **代理引擎** (`agent-engine`) - 代理引擎服务
6. **Solana缓存** (`solana-cache`) - Solana区块链数据缓存服务

## 支持服务

1. **MongoDB** - 数据库服务
2. **RabbitMQ** - 消息队列服务
3. **Redis** - 缓存服务（在某些配置中使用）
4. **Nginx** - 反向代理（在生产环境中使用）
