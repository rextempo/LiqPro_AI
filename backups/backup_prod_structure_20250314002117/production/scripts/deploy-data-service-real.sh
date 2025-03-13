#!/bin/bash

# 颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}开始部署 data-service-real...${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 检查MongoDB是否运行
echo -e "${YELLOW}检查MongoDB状态...${NC}"
if ! nc -z localhost 27017; then
  echo -e "${RED}错误: MongoDB未运行，请先启动MongoDB${NC}"
  exit 1
fi
echo -e "${GREEN}MongoDB正在运行${NC}"

# 检查RabbitMQ是否运行
echo -e "${YELLOW}检查RabbitMQ状态...${NC}"
if ! nc -z localhost 5672; then
  echo -e "${RED}错误: RabbitMQ未运行，请先启动RabbitMQ${NC}"
  exit 1
fi
echo -e "${GREEN}RabbitMQ正在运行${NC}"

# 构建Docker镜像
echo -e "${YELLOW}构建data-service-real Docker镜像...${NC}"
docker build -t liqpro/data-service-real -f Dockerfile.data-service-real .

# 检查构建是否成功
if [ $? -ne 0 ]; then
  echo -e "${RED}错误: Docker镜像构建失败${NC}"
  exit 1
fi
echo -e "${GREEN}Docker镜像构建成功${NC}"

# 停止并移除旧容器
echo -e "${YELLOW}停止并移除旧的data-service-real容器...${NC}"
docker stop data-service-real 2>/dev/null || true
docker rm data-service-real 2>/dev/null || true

# 创建日志目录
mkdir -p logs

# 启动新容器
echo -e "${YELLOW}启动新的data-service-real容器...${NC}"
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

# 检查容器是否成功启动
if [ $? -ne 0 ]; then
  echo -e "${RED}错误: 容器启动失败${NC}"
  exit 1
fi

echo -e "${GREEN}data-service-real 部署成功!${NC}"
echo -e "${BLUE}可以通过以下方式访问服务:${NC}"
echo -e "  - 健康检查: http://localhost:3004/health"
echo -e "  - API端点: http://localhost:3004/api/v1/meteora/pools"
echo -e "  - 快照API: http://localhost:3004/api/v1/meteora/snapshots"
echo -e "${YELLOW}查看日志: docker logs -f data-service-real${NC}"

exit 0 