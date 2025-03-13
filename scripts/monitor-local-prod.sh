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
curl -s http://localhost:3001/health | jq || echo "API健康检查失败"

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