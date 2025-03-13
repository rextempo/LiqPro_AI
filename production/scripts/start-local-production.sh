#!/bin/bash

# LiqPro 本地生产环境启动脚本

set -e
echo "启动 LiqPro 本地生产环境..."

# 检查 Docker 是否运行
if ! docker info > /dev/null 2>&1; then
  echo "错误: Docker 未运行，请先启动 Docker"
  exit 1
fi

# 创建必要的目录
mkdir -p ./data/mongodb
mkdir -p ./data/redis
mkdir -p ./data/rabbitmq
mkdir -p ./logs
mkdir -p ./temp

# 启动服务
echo "启动 Docker 容器..."
docker-compose -f docker-compose-local-prod.yml up -d

# 等待服务启动
echo "等待服务启动..."
sleep 10

# 检查服务状态
echo "检查服务状态..."
docker-compose -f docker-compose-local-prod.yml ps

echo "LiqPro 本地生产环境已启动"
echo "访问前端: http://localhost:3000"
echo "访问 API: http://localhost:3001/api"
echo "查看日志: docker-compose -f docker-compose-local-prod.yml logs -f"
