#!/bin/bash

# LiqPro 停止脚本
cd "$(dirname "$0")"
echo "正在停止 LiqPro 服务..."
docker-compose -f docker-compose.yml down

echo "所有服务已停止" 