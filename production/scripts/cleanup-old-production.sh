#!/bin/bash

# LiqPro 旧生产环境清理脚本
# 此脚本用于清理旧的生产环境目录，完成生产环境统一

set -e
echo "开始清理旧的生产环境目录..."

# 检查旧目录是否存在
OLD_PROD_DIR="/Users/rex/Documents/LiqPro/~/LiqPro/production"
if [ ! -d "$OLD_PROD_DIR" ]; then
  echo "旧生产环境目录不存在，无需清理"
  exit 0
fi

# 确认是否已经备份
BACKUP_DIR="/Users/rex/Documents/LiqPro/production/backup_old_production"
if [ ! -d "$BACKUP_DIR" ]; then
  echo "错误: 备份目录不存在，请先备份旧生产环境目录"
  exit 1
fi

# 确认是否已经迁移所有重要文件
echo "请确认已经迁移了所有重要文件:"
echo "1. docker-compose-local-prod.yml"
echo "2. local-production-deploy.sh"
echo "3. backup-local-prod.sh"
echo "4. monitor-local-prod.sh"
echo "5. libs/common 目录"

read -p "是否已经迁移所有重要文件? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
  echo "操作已取消"
  exit 1
fi

# 移除旧目录
echo "移除旧生产环境目录..."
rm -rf "$OLD_PROD_DIR"

echo "清理完成！"
echo "旧生产环境目录已移除，现在只有一个统一的生产环境目录: /Users/rex/Documents/LiqPro/production" 