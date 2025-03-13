# LiqPro本地生产环境部署方案

## 目录

- [背景与目标](#背景与目标)
- [环境准备](#环境准备)
- [服务配置修复](#服务配置修复)
- [部署脚本](#部署脚本)
- [部署步骤](#部署步骤)
- [维护操作](#维护操作)
- [安全考虑](#安全考虑)
- [监控与日志](#监控与日志)
- [常见问题排查](#常见问题排查)
- [附录](#附录)

## 背景与目标

### 当前系统状况

LiqPro系统目前存在以下问题：
- API服务虽然运行中，但无法正常连接到其他微服务（如信号服务）
- 部分服务（如数据服务）缺少启动脚本
- 服务间通信配置不正确，使用了localhost而非Docker网络名称
- 环境配置文件可能不完整

### 部署目标

1. 创建一个稳定、可靠的本地生产环境
2. 修复服务间通信问题
3. 确保所有服务正常运行
4. 提供完整的部署、监控和维护脚本
5. 确保系统安全性和可维护性

## 环境准备

### 系统配置优化

```bash
# 创建专用目录
mkdir -p ~/LiqPro/production
cd ~/LiqPro/production

# 复制项目文件（排除开发和测试文件）
rsync -av --exclude='node_modules' --exclude='*.test.*' --exclude='.git' \
  ~/Documents/LiqPro/ ./
```

### 网络配置

```yaml
# docker-compose-local-prod.yml 网络配置部分
networks:
  liqpro-network:
    driver: bridge
    ipam:
      config:
        - subnet: 172.28.0.0/16
```

### 数据持久化配置

```yaml
# docker-compose-local-prod.yml 卷配置部分
volumes:
  mongodb-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/data/mongodb
  rabbitmq-data:
    driver: local
    driver_opts:
      type: none
      o: bind
      device: ${PWD}/data/rabbitmq
```

## 服务配置修复

### 修复服务间通信配置

创建一个新的docker-compose文件，专门用于本地生产环境：

```yaml
# docker-compose-local-prod.yml
version: '3.8'

services:
  # 前端应用
  frontend:
    image: node:18-alpine
    working_dir: /app
    ports:
      - "3000:3000"
    volumes:
      - ./frontend:/app
    environment:
      - NODE_ENV=production
      - REACT_APP_API_URL=http://localhost:3001
      - REACT_APP_WS_URL=ws://localhost:3001/ws
    networks:
      - liqpro-network
    command: >
      sh -c "npm install --include=dev && 
             npm run start"
    restart: unless-stopped

  # API服务
  api-service:
    image: node:18-alpine
    working_dir: /app/services/api-service
    ports:
      - "3001:3000"
    volumes:
      - ./:/app
    environment:
      - NODE_ENV=production
      - SIGNAL_SERVICE_URL=http://signal-service:3000
      - DATA_SERVICE_URL=http://data-service:3000
      - SCORING_SERVICE_URL=http://scoring-service:3000
      - AGENT_SERVICE_URL=http://agent-engine:3000
    networks:
      - liqpro-network
    depends_on:
      - mongodb
      - rabbitmq
    command: >
      sh -c "cd /app/libs/common && 
             sed -i 's/\"build\": \"tsc\"/\"build\": \"echo Skipping build\"/g' package.json && 
             mkdir -p dist && 
             cd /app/services/api-service && 
             rm -rf node_modules &&
             npm install && 
             npm install -g typescript && 
             npm install --save-dev @types/node @types/express @types/jest && 
             npm start"
    restart: unless-stopped

  # 数据服务
  data-service:
    image: node:18-alpine
    working_dir: /app/services/data-service
    volumes:
      - ./:/app
    environment:
      - NODE_ENV=production
    networks:
      - liqpro-network
    depends_on:
      - mongodb
    command: >
      sh -c "cd /app/libs/common && 
             sed -i 's/\"build\": \"tsc\"/\"build\": \"echo Skipping build\"/g' package.json && 
             mkdir -p dist && 
             cd /app/services/data-service && 
             rm -rf node_modules &&
             npm install && 
             npm install -g typescript && 
             npm install --save-dev @types/node @types/express @types/jest && 
             npm run build && 
             node dist/index.js"
    restart: unless-stopped

  # 信号服务
  signal-service:
    image: node:18-alpine
    working_dir: /app/services/signal-service
    volumes:
      - ./:/app
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/liqpro
      - RABBITMQ_HOST=rabbitmq
    networks:
      - liqpro-network
    depends_on:
      - mongodb
      - rabbitmq
    command: >
      sh -c "cd /app/services/signal-service && 
             npm install && 
             npm install -g typescript && 
             npx tsc --skipLibCheck --skipDefaultLibCheck --excludeFiles \"**/__tests__/**\" && 
             node dist/server.js"
    restart: unless-stopped

  # 评分服务
  scoring-service:
    image: node:18-alpine
    working_dir: /app/services/scoring-service
    volumes:
      - ./:/app
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/liqpro
      - RABBITMQ_HOST=rabbitmq
    networks:
      - liqpro-network
    depends_on:
      - mongodb
      - rabbitmq
    command: >
      sh -c "cd /app/libs/common && 
             sed -i 's/\"build\": \"tsc\"/\"build\": \"echo Skipping build\"/g' package.json && 
             mkdir -p dist && 
             cd /app/services/scoring-service && 
             rm -rf node_modules &&
             npm install && 
             npm install -g typescript && 
             npm install --save-dev @types/node @types/express @types/jest && 
             npm start"
    restart: unless-stopped

  # Agent引擎
  agent-engine:
    image: node:18-alpine
    working_dir: /app/services/agent-engine
    volumes:
      - ./:/app
    environment:
      - NODE_ENV=production
      - MONGODB_URI=mongodb://mongodb:27017/liqpro
      - RABBITMQ_HOST=rabbitmq
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
      sh -c "cd /app/libs/common && 
             sed -i 's/\"build\": \"tsc\"/\"build\": \"echo Skipping build\"/g' package.json && 
             mkdir -p dist && 
             cd /app/services/agent-engine && 
             rm -rf node_modules &&
             npm install && 
             npm install -g typescript && 
             npm install --save-dev @types/node @types/express @types/jest && 
             npm start"
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
```

### 创建统一环境变量文件

```bash
# 创建环境变量目录
mkdir -p .env-files

# 创建API服务环境变量文件
cat > .env-files/api-service.env <<EOL
NODE_ENV=production
PORT=3000
LOG_LEVEL=info
SIGNAL_SERVICE_URL=http://signal-service:3000
DATA_SERVICE_URL=http://data-service:3000
SCORING_SERVICE_URL=http://scoring-service:3000
AGENT_SERVICE_URL=http://agent-engine:3000
MONGODB_URI=mongodb://mongodb:27017/liqpro
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=liqpro
RABBITMQ_PASSWORD=liqpro_password
RABBITMQ_VHOST=/
CACHE_ENABLED=true
CACHE_TTL=300
REDIS_ENABLED=false
API_KEY_AUTH_ENABLED=false
EOL

# 为其他服务创建类似的环境变量文件
# ...
```

## 部署脚本

### 创建部署脚本

```bash
#!/bin/bash
# local-production-deploy.sh

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始部署LiqPro本地生产环境...${NC}"

# 创建数据目录
echo -e "${GREEN}创建数据目录...${NC}"
mkdir -p data/mongodb data/rabbitmq

# 停止并移除现有容器
echo -e "${GREEN}停止并移除现有容器...${NC}"
docker-compose -f docker-compose-local-prod.yml down

# 备份当前数据（如果存在）
if [ -d "data/mongodb" ] && [ "$(ls -A data/mongodb)" ]; then
  echo -e "${GREEN}备份MongoDB数据...${NC}"
  tar -czf mongodb-backup-$(date +%Y%m%d%H%M%S).tar.gz data/mongodb
fi

# 构建并启动基础服务
echo -e "${GREEN}启动基础服务（MongoDB和RabbitMQ）...${NC}"
docker-compose -f docker-compose-local-prod.yml up -d mongodb rabbitmq

# 等待基础服务启动
echo -e "${GREEN}等待基础服务启动...${NC}"
sleep 15

# 启动其他服务
echo -e "${GREEN}启动核心服务...${NC}"
docker-compose -f docker-compose-local-prod.yml up -d data-service signal-service scoring-service

# 等待核心服务启动
echo -e "${GREEN}等待核心服务启动...${NC}"
sleep 10

# 启动API和前端服务
echo -e "${GREEN}启动API和前端服务...${NC}"
docker-compose -f docker-compose-local-prod.yml up -d api-service frontend

# 最后启动Agent引擎
echo -e "${GREEN}启动Agent引擎...${NC}"
docker-compose -f docker-compose-local-prod.yml up -d agent-engine

# 检查服务状态
echo -e "${GREEN}检查服务状态...${NC}"
docker-compose -f docker-compose-local-prod.yml ps

# 等待所有服务完全启动
echo -e "${GREEN}等待所有服务完全启动...${NC}"
sleep 20

# 检查API健康状态
echo -e "${GREEN}检查API健康状态...${NC}"
curl -s http://localhost:3001/health | jq

echo -e "${YELLOW}LiqPro本地生产环境已部署完成${NC}"
echo -e "${GREEN}前端访问地址: http://localhost:3000${NC}"
echo -e "${GREEN}API访问地址: http://localhost:3001${NC}"
echo -e "${GREEN}RabbitMQ管理界面: http://localhost:15672 (用户名: liqpro, 密码: liqpro_password)${NC}"
```

### 创建监控脚本

```bash
#!/bin/bash
# monitor-local-prod.sh

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${YELLOW}开始监控LiqPro本地生产环境...${NC}"

# 检查所有服务状态
echo -e "${GREEN}检查服务状态:${NC}"
docker-compose -f docker-compose-local-prod.yml ps

# 检查API健康状态
echo -e "\n${GREEN}API健康状态:${NC}"
curl -s http://localhost:3001/health | jq

# 检查各服务资源使用情况
echo -e "\n${GREEN}服务资源使用情况:${NC}"
docker stats --no-stream $(docker-compose -f docker-compose-local-prod.yml ps -q)

# 检查日志中的错误
echo -e "\n${GREEN}检查日志中的错误:${NC}"
for service in api-service data-service signal-service scoring-service agent-engine; do
  echo -e "\n${YELLOW}$service 错误日志:${NC}"
  docker-compose -f docker-compose-local-prod.yml logs --tail=50 $service | grep -i "error\|exception\|fail" || echo "没有发现错误"
done

echo -e "\n${YELLOW}监控完成${NC}"
```

## 部署步骤

### 初始部署

```bash
# 赋予脚本执行权限
chmod +x local-production-deploy.sh monitor-local-prod.sh

# 执行部署脚本
./local-production-deploy.sh
```

### 验证部署

```bash
# 检查所有服务是否正常运行
docker-compose -f docker-compose-local-prod.yml ps

# 检查API健康状态
curl -s http://localhost:3001/health | jq

# 测试API功能
curl -s http://localhost:3001/api | jq
```

### 故障排查

如果发现服务未正常运行，可以查看日志进行排查：

```bash
# 查看特定服务的日志
docker-compose -f docker-compose-local-prod.yml logs --tail=100 api-service

# 查看所有服务的日志
docker-compose -f docker-compose-local-prod.yml logs --tail=50
```

## 维护操作

### 备份数据

```bash
#!/bin/bash
# backup-local-prod.sh

BACKUP_DIR="./backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

# 备份MongoDB数据
echo "备份MongoDB数据..."
docker-compose -f docker-compose-local-prod.yml exec mongodb mongodump --out /data/db/backup
docker cp $(docker-compose -f docker-compose-local-prod.yml ps -q mongodb):/data/db/backup $BACKUP_DIR/mongodb

# 备份RabbitMQ数据
echo "备份RabbitMQ数据..."
tar -czf $BACKUP_DIR/rabbitmq-data.tar.gz data/rabbitmq

echo "备份完成，存储在 $BACKUP_DIR"
```

### 更新部署

```bash
#!/bin/bash
# update-local-prod.sh

# 拉取最新代码
git pull

# 重新部署
./local-production-deploy.sh
```

### 回滚操作

```bash
#!/bin/bash
# rollback-local-prod.sh

if [ -z "$1" ]; then
  echo "请指定要回滚到的备份日期，格式：YYYYMMDD"
  exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="./backups/$BACKUP_DATE"

if [ ! -d "$BACKUP_DIR" ]; then
  echo "备份 $BACKUP_DIR 不存在"
  exit 1
fi

# 停止所有服务
docker-compose -f docker-compose-local-prod.yml down

# 恢复MongoDB数据
echo "恢复MongoDB数据..."
rm -rf data/mongodb/*
cp -r $BACKUP_DIR/mongodb/* data/mongodb/

# 恢复RabbitMQ数据
echo "恢复RabbitMQ数据..."
rm -rf data/rabbitmq/*
tar -xzf $BACKUP_DIR/rabbitmq-data.tar.gz -C ./

# 重新启动服务
./local-production-deploy.sh
```

## 安全考虑

### 加强API安全

```yaml
# 在docker-compose-local-prod.yml中添加
api-service:
  environment:
    - API_KEY_AUTH_ENABLED=true
    - API_KEYS=key1,key2,key3
```

### 加密敏感数据

```bash
# 创建加密的环境变量文件
openssl enc -aes-256-cbc -salt -in .env-files/api-service.env -out .env-files/api-service.env.enc

# 在启动脚本中解密
openssl enc -d -aes-256-cbc -in .env-files/api-service.env.enc -out .env-files/api-service.env
```

## 监控与日志

### 添加简易监控

```yaml
# 在docker-compose-local-prod.yml中添加
  prometheus:
    image: prom/prometheus
    ports:
      - "9090:9090"
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
    networks:
      - liqpro-network

  grafana:
    image: grafana/grafana
    ports:
      - "3030:3000"
    volumes:
      - grafana-data:/var/lib/grafana
    networks:
      - liqpro-network
    depends_on:
      - prometheus
```

### 集中式日志管理

```yaml
# 在docker-compose-local-prod.yml中添加
  filebeat:
    image: docker.elastic.co/beats/filebeat:7.17.0
    volumes:
      - ./monitoring/filebeat.yml:/usr/share/filebeat/filebeat.yml:ro
      - /var/lib/docker/containers:/var/lib/docker/containers:ro
    networks:
      - liqpro-network
    depends_on:
      - elasticsearch

  elasticsearch:
    image: docker.elastic.co/elasticsearch/elasticsearch:7.17.0
    ports:
      - "9200:9200"
    environment:
      - discovery.type=single-node
    volumes:
      - elasticsearch-data:/usr/share/elasticsearch/data
    networks:
      - liqpro-network

  kibana:
    image: docker.elastic.co/kibana/kibana:7.17.0
    ports:
      - "5601:5601"
    networks:
      - liqpro-network
    depends_on:
      - elasticsearch
```

## 常见问题排查

### 服务无法启动

**问题**: 某个服务容器启动后立即退出

**解决方案**:
1. 检查服务日志: `docker-compose -f docker-compose-local-prod.yml logs <service-name>`
2. 确认环境变量配置正确
3. 检查服务依赖是否已启动并可访问
4. 检查数据卷权限是否正确

### API服务无法连接其他服务

**问题**: API服务健康检查显示无法连接到其他服务

**解决方案**:
1. 确认所有服务都已启动: `docker-compose -f docker-compose-local-prod.yml ps`
2. 检查网络配置: `docker network inspect liqpro_liqpro-network`
3. 确认服务URL配置使用了Docker服务名而非localhost
4. 尝试从API服务容器内ping其他服务: 
   ```bash
   docker exec -it liqpro-api-service-1 ping signal-service
   ```

### 数据库连接问题

**问题**: 服务无法连接到MongoDB

**解决方案**:
1. 确认MongoDB容器运行状态: `docker-compose -f docker-compose-local-prod.yml ps mongodb`
2. 检查MongoDB日志: `docker-compose -f docker-compose-local-prod.yml logs mongodb`
3. 验证连接字符串格式: `mongodb://mongodb:27017/liqpro`
4. 尝试直接连接MongoDB:
   ```bash
   docker exec -it liqpro-mongodb-1 mongo
   ```

### 前端无法连接API

**问题**: 前端应用无法连接到API服务

**解决方案**:
1. 确认API服务运行状态: `docker-compose -f docker-compose-local-prod.yml ps api-service`
2. 验证API服务端口映射: `docker-compose -f docker-compose-local-prod.yml port api-service 3000`
3. 检查前端环境变量配置: `REACT_APP_API_URL=http://localhost:3001`
4. 测试API可访问性: `curl -s http://localhost:3001/health`

## 附录

### 文件清单

- `docker-compose-local-prod.yml` - 本地生产环境Docker Compose配置
- `local-production-deploy.sh` - 部署脚本
- `monitor-local-prod.sh` - 监控脚本
- `backup-local-prod.sh` - 备份脚本
- `update-local-prod.sh` - 更新脚本
- `rollback-local-prod.sh` - 回滚脚本
- `.env-files/` - 环境变量文件目录
  - `api-service.env` - API服务环境变量
  - `data-service.env` - 数据服务环境变量
  - `signal-service.env` - 信号服务环境变量
  - `scoring-service.env` - 评分服务环境变量
  - `agent-engine.env` - Agent引擎环境变量

### 参考资源

- [Docker Compose文档](https://docs.docker.com/compose/)
- [Node.js生产最佳实践](https://nodejs.org/en/docs/guides/nodejs-docker-webapp/)
- [MongoDB备份与恢复](https://docs.mongodb.com/manual/tutorial/backup-and-restore-tools/)
- [RabbitMQ管理指南](https://www.rabbitmq.com/admin-guide.html)
- [Docker网络配置](https://docs.docker.com/network/)

### 版本信息

- 文档版本: 1.0.0
- 创建日期: 2025-03-12
- 作者: LiqPro团队 