#!/bin/bash

# 创建日志目录
mkdir -p logs

# 设置日志文件
LOG_FILE="logs/final-cleanup-$(date +%Y%m%d%H%M%S).log"

# 日志函数
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a $LOG_FILE
}

# 创建备份
BACKUP_DIR="backup_final_cleanup_$(date +%Y%m%d%H%M%S)"
log "创建备份目录: $BACKUP_DIR"
mkdir -p $BACKUP_DIR

# 备份根目录下的所有文件（排除目录和隐藏文件）
log "备份根目录下的文件..."
mkdir -p $BACKUP_DIR/root_files
find . -maxdepth 1 -type f -not -path "*/\.*" -exec cp {} $BACKUP_DIR/root_files/ \;
log "根目录文件备份完成"

# 定义要保留的文件
KEEP_FILES=(
  ".gitignore"
  ".npmrc"
  "README.md"
  "package.json"
  "package-lock.json"
  "docker-compose.yml"
)

# 删除不必要的脚本和文件
log "删除不必要的脚本和文件..."

# 获取所有根目录下的非隐藏文件
FILES=$(find . -maxdepth 1 -type f -not -path "*/\.*")

for file in $FILES; do
  filename=$(basename "$file")
  should_delete=true
  
  # 检查是否在保留列表中
  for keep in "${KEEP_FILES[@]}"; do
    if [ "$filename" == "$keep" ]; then
      should_delete=false
      break
    fi
  done
  
  # 如果不在保留列表中，则删除
  if [ "$should_delete" = true ]; then
    rm -f "$file"
    log "已删除 $filename"
  else
    log "保留 $filename"
  fi
done

# 移动清理脚本到scripts目录
log "整理脚本文件..."
mkdir -p scripts/maintenance

# 检查是否存在清理脚本，并移动到scripts/maintenance目录
for script in cleanup-*.sh optimize-*.sh; do
  if [ -f "$script" ]; then
    cp "$script" scripts/maintenance/
    log "已复制 $script 到 scripts/maintenance/"
    rm -f "$script"
    log "已从根目录删除 $script"
  fi
done

# 移动当前脚本到scripts/maintenance目录
cp "$0" scripts/maintenance/
log "已复制 $(basename $0) 到 scripts/maintenance/"

# 移动备份目录到backups
log "整理备份目录..."
mkdir -p backups
mv $BACKUP_DIR backups/
log "已移动 $BACKUP_DIR 到 backups/"

# 更新package.json中的脚本部分
log "更新package.json中的脚本..."
if [ -f "package.json" ]; then
  # 使用临时文件进行修改
  TMP_FILE=$(mktemp)
  jq '.scripts += {
    "start": "cd production && ./scripts/start.sh",
    "stop": "cd production && ./scripts/stop.sh",
    "monitor": "cd production && ./scripts/monitor.sh",
    "backup": "cd production && ./scripts/backup.sh",
    "cleanup": "scripts/maintenance/final-cleanup.sh"
  }' package.json > "$TMP_FILE" && mv "$TMP_FILE" package.json
  log "已更新package.json中的脚本部分"
fi

log "最终清理完成！"
log "备份已保存在 backups/$BACKUP_DIR 目录"
log "请检查日志文件 $LOG_FILE 了解详细信息"

echo "脚本执行完成后，此脚本将自动从根目录删除。请使用 'npm run cleanup' 执行后续清理操作。" 