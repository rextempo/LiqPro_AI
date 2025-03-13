#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")/.."

# 创建备份目录
BACKUP_DIR="backups/backup_$(date +%Y%m%d%H%M%S)"
mkdir -p $BACKUP_DIR

# 备份MongoDB数据
echo "备份MongoDB数据..."
docker-compose -f config/docker-compose.yml exec -T mongodb mongodump --out /data/db/backup
docker cp $(docker-compose -f config/docker-compose.yml ps -q mongodb):/data/db/backup $BACKUP_DIR/mongodb

# 备份配置文件
echo "备份配置文件..."
cp -r config $BACKUP_DIR/

echo "备份完成，备份文件位于: $BACKUP_DIR"
