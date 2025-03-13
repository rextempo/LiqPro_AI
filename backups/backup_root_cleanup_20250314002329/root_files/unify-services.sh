#!/bin/bash

# 创建日志目录
mkdir -p logs

# 设置日志文件
LOG_FILE="logs/unify-services-$(date +%Y%m%d%H%M%S).log"

# 日志函数
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a $LOG_FILE
}

# 创建备份
BACKUP_DIR="backup_$(date +%Y%m%d%H%M%S)"
log "创建备份目录: $BACKUP_DIR"
mkdir -p $BACKUP_DIR

# 备份当前服务
log "备份当前服务..."
cp -r services $BACKUP_DIR/services 2>/dev/null || log "services 目录不存在，跳过备份"
cp -r signal-service $BACKUP_DIR/signal-service 2>/dev/null || log "signal-service 目录不存在，跳过备份"
cp -r signal-service-fixed $BACKUP_DIR/signal-service-fixed 2>/dev/null || log "signal-service-fixed 目录不存在，跳过备份"
cp -r production/services $BACKUP_DIR/production_services 2>/dev/null || log "production/services 目录不存在，跳过备份"
log "备份完成"

# 创建统一的服务目录
log "创建统一的服务目录..."
mkdir -p unified_services

# 1. Signal Service - 使用 signal-service-fixed
log "处理 Signal Service..."
if [ -d "signal-service-fixed" ]; then
  cp -r signal-service-fixed unified_services/signal-service
  log "已复制 signal-service-fixed 到 unified_services/signal-service"
else
  log "错误: signal-service-fixed 目录不存在"
  exit 1
fi

# 2. Data Service - 使用 services/data-service-real
log "处理 Data Service..."
if [ -d "services/data-service-real" ]; then
  cp -r services/data-service-real unified_services/data-service
  log "已复制 services/data-service-real 到 unified_services/data-service"
else
  log "错误: services/data-service-real 目录不存在"
  exit 1
fi

# 3. API Service - 使用 production/services/api-service
log "处理 API Service..."
if [ -d "production/services/api-service" ]; then
  cp -r production/services/api-service unified_services/api-service
  log "已复制 production/services/api-service 到 unified_services/api-service"
else
  log "错误: production/services/api-service 目录不存在"
  exit 1
fi

# 4. Scoring Service - 使用 production/services/scoring-service
log "处理 Scoring Service..."
if [ -d "production/services/scoring-service" ]; then
  cp -r production/services/scoring-service unified_services/scoring-service
  log "已复制 production/services/scoring-service 到 unified_services/scoring-service"
else
  log "错误: production/services/scoring-service 目录不存在"
  exit 1
fi

# 5. Agent Engine - 使用 production/services/agent-engine
log "处理 Agent Engine..."
if [ -d "production/services/agent-engine" ]; then
  cp -r production/services/agent-engine unified_services/agent-engine
  log "已复制 production/services/agent-engine 到 unified_services/agent-engine"
else
  log "错误: production/services/agent-engine 目录不存在"
  exit 1
fi

# 6. Solana Cache - 使用 services/solana-cache
log "处理 Solana Cache..."
if [ -d "services/solana-cache" ]; then
  cp -r services/solana-cache unified_services/solana-cache
  log "已复制 services/solana-cache 到 unified_services/solana-cache"
else
  log "警告: services/solana-cache 目录不存在，跳过"
fi

# 更新 package.json 中的版本号
log "更新所有服务的版本号..."
for service in unified_services/*; do
  if [ -f "$service/package.json" ]; then
    # 使用 sed 更新版本号为 1.0.0
    sed -i.bak 's/"version": "[^"]*"/"version": "1.0.0"/g' "$service/package.json"
    rm -f "$service/package.json.bak"
    log "已更新 $service/package.json 的版本号为 1.0.0"
  fi
done

# 创建新的 docker-compose.yml
log "创建新的 docker-compose.yml..."
cat > unified_services/docker-compose.yml << 'EOF'
version: '3.8'

services:
  # 前端应用
  frontend:
    image: node:18
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - ../frontend:/app
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=http://localhost:3001
      - REACT_APP_WS_URL=ws://localhost:3001/ws
    networks:
      - liqpro-network
    command: >
      sh -c "npm install --include=dev && npm run start"
    restart: unless-stopped

  # API服务
  api-service:
    image: node:18
    working_dir: /app/api-service
    ports:
      - "3001:3000"
    volumes:
      - ./api-service:/app/api-service
      - ../libs:/app/libs
    environment:
      - NODE_ENV=production
      - SIGNAL_SERVICE_URL=http://signal-service:3000
      - DATA_SERVICE_URL=http://data-service:3000
      - SCORING_SERVICE_URL=http://scoring-service:3000
      - AGENT_SERVICE_URL=http://agent-engine:3000
      - RABBITMQ_HOST=rabbitmq
      - RABBITMQ_PORT=5672
      - MONGODB_URI=mongodb://mongodb:27017/liqpro
    networks:
      - liqpro-network
    depends_on:
      - mongodb
      - rabbitmq
      - signal-service
      - data-service
      - scoring-service
      - agent-engine
    command: >
      sh -c "cd /app/libs/common && npm install && npm run build && 
             cd /app/api-service && npm install && npm start"
    restart: unless-stopped

  # 数据服务
  data-service:
    image: node:18
    working_dir: /app/data-service
    ports:
      - "3002:3000"
    volumes:
      - ./data-service:/app/data-service
    environment:
      - PORT=3000
      - DATA_COLLECTION_INTERVAL=300000
      - MONGO_URI=mongodb://mongodb:27017/liqpro
      - RABBITMQ_HOST=rabbitmq
      - RABBITMQ_PORT=5672
      - RABBITMQ_USER=liqpro
      - RABBITMQ_PASS=liqpro
      - SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
      - LOG_LEVEL=info
    networks:
      - liqpro-network
    depends_on:
      - mongodb
      - rabbitmq
    command: >
      sh -c "npm install && node server.js"
    restart: unless-stopped

  # 信号服务
  signal-service:
    image: node:18
    working_dir: /app/signal-service
    ports:
      - "3003:3000"
    volumes:
      - ./signal-service:/app/signal-service
    environment:
      - PORT=3000
      - RABBITMQ_HOST=rabbitmq
      - RABBITMQ_PORT=5672
      - RABBITMQ_USER=liqpro
      - RABBITMQ_PASS=liqpro
    networks:
      - liqpro-network
    depends_on:
      - rabbitmq
    command: >
      sh -c "npm install && node server.js"
    restart: unless-stopped

  # 评分服务
  scoring-service:
    image: node:18
    working_dir: /app/scoring-service
    ports:
      - "3004:3000"
    volumes:
      - ./scoring-service:/app/scoring-service
      - ../libs:/app/libs
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/liqpro
      - RABBITMQ_HOST=rabbitmq
      - RABBITMQ_PORT=5672
    networks:
      - liqpro-network
    depends_on:
      - mongodb
      - rabbitmq
    command: >
      sh -c "cd /app/libs/common && npm install && npm run build && 
             cd /app/scoring-service && npm install && npm start"
    restart: unless-stopped

  # Agent引擎
  agent-engine:
    image: node:18
    working_dir: /app/agent-engine
    ports:
      - "3005:3000"
    volumes:
      - ./agent-engine:/app/agent-engine
      - ../libs:/app/libs
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/liqpro
      - RABBITMQ_HOST=rabbitmq
      - RABBITMQ_PORT=5672
      - SIGNAL_SERVICE_URL=http://signal-service:3000
      - DATA_SERVICE_URL=http://data-service:3000
      - SCORING_SERVICE_URL=http://scoring-service:3000
    networks:
      - liqpro-network
    depends_on:
      - mongodb
      - rabbitmq
      - data-service
      - signal-service
      - scoring-service
    command: >
      sh -c "cd /app/libs/common && npm install && npm run build && 
             cd /app/agent-engine && npm install && npm start"
    restart: unless-stopped

  # Solana缓存服务
  solana-cache:
    image: node:18
    working_dir: /app/solana-cache
    ports:
      - "3006:3000"
    volumes:
      - ./solana-cache:/app/solana-cache
    environment:
      - PORT=3000
      - SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com
      - CACHE_REFRESH_INTERVAL=60000
      - MONGODB_URI=mongodb://mongodb:27017/liqpro
    networks:
      - liqpro-network
    depends_on:
      - mongodb
    command: >
      sh -c "npm install && npm start"
    restart: unless-stopped

  # MongoDB数据库
  mongodb:
    image: mongo:6
    ports:
      - "27017:27017"
    volumes:
      - mongodb-data:/data/db
    networks:
      - liqpro-network
    restart: unless-stopped

  # RabbitMQ消息队列
  rabbitmq:
    image: rabbitmq:3-management
    ports:
      - "5672:5672"
      - "15672:15672"
    environment:
      - RABBITMQ_DEFAULT_USER=liqpro
      - RABBITMQ_DEFAULT_PASS=liqpro_password
    volumes:
      - rabbitmq-data:/var/lib/rabbitmq
    networks:
      - liqpro-network
    restart: unless-stopped

networks:
  liqpro-network:
    driver: bridge

volumes:
  mongodb-data:
  rabbitmq-data:
EOF
log "已创建新的 docker-compose.yml"

# 创建 README.md
log "创建 README.md..."
cat > unified_services/README.md << 'EOF'
# LiqPro 统一服务

本目录包含 LiqPro 平台的所有微服务的统一版本。

## 服务列表

1. **API Service** - API 网关服务
2. **Data Service** - 数据收集和处理服务
3. **Signal Service** - 信号生成服务
4. **Scoring Service** - 风险评分服务
5. **Agent Engine** - 代理引擎服务
6. **Solana Cache** - Solana 区块链数据缓存服务

## 部署说明

使用以下命令启动所有服务：

```bash
docker-compose up -d
```

## 端口分配

- Frontend: 3000
- API Service: 3001
- Data Service: 3002
- Signal Service: 3003
- Scoring Service: 3004
- Agent Engine: 3005
- Solana Cache: 3006
- MongoDB: 27017
- RabbitMQ: 5672, 15672 (管理界面)

## 版本信息

所有服务版本: 1.0.0
EOF
log "已创建 README.md"

log "版本统一完成！新的统一服务位于 unified_services 目录"
log "请检查 unified_services 目录中的内容，确认所有服务都已正确复制"
log "如果确认无误，可以使用以下命令删除旧版本:"
log "rm -rf services signal-service signal-service-fixed production/services"
log "然后将统一版本移动到适当位置:"
log "mv unified_services services"

exit 0 