#!/bin/bash

# 确保脚本在错误时退出
set -e

echo "开始在Docker容器中启动signal-service..."

# 在容器中启动signal-service
docker exec production-signal-service-1 bash -c "cd /app/signal-service && npm run build && node dist/server.js"

echo "signal-service已启动！" 