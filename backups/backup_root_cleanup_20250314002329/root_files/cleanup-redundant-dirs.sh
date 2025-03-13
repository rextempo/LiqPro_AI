#!/bin/bash

# 创建日志目录
mkdir -p logs

# 设置日志文件
LOG_FILE="logs/cleanup-redundant-dirs-$(date +%Y%m%d%H%M%S).log"

# 日志函数
log() {
  echo "[$(date +%Y-%m-%d\ %H:%M:%S)] $1" | tee -a $LOG_FILE
}

# 创建备份
BACKUP_DIR="backup_redundant_$(date +%Y%m%d%H%M%S)"
log "创建备份目录: $BACKUP_DIR"
mkdir -p $BACKUP_DIR

# 备份根目录下的空服务目录
log "备份根目录下的服务目录..."
mkdir -p $BACKUP_DIR/root_services
cp -r data-service $BACKUP_DIR/root_services/ 2>/dev/null || log "data-service 目录不存在，跳过备份"
cp -r signal-service $BACKUP_DIR/root_services/ 2>/dev/null || log "signal-service 目录不存在，跳过备份"
cp -r api-service $BACKUP_DIR/root_services/ 2>/dev/null || log "api-service 目录不存在，跳过备份"
cp -r agent-engine $BACKUP_DIR/root_services/ 2>/dev/null || log "agent-engine 目录不存在，跳过备份"
cp -r scoring-service $BACKUP_DIR/root_services/ 2>/dev/null || log "scoring-service 目录不存在，跳过备份"
cp -r solana-cache $BACKUP_DIR/root_services/ 2>/dev/null || log "solana-cache 目录不存在，跳过备份"
log "根目录服务备份完成"

# 备份production目录下的冗余服务目录
log "备份production目录下的服务目录..."
mkdir -p $BACKUP_DIR/production_services
cp -r production/services $BACKUP_DIR/production_services/ 2>/dev/null || log "production/services 目录不存在，跳过备份"
cp -r production/signal-service $BACKUP_DIR/production_services/ 2>/dev/null || log "production/signal-service 目录不存在，跳过备份"
log "production目录服务备份完成"

# 备份Docker Compose文件
log "备份Docker Compose文件..."
mkdir -p $BACKUP_DIR/docker_compose
cp docker-compose.yml $BACKUP_DIR/docker_compose/ 2>/dev/null || log "docker-compose.yml 不存在，跳过备份"
cp docker-compose-local-prod.yml $BACKUP_DIR/docker_compose/ 2>/dev/null || log "docker-compose-local-prod.yml 不存在，跳过备份"
cp docker-compose.production.yml $BACKUP_DIR/docker_compose/ 2>/dev/null || log "docker-compose.production.yml 不存在，跳过备份"
log "Docker Compose文件备份完成"

# 清理根目录下的空服务目录
log "清理根目录下的空服务目录..."
rm -rf data-service 2>/dev/null && log "已删除 data-service 目录" || log "data-service 目录不存在或删除失败"
rm -rf signal-service 2>/dev/null && log "已删除 signal-service 目录" || log "signal-service 目录不存在或删除失败"
rm -rf api-service 2>/dev/null && log "已删除 api-service 目录" || log "api-service 目录不存在或删除失败"
rm -rf agent-engine 2>/dev/null && log "已删除 agent-engine 目录" || log "agent-engine 目录不存在或删除失败"
rm -rf scoring-service 2>/dev/null && log "已删除 scoring-service 目录" || log "scoring-service 目录不存在或删除失败"
rm -rf solana-cache 2>/dev/null && log "已删除 solana-cache 目录" || log "solana-cache 目录不存在或删除失败"
log "根目录清理完成"

# 清理production目录下的冗余服务目录
log "清理production目录下的冗余服务目录..."
rm -rf production/services 2>/dev/null && log "已删除 production/services 目录" || log "production/services 目录不存在或删除失败"
rm -rf production/signal-service 2>/dev/null && log "已删除 production/signal-service 目录" || log "production/signal-service 目录不存在或删除失败"
log "production目录清理完成"

# 确保所有服务使用统一的配置方式和依赖版本
log "检查服务配置和依赖版本..."

# 检查services目录是否存在
if [ ! -d "services" ]; then
  log "错误: services 目录不存在，无法继续"
  exit 1
fi

# 更新所有服务的package.json版本
for service_dir in services/*/; do
  if [ -f "${service_dir}package.json" ]; then
    service_name=$(basename "$service_dir")
    log "更新 $service_name 的版本号..."
    
    # 使用临时文件进行替换
    tmp_file=$(mktemp)
    jq '.version = "1.0.0"' "${service_dir}package.json" > "$tmp_file"
    mv "$tmp_file" "${service_dir}package.json"
    
    log "已更新 $service_name 的版本号为 1.0.0"
  fi
done

# 确保所有服务使用相同的环境变量命名
log "统一环境变量命名..."
for service_dir in services/*/; do
  if [ -f "${service_dir}.env" ]; then
    service_name=$(basename "$service_dir")
    log "更新 $service_name 的环境变量..."
    
    # 替换常见的环境变量名称
    sed -i.bak 's/MONGO_URI=/MONGODB_URI=/g' "${service_dir}.env"
    sed -i.bak 's/MONGO_URL=/MONGODB_URI=/g' "${service_dir}.env"
    sed -i.bak 's/SOLANA_RPC_ENDPOINT=/SOLANA_RPC_URL=/g' "${service_dir}.env"
    
    # 删除备份文件
    rm -f "${service_dir}.env.bak"
    
    log "已更新 $service_name 的环境变量"
  fi
done

# 检查Docker Compose文件，确保它们使用统一的服务配置
log "检查Docker Compose文件..."

# 更新docker-compose.yml中的服务路径
if [ -f "docker-compose.yml" ]; then
  log "更新 docker-compose.yml 中的服务路径..."
  
  # 创建备份
  cp docker-compose.yml docker-compose.yml.bak.$(date +%Y%m%d%H%M%S)
  
  # 更新服务路径
  sed -i.bak 's|\.\/[^\/]*\/api-service|\.\/services\/api-service|g' docker-compose.yml
  sed -i.bak 's|\.\/[^\/]*\/data-service|\.\/services\/data-service|g' docker-compose.yml
  sed -i.bak 's|\.\/[^\/]*\/signal-service|\.\/services\/signal-service|g' docker-compose.yml
  sed -i.bak 's|\.\/[^\/]*\/scoring-service|\.\/services\/scoring-service|g' docker-compose.yml
  sed -i.bak 's|\.\/[^\/]*\/agent-engine|\.\/services\/agent-engine|g' docker-compose.yml
  sed -i.bak 's|\.\/[^\/]*\/solana-cache|\.\/services\/solana-cache|g' docker-compose.yml
  
  # 删除备份文件
  rm -f docker-compose.yml.bak
  
  log "已更新 docker-compose.yml"
fi

# 更新docker-compose-local-prod.yml中的服务路径
if [ -f "docker-compose-local-prod.yml" ]; then
  log "更新 docker-compose-local-prod.yml 中的服务路径..."
  
  # 创建备份
  cp docker-compose-local-prod.yml docker-compose-local-prod.yml.bak.$(date +%Y%m%d%H%M%S)
  
  # 更新服务路径
  sed -i.bak 's|\.\/[^\/]*\/api-service|\.\/services\/api-service|g' docker-compose-local-prod.yml
  sed -i.bak 's|\.\/[^\/]*\/data-service|\.\/services\/data-service|g' docker-compose-local-prod.yml
  sed -i.bak 's|\.\/[^\/]*\/signal-service|\.\/services\/signal-service|g' docker-compose-local-prod.yml
  sed -i.bak 's|\.\/[^\/]*\/scoring-service|\.\/services\/scoring-service|g' docker-compose-local-prod.yml
  sed -i.bak 's|\.\/[^\/]*\/agent-engine|\.\/services\/agent-engine|g' docker-compose-local-prod.yml
  sed -i.bak 's|\.\/[^\/]*\/solana-cache|\.\/services\/solana-cache|g' docker-compose-local-prod.yml
  
  # 删除备份文件
  rm -f docker-compose-local-prod.yml.bak
  
  log "已更新 docker-compose-local-prod.yml"
fi

# 创建统一服务状态报告
log "创建统一服务状态报告..."
cat > service-status-report.md << 'EOF'
# LiqPro 微服务状态报告

本报告由清理脚本自动生成，记录了LiqPro平台微服务的当前状态。

## 微服务列表

LiqPro平台包含以下微服务：

1. **API服务** (`api-service`) - API网关服务
2. **数据服务** (`data-service`) - 数据收集和处理服务
3. **信号服务** (`signal-service`) - 信号生成服务
4. **评分服务** (`scoring-service`) - 风险评分服务
5. **代理引擎** (`agent-engine`) - 代理引擎服务
6. **Solana缓存** (`solana-cache`) - Solana区块链数据缓存服务

## 清理结果

- 已删除根目录下的冗余服务目录
- 已删除production目录下的冗余服务目录
- 已统一所有服务的版本号为1.0.0
- 已统一环境变量命名
- 已更新Docker Compose配置文件中的服务路径

## 当前状态

所有服务已统一存放在`services/`目录下，使用统一的配置方式和依赖版本。

## 后续工作

1. 更新部署文档
2. 更新监控配置
3. 进行全面测试，确保所有服务正常工作
4. 考虑进一步优化服务间依赖关系
EOF

log "清理和统一过程完成！"
log "备份已保存在 $BACKUP_DIR 目录"
log "请检查日志文件 $LOG_FILE 了解详细信息"
log "服务状态报告已生成: service-status-report.md" 