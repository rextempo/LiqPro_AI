# LiqPro

LiqPro是基于Solana区块链的AI驱动自动化LP投资平台，帮助用户自动捕捉高质量LP投资机会并执行交易，创造被动收益。

## 项目结构

```
LiqPro/
├── services/              # 微服务目录
│   ├── api-service/       # API网关服务
│   ├── data-service/      # 数据收集和处理服务
│   ├── signal-service/    # 信号生成服务
│   ├── scoring-service/   # 风险评分服务
│   ├── agent-engine/      # 代理引擎服务
│   └── solana-cache/      # Solana区块链数据缓存服务
├── production/            # 生产环境配置和脚本
│   ├── config/            # 配置文件
│   ├── scripts/           # 管理脚本
│   ├── logs/              # 日志文件
│   ├── data/              # 数据文件
│   ├── backups/           # 备份文件
│   └── monitoring/        # 监控配置
├── frontend/              # 前端应用
├── libs/                  # 共享库
├── docs/                  # 文档
├── scripts/               # 开发和部署脚本
└── deploy/                # 部署配置
```

## 微服务

LiqPro平台包含以下微服务：

1. **API服务** (`api-service`) - API网关服务
2. **数据服务** (`data-service`) - 数据收集和处理服务
3. **信号服务** (`signal-service`) - 信号生成服务
4. **评分服务** (`scoring-service`) - 风险评分服务
5. **代理引擎** (`agent-engine`) - 代理引擎服务
6. **Solana缓存** (`solana-cache`) - Solana区块链数据缓存服务

## 开发环境

### 安装依赖

```bash
npm install
```

### 启动开发环境

```bash
npm run dev
```

## 生产环境

### 初始配置

```bash
cd production
cp config/.env.template config/.env
vi config/.env
```

### 启动服务

```bash
cd production
./scripts/start.sh
```

### 监控服务

```bash
cd production
./scripts/monitor.sh
```

### 停止服务

```bash
cd production
./scripts/stop.sh
```

## 文档

详细文档请参阅 `docs` 目录。
