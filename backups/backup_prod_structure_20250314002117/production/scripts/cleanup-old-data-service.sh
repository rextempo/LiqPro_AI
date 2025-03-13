#!/bin/bash

# 颜色代码
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # 无颜色

echo -e "${BLUE}开始清理旧的data-service...${NC}"

# 切换到项目根目录
cd "$(dirname "$0")/.."

# 停止并移除旧容器
echo -e "${YELLOW}停止并移除旧的data-service容器...${NC}"
docker stop data-service 2>/dev/null || true
docker rm data-service 2>/dev/null || true

# 移除旧的Docker镜像
echo -e "${YELLOW}移除旧的data-service Docker镜像...${NC}"
docker rmi liqpro/data-service 2>/dev/null || true

# 确认services/data-service目录存在
if [ -d "services/data-service" ]; then
  echo -e "${YELLOW}备份旧的data-service代码...${NC}"
  
  # 创建备份目录
  BACKUP_DIR="backups/data-service-$(date +%Y%m%d%H%M%S)"
  mkdir -p "$BACKUP_DIR"
  
  # 复制旧代码到备份目录
  cp -r services/data-service/* "$BACKUP_DIR/"
  
  echo -e "${GREEN}旧代码已备份到 $BACKUP_DIR${NC}"
  
  # 删除旧代码
  echo -e "${YELLOW}删除旧的data-service代码...${NC}"
  rm -rf services/data-service
  
  echo -e "${GREEN}旧代码已删除${NC}"
else
  echo -e "${YELLOW}services/data-service目录不存在，无需清理${NC}"
fi

# 删除旧的Dockerfile
if [ -f "Dockerfile.data-service" ]; then
  echo -e "${YELLOW}删除旧的Dockerfile.data-service...${NC}"
  rm Dockerfile.data-service
  echo -e "${GREEN}旧的Dockerfile已删除${NC}"
else
  echo -e "${YELLOW}Dockerfile.data-service不存在，无需删除${NC}"
fi

echo -e "${GREEN}清理完成!${NC}"
echo -e "${BLUE}所有旧的data-service资源已被清理和备份${NC}"

exit 0 