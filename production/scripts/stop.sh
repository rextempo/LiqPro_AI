#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")/.."

# 停止服务
echo "停止 LiqPro 生产环境服务..."
docker-compose -f config/docker-compose.yml down

echo "服务已停止"
