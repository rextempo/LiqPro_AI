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
