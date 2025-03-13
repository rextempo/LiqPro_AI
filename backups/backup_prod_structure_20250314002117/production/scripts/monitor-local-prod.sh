#!/bin/bash

# LiqPro 本地生产环境监控脚本

set -e
echo "监控 LiqPro 本地生产环境..."

# 检查容器状态
echo "容器状态:"
docker-compose -f docker-compose-local-prod.yml ps

# 检查资源使用情况
echo -e "\n资源使用情况:"
docker stats --no-stream $(docker-compose -f docker-compose-local-prod.yml ps -q)

# 检查日志
echo -e "\n最近日志:"
docker-compose -f docker-compose-local-prod.yml logs --tail=20
