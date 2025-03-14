#!/bin/bash

# 本地环境启动脚本
echo "正在启动 LiqPro 本地环境..."
cd "$(dirname "$0")"
docker-compose -f local/docker-compose.yml up -d

echo "服务已启动，可通过以下地址访问："
echo "前端: http://localhost:3000"
echo "API服务: http://localhost:3001"
echo "数据服务: http://localhost:3002"
echo "信号服务: http://localhost:3003"
echo "评分服务: http://localhost:3004"
echo "Agent引擎: http://localhost:3005"
echo "Solana缓存: http://localhost:3006"
echo "RabbitMQ管理界面: http://localhost:15672" 