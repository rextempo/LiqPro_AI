#!/bin/bash

# 生产环境启动脚本
echo "正在启动 LiqPro 生产环境..."
cd "$(dirname "$0")"
docker-compose -f production/docker-compose-local-prod.yml up -d

echo "服务已启动，可通过以下地址访问："
echo "前端: http://localhost:3000"
echo "API服务: http://localhost:3001"
echo "数据服务: http://localhost:3002"
echo "信号服务: http://localhost:3003"
echo "RabbitMQ管理界面: http://localhost:15672" 