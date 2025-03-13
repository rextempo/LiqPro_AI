#!/bin/bash

# 确保脚本在错误时退出
set -e

echo "开始在Docker容器中安装TypeScript类型定义..."

# 在容器中安装类型定义
docker exec production-signal-service-1 bash -c "cd /app/signal-service && npm install --save-dev @types/uuid @types/amqplib @types/express && npm run build"

echo "类型定义安装完成！" 