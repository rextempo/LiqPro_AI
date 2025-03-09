#!/bin/bash

# 加载环境变量
source ../.env

# 设置备份目录
BACKUP_DIR="/var/lib/postgresql/backups"
REMOTE_BACKUP_DIR="s3://liqpro-backups/postgres"

# 如果指定了备份文件，使用指定的文件，否则使用最新的备份
if [ -z "$1" ]; then
    # 获取最新的备份文件
    BACKUP_FILE=$(aws s3 ls $REMOTE_BACKUP_DIR/ | sort | tail -n 1 | awk '{print $4}')
else
    BACKUP_FILE=$1
fi

# 下载备份文件
aws s3 cp "$REMOTE_BACKUP_DIR/$BACKUP_FILE" "$BACKUP_DIR/"

# 解压备份文件
gunzip "$BACKUP_DIR/$BACKUP_FILE"
UNZIPPED_FILE=${BACKUP_FILE%.gz}

# 停止应用服务
echo "Stopping application services..."
docker-compose -f ../../deploy/docker/docker-compose.dev.yml down

# 删除现有数据库
echo "Dropping existing database..."
dropdb -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB

# 创建新数据库
echo "Creating new database..."
createdb -h $POSTGRES_HOST -U $POSTGRES_USER $POSTGRES_DB

# 恢复数据
echo "Restoring database from backup..."
pg_restore -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB "$BACKUP_DIR/$UNZIPPED_FILE"

# 应用WAL归档（如果需要）
if [ -d "$BACKUP_DIR/wal" ]; then
    echo "Applying WAL archives..."
    pg_ctl start -D $PGDATA -o "-c restore_command='cp $BACKUP_DIR/wal/%f %p'"
fi

# 清理临时文件
rm "$BACKUP_DIR/$UNZIPPED_FILE"

# 启动应用服务
echo "Starting application services..."
docker-compose -f ../../deploy/docker/docker-compose.dev.yml up -d

echo "Restore completed at $(date)" >> "$BACKUP_DIR/restore.log" 