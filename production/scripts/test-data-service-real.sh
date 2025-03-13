#!/bin/bash

# 颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

# 服务地址
SERVICE_HOST="localhost"
SERVICE_PORT="3004"
BASE_URL="http://${SERVICE_HOST}:${SERVICE_PORT}"

echo -e "${BLUE}开始测试 data-service-real...${NC}"

# 测试健康检查端点
echo -e "${YELLOW}测试健康检查端点...${NC}"
HEALTH_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health")

if [ "$HEALTH_RESPONSE" == "200" ]; then
  echo -e "${GREEN}健康检查端点测试通过 (HTTP 200)${NC}"
else
  echo -e "${RED}健康检查端点测试失败 (HTTP ${HEALTH_RESPONSE})${NC}"
fi

# 测试获取所有池端点
echo -e "${YELLOW}测试获取所有池端点...${NC}"
POOLS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/meteora/pools")

if [ "$POOLS_RESPONSE" == "200" ]; then
  echo -e "${GREEN}获取所有池端点测试通过 (HTTP 200)${NC}"
else
  echo -e "${RED}获取所有池端点测试失败 (HTTP ${POOLS_RESPONSE})${NC}"
fi

# 获取一个池地址用于后续测试
echo -e "${YELLOW}获取一个池地址用于后续测试...${NC}"
POOL_ADDRESS=$(curl -s "${BASE_URL}/api/v1/meteora/pools" | grep -o '"address":"[^"]*"' | head -1 | cut -d'"' -f4)

if [ -n "$POOL_ADDRESS" ]; then
  echo -e "${GREEN}成功获取池地址: ${POOL_ADDRESS}${NC}"
  
  # 测试获取特定池信息端点
  echo -e "${YELLOW}测试获取特定池信息端点...${NC}"
  POOL_INFO_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/meteora/pools/${POOL_ADDRESS}")
  
  if [ "$POOL_INFO_RESPONSE" == "200" ]; then
    echo -e "${GREEN}获取特定池信息端点测试通过 (HTTP 200)${NC}"
  else
    echo -e "${RED}获取特定池信息端点测试失败 (HTTP ${POOL_INFO_RESPONSE})${NC}"
  fi
else
  echo -e "${RED}无法获取池地址，跳过特定池信息测试${NC}"
fi

# 测试快照端点
echo -e "${YELLOW}测试快照端点...${NC}"
SNAPSHOTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/meteora/snapshots/hourly")

if [ "$SNAPSHOTS_RESPONSE" == "200" ]; then
  echo -e "${GREEN}获取小时级快照端点测试通过 (HTTP 200)${NC}"
else
  echo -e "${RED}获取小时级快照端点测试失败 (HTTP ${SNAPSHOTS_RESPONSE})${NC}"
fi

# 测试日级快照端点
DAILY_SNAPSHOTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/meteora/snapshots/daily")

if [ "$DAILY_SNAPSHOTS_RESPONSE" == "200" ]; then
  echo -e "${GREEN}获取日级快照端点测试通过 (HTTP 200)${NC}"
else
  echo -e "${RED}获取日级快照端点测试失败 (HTTP ${DAILY_SNAPSHOTS_RESPONSE})${NC}"
fi

# 测试周级快照端点
WEEKLY_SNAPSHOTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/meteora/snapshots/weekly")

if [ "$WEEKLY_SNAPSHOTS_RESPONSE" == "200" ]; then
  echo -e "${GREEN}获取周级快照端点测试通过 (HTTP 200)${NC}"
else
  echo -e "${RED}获取周级快照端点测试失败 (HTTP ${WEEKLY_SNAPSHOTS_RESPONSE})${NC}"
fi

# 如果有池地址，测试特定池的快照
if [ -n "$POOL_ADDRESS" ]; then
  echo -e "${YELLOW}测试特定池的快照端点...${NC}"
  POOL_SNAPSHOTS_RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/v1/meteora/snapshots/${POOL_ADDRESS}/hourly")
  
  if [ "$POOL_SNAPSHOTS_RESPONSE" == "200" ]; then
    echo -e "${GREEN}获取特定池小时级快照端点测试通过 (HTTP 200)${NC}"
  else
    echo -e "${RED}获取特定池小时级快照端点测试失败 (HTTP ${POOL_SNAPSHOTS_RESPONSE})${NC}"
  fi
fi

# 总结测试结果
echo -e "${BLUE}测试完成!${NC}"
echo -e "${YELLOW}注意: 如果某些测试失败，可能是因为服务刚启动，数据尚未收集完成。${NC}"
echo -e "${YELLOW}建议等待几分钟后再次运行测试脚本。${NC}"

exit 0 