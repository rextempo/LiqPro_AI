#!/bin/bash

# LiqPro 本地生产环境数据备份脚本

set -e
BACKUP_DIR="./mongodb_backup_$(date +%Y%m%d_%H%M%S)"
echo "创建 MongoDB 备份: $BACKUP_DIR"
mkdir -p "$BACKUP_DIR"

# 备份 MongoDB 数据
echo "备份 MongoDB 数据..."
docker exec -it production-mongodb-1 mongodump --out=/data/backup

# 复制备份到主机
echo "复制备份到主机..."
docker cp production-mongodb-1:/data/backup "$BACKUP_DIR"

echo "备份完成: $BACKUP_DIR"
