#!/bin/bash

# 确保脚本在错误时退出
set -e

echo "开始将signal-service复制到Docker容器..."

# 创建一个临时tar文件
tar -czf signal-service.tar.gz signal-service/

# 复制tar文件到容器
docker cp signal-service.tar.gz production-signal-service-1:/app/

# 在容器中解压文件
docker exec production-signal-service-1 bash -c "cd /app && tar -xzf signal-service.tar.gz && rm signal-service.tar.gz"

# 在容器中安装依赖并构建
docker exec production-signal-service-1 bash -c "cd /app/signal-service && npm install && npm run build"

# 删除本地临时tar文件
rm signal-service.tar.gz

echo "复制完成！signal-service已成功复制到Docker容器并构建。" 