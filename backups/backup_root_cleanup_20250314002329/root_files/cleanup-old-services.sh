#!/bin/bash

# 设置日志文件
LOG_FILE="logs/cleanup-old-services-$(date +%Y%m%d%H%M%S).log"
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

log "开始清理旧版本服务..."

# 检查统一版本是否存在
if [ ! -d "unified_services" ]; then
  log "错误: unified_services 目录不存在，请先运行 unify-services.sh"
  exit 1
fi

# 检查统一版本是否完整
REQUIRED_SERVICES=("signal-service" "data-service" "api-service" "scoring-service" "agent-engine")
MISSING_SERVICES=0

for service in "${REQUIRED_SERVICES[@]}"; do
  if [ ! -d "unified_services/$service" ]; then
    log "错误: unified_services/$service 目录不存在，统一版本不完整"
    MISSING_SERVICES=1
  fi
done

if [ $MISSING_SERVICES -eq 1 ]; then
  log "统一版本不完整，请先修复问题再继续"
  exit 1
fi

# 确认删除旧版本
if confirm "确认删除旧版本服务？这将删除 services、signal-service、signal-service-fixed 和 production/services 目录"; then
  # 删除旧版本
  log "删除旧版本服务..."
  
  if [ -d "services" ]; then
    log "删除 services 目录..."
    rm -rf services
  fi
  
  if [ -d "signal-service" ]; then
    log "删除 signal-service 目录..."
    rm -rf signal-service
  fi
  
  if [ -d "signal-service-fixed" ]; then
    log "删除 signal-service-fixed 目录..."
    rm -rf signal-service-fixed
  fi
  
  if [ -d "production/services" ]; then
    log "删除 production/services 目录..."
    rm -rf production/services
  fi
  
  log "旧版本服务已删除"
  
  # 移动统一版本
  if confirm "是否将统一版本移动到 services 目录？"; then
    log "移动统一版本到 services 目录..."
    mv unified_services services
    log "统一版本已移动到 services 目录"
    
    # 更新 docker-compose.yml
    if [ -f "docker-compose.yml" ]; then
      if confirm "是否用新的 docker-compose.yml 替换当前的 docker-compose.yml？"; then
        log "备份当前的 docker-compose.yml..."
        cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d%H%M%S)
        log "替换 docker-compose.yml..."
        cp services/docker-compose.yml ./
        log "docker-compose.yml 已更新"
      fi
    else
      log "复制 docker-compose.yml 到根目录..."
      cp services/docker-compose.yml ./
      log "docker-compose.yml 已复制到根目录"
    fi
  else
    log "统一版本保留在 unified_services 目录"
  fi
else
  log "操作已取消，未删除任何文件"
fi

log "清理操作完成"
exit 0 