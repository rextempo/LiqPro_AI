#!/bin/bash

# 设置日志文件
LOG_FILE="logs/run-unification-$(date +%Y%m%d%H%M%S).log"
mkdir -p logs

# 日志函数
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a $LOG_FILE
}

# 确认函数
confirm() {
  read -p "$1 (y/n): " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    return 0
  else
    return 1
  fi
}

log "开始执行版本统一过程..."

# 检查脚本是否存在
if [ ! -f "unify-services.sh" ]; then
  log "错误: unify-services.sh 脚本不存在"
  exit 1
fi

if [ ! -f "cleanup-old-services.sh" ]; then
  log "错误: cleanup-old-services.sh 脚本不存在"
  exit 1
fi

# 确保脚本可执行
chmod +x unify-services.sh
chmod +x cleanup-old-services.sh

# 执行统一脚本
log "执行 unify-services.sh..."
./unify-services.sh

# 检查统一脚本是否成功
if [ $? -ne 0 ]; then
  log "错误: unify-services.sh 执行失败"
  exit 1
fi

log "unify-services.sh 执行成功"

# 确认是否继续清理
if confirm "是否继续执行清理脚本？这将删除旧版本的服务"; then
  log "执行 cleanup-old-services.sh..."
  ./cleanup-old-services.sh
  
  # 检查清理脚本是否成功
  if [ $? -ne 0 ]; then
    log "错误: cleanup-old-services.sh 执行失败"
    exit 1
  fi
  
  log "cleanup-old-services.sh 执行成功"
else
  log "跳过清理步骤"
fi

# 检查是否已经移动到 services 目录
if [ -d "services" ] && [ ! -d "unified_services" ]; then
  log "版本统一已完成，新版本已移动到 services 目录"
  
  # 确认是否启动服务
  if confirm "是否立即启动统一后的服务？"; then
    log "启动服务..."
    docker-compose down
    docker-compose up -d
    log "服务已启动"
  fi
elif [ -d "unified_services" ]; then
  log "版本统一已完成，但新版本仍在 unified_services 目录"
  
  if confirm "是否将统一版本移动到 services 目录并启动服务？"; then
    # 如果 services 目录存在，先删除
    if [ -d "services" ]; then
      log "删除现有的 services 目录..."
      rm -rf services
    fi
    
    log "移动统一版本到 services 目录..."
    mv unified_services services
    
    # 更新 docker-compose.yml
    if [ -f "docker-compose.yml" ]; then
      log "备份当前的 docker-compose.yml..."
      cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d%H%M%S)
    fi
    
    log "复制新的 docker-compose.yml..."
    cp services/docker-compose.yml ./
    
    log "启动服务..."
    docker-compose down
    docker-compose up -d
    log "服务已启动"
  fi
else
  log "错误: 无法确定版本统一的状态"
  exit 1
fi

log "版本统一过程完成"
exit 0 