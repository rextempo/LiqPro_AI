#!/bin/bash

# 创建日志目录
mkdir -p logs

# 设置日志文件
LOG_FILE="logs/optimize-prod-structure-$(date +%Y%m%d%H%M%S).log"

# 日志函数
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a $LOG_FILE
}

# 创建备份
BACKUP_DIR="backup_prod_structure_$(date +%Y%m%d%H%M%S)"
log "创建备份目录: $BACKUP_DIR"
mkdir -p $BACKUP_DIR

# 备份当前生产环境相关文件和目录
log "备份当前生产环境相关文件和目录..."
cp -r production $BACKUP_DIR/ 2>/dev/null || log "production 目录不存在，跳过备份"
cp docker-compose.production.yml $BACKUP_DIR/ 2>/dev/null || log "docker-compose.production.yml 不存在，跳过备份"
cp docker-compose-local-prod.yml $BACKUP_DIR/ 2>/dev/null || log "docker-compose-local-prod.yml 不存在，跳过备份"
cp -r deploy $BACKUP_DIR/ 2>/dev/null || log "deploy 目录不存在，跳过备份"
log "备份完成"

# 创建标准化的生产环境目录结构
log "创建标准化的生产环境目录结构..."

# 1. 创建主要生产环境目录
mkdir -p production/config
mkdir -p production/scripts
mkdir -p production/logs
mkdir -p production/data
mkdir -p production/backups
mkdir -p production/monitoring

# 2. 整理和移动配置文件
log "整理和移动配置文件..."

# 移动Docker Compose配置文件
if [ -f "docker-compose.production.yml" ]; then
  cp docker-compose.production.yml production/config/docker-compose.yml
  log "已复制 docker-compose.production.yml 到 production/config/docker-compose.yml"
fi

if [ -f "docker-compose-local-prod.yml" ]; then
  cp docker-compose-local-prod.yml production/config/docker-compose-local.yml
  log "已复制 docker-compose-local-prod.yml 到 production/config/docker-compose-local.yml"
fi

# 创建环境变量模板文件
cat > production/config/.env.template << 'EOF'
# LiqPro 生产环境配置模板
# 复制此文件为 .env 并填写适当的值

# 通用配置
NODE_ENV=production
LOG_LEVEL=info

# MongoDB配置
MONGODB_URI=mongodb://mongodb:27017/liqpro

# RabbitMQ配置
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=liqpro
RABBITMQ_PASSWORD=your_secure_password

# Solana配置
SOLANA_RPC_URL=https://api.mainnet-beta.solana.com
SOLANA_WEBSOCKET_URL=wss://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
METEORA_DLMM_PROGRAM_ID=LMMMnnLL3xMsHQY5QgPmJgZDrYRKsRzuqJBD9RBaLUx

# 服务配置
API_SERVICE_PORT=3000
DATA_SERVICE_PORT=3001
SIGNAL_SERVICE_PORT=3002
SCORING_SERVICE_PORT=3003
AGENT_ENGINE_PORT=3004
SOLANA_CACHE_PORT=3006

# 安全配置
API_KEY=your_secure_api_key
JWT_SECRET=your_secure_jwt_secret
EOF
log "已创建环境变量模板文件"

# 3. 创建生产环境管理脚本
log "创建生产环境管理脚本..."

# 启动脚本
cat > production/scripts/start.sh << 'EOF'
#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")/.."

# 检查环境文件
if [ ! -f "config/.env" ]; then
  echo "错误: 环境配置文件不存在"
  echo "请复制 config/.env.template 为 config/.env 并填写适当的值"
  exit 1
fi

# 加载环境变量
export $(grep -v '^#' config/.env | xargs)

# 启动服务
echo "启动 LiqPro 生产环境服务..."
docker-compose -f config/docker-compose.yml up -d

# 检查服务状态
echo "服务状态:"
docker-compose -f config/docker-compose.yml ps

echo "服务已启动，可以通过以下命令查看日志:"
echo "docker-compose -f config/docker-compose.yml logs -f"
EOF
chmod +x production/scripts/start.sh
log "已创建启动脚本"

# 停止脚本
cat > production/scripts/stop.sh << 'EOF'
#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")/.."

# 停止服务
echo "停止 LiqPro 生产环境服务..."
docker-compose -f config/docker-compose.yml down

echo "服务已停止"
EOF
chmod +x production/scripts/stop.sh
log "已创建停止脚本"

# 监控脚本
cat > production/scripts/monitor.sh << 'EOF'
#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")/.."

# 显示服务状态
echo "服务状态:"
docker-compose -f config/docker-compose.yml ps

# 显示资源使用情况
echo -e "\n资源使用情况:"
docker stats --no-stream $(docker-compose -f config/docker-compose.yml ps -q)

# 检查服务日志中的错误
echo -e "\n检查服务日志中的错误:"
for service in api-service data-service signal-service scoring-service agent-engine solana-cache; do
  echo -e "\n$service 服务的错误日志:"
  docker-compose -f config/docker-compose.yml logs --tail=50 $service | grep -i "error\|exception\|fail" || echo "没有发现错误"
done
EOF
chmod +x production/scripts/monitor.sh
log "已创建监控脚本"

# 备份脚本
cat > production/scripts/backup.sh << 'EOF'
#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")/.."

# 创建备份目录
BACKUP_DIR="backups/backup_$(date +%Y%m%d%H%M%S)"
mkdir -p $BACKUP_DIR

# 备份MongoDB数据
echo "备份MongoDB数据..."
docker-compose -f config/docker-compose.yml exec -T mongodb mongodump --out /data/db/backup
docker cp $(docker-compose -f config/docker-compose.yml ps -q mongodb):/data/db/backup $BACKUP_DIR/mongodb

# 备份配置文件
echo "备份配置文件..."
cp -r config $BACKUP_DIR/

echo "备份完成，备份文件位于: $BACKUP_DIR"
EOF
chmod +x production/scripts/backup.sh
log "已创建备份脚本"

# 4. 创建监控配置
log "创建监控配置..."

# Prometheus配置
mkdir -p production/monitoring/prometheus
cat > production/monitoring/prometheus/prometheus.yml << 'EOF'
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'liqpro'
    static_configs:
      - targets: ['api-service:3000', 'data-service:3001', 'signal-service:3002', 'scoring-service:3003', 'agent-engine:3004', 'solana-cache:3006']
EOF
log "已创建Prometheus配置"

# 5. 创建README文件
cat > production/README.md << 'EOF'
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
2. **数据服务** (`data-service`) - 数据收集和处理服务
3. **信号服务** (`signal-service`) - 信号生成服务
4. **评分服务** (`scoring-service`) - 风险评分服务
5. **代理引擎** (`agent-engine`) - 代理引擎服务
6. **Solana缓存** (`solana-cache`) - Solana区块链数据缓存服务

## 支持服务

1. **MongoDB** - 数据库服务
2. **RabbitMQ** - 消息队列服务
3. **Redis** - 缓存服务（在某些配置中使用）
4. **Nginx** - 反向代理（在生产环境中使用）
EOF
log "已创建README文件"

log "生产环境目录结构优化完成！"
log "新的生产环境目录结构位于 production/ 目录"
log "备份已保存在 $BACKUP_DIR 目录"
log "请检查日志文件 $LOG_FILE 了解详细信息" 