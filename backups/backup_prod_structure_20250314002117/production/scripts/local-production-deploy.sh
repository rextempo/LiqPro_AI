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
mkdir -p data/mongodb data/rabbitmq data/redis

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
curl -s http://localhost:3001/health | jq || echo "API健康检查失败，可能需要更长时间启动"

echo -e "${YELLOW}LiqPro本地生产环境已部署完成${NC}"
echo -e "${GREEN}前端访问地址: http://localhost:3000${NC}"
echo -e "${GREEN}API访问地址: http://localhost:3001${NC}"
echo -e "${GREEN}RabbitMQ管理界面: http://localhost:15672 (用户名: liqpro, 密码: liqpro_password)${NC}" 