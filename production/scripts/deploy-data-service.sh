#!/bin/bash

# 数据服务部署脚本

# 设置颜色
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}开始部署数据服务...${NC}"

# 进入项目根目录
cd "$(dirname "$0")/.."

# 检查MongoDB是否运行
echo -e "${YELLOW}检查MongoDB状态...${NC}"
if ! docker ps | grep -q mongodb; then
  echo -e "${RED}MongoDB未运行，请先启动MongoDB${NC}"
  exit 1
fi
echo -e "${GREEN}MongoDB正在运行${NC}"

# 构建数据服务镜像
echo -e "${YELLOW}构建数据服务Docker镜像...${NC}"
docker build -t liqpro/data-service -f Dockerfile.data-service .

# 检查构建是否成功
if [ $? -ne 0 ]; then
  echo -e "${RED}构建失败，请检查错误信息${NC}"
  exit 1
fi
echo -e "${GREEN}构建成功${NC}"

# 停止并移除旧容器
echo -e "${YELLOW}停止并移除旧容器...${NC}"
docker stop data-service 2>/dev/null || true
docker rm data-service 2>/dev/null || true

# 启动新容器
echo -e "${YELLOW}启动新容器...${NC}"
docker run -d \
  --name data-service \
  --network production_liqpro-network \
  -p 3000:3000 \
  -e PORT=3000 \
  -e DATA_COLLECTION_INTERVAL=300000 \
  -e MONGO_URI=mongodb://mongodb:27017/liqpro \
  -e SOLANA_RPC_ENDPOINT=https://api.mainnet-beta.solana.com \
  -e LOG_LEVEL=info \
  -e HOURLY_SNAPSHOTS_TO_KEEP=168 \
  -e DAILY_SNAPSHOTS_TO_KEEP=90 \
  -e WEEKLY_SNAPSHOTS_TO_KEEP=52 \
  -v $(pwd)/logs:/app/logs \
  --restart unless-stopped \
  liqpro/data-service

# 检查容器是否成功启动
if [ $? -ne 0 ]; then
  echo -e "${RED}容器启动失败，请检查错误信息${NC}"
  exit 1
fi

echo -e "${GREEN}数据服务部署完成！${NC}"
echo -e "${YELLOW}可以通过以下命令查看日志：${NC}"
echo -e "docker logs -f data-service"
echo -e "${YELLOW}API端点：${NC}"
echo -e "http://localhost:3000/api/v1/meteora/pools"
echo -e "http://localhost:3000/api/v1/meteora/snapshots/BGm1tav58oGcsQJehL9WXBFXF7D27vZsKefj4xJKD5Y/changes"

exit 0 