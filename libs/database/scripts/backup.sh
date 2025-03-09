#!/bin/bash

# 加载环境变量
source ../.env

# 设置备份目录
BACKUP_DIR="/var/lib/postgresql/backups"
REMOTE_BACKUP_DIR="s3://liqpro-backups/postgres"
DATE=$(date +%Y%m%d_%H%M%S)

# 确保备份目录存在
mkdir -p $BACKUP_DIR

# 执行全量备份
pg_dump -h $POSTGRES_HOST -U $POSTGRES_USER -d $POSTGRES_DB -F c -f "$BACKUP_DIR/full_backup_$DATE.dump"

# 压缩备份文件
gzip "$BACKUP_DIR/full_backup_$DATE.dump"

# 上传到S3
aws s3 cp "$BACKUP_DIR/full_backup_$DATE.dump.gz" "$REMOTE_BACKUP_DIR/"

# 删除30天前的本地备份
find $BACKUP_DIR -name "full_backup_*.dump.gz" -mtime +30 -delete

# 配置WAL归档
cat << EOF > /etc/postgresql/postgresql.conf.d/wal.conf
wal_level = replica
archive_mode = on
archive_command = 'test ! -f $BACKUP_DIR/wal/%f && cp %p $BACKUP_DIR/wal/%f'
archive_timeout = 60
EOF

# 创建WAL归档目录
mkdir -p $BACKUP_DIR/wal

# 设置权限
chown -R postgres:postgres $BACKUP_DIR

# 记录备份日志
echo "Backup completed at $(date)" >> "$BACKUP_DIR/backup.log" 