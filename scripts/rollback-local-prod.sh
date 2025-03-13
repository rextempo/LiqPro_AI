#!/bin/bash
# rollback-local-prod.sh

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

if [ -z "$1" ]; then
  echo -e "${RED}请指定要回滚到的备份日期，格式：YYYYMMDD${NC}"
  echo -e "${YELLOW}示例: ./rollback-local-prod.sh 20250312${NC}"
  
  # 列出可用的备份
  echo -e "\n${GREEN}可用的备份:${NC}"
  ls -1 ./backups/ 2>/dev/null || echo "没有找到备份"
  
  exit 1
fi

BACKUP_DATE=$1
BACKUP_DIR="./backups/$BACKUP_DATE"

if [ ! -d "$BACKUP_DIR" ]; then
  echo -e "${RED}备份 $BACKUP_DIR 不存在${NC}"
  exit 1
fi

echo -e "${YELLOW}开始回滚到 $BACKUP_DATE 的备份...${NC}"

# 确认回滚
echo -e "${RED}警告: 回滚将覆盖当前数据。请确认是否继续? (y/n)${NC}"
read -r confirm
if [[ ! $confirm =~ ^[Yy]$ ]]; then
  echo -e "${YELLOW}回滚已取消${NC}"
  exit 0
fi

# 停止所有服务
echo -e "${GREEN}停止所有服务...${NC}"
docker-compose -f docker-compose-local-prod.yml down

# 备份当前数据（以防万一）
echo -e "${GREEN}备份当前数据...${NC}"
./backup-local-prod.sh

# 恢复MongoDB数据
echo -e "${GREEN}恢复MongoDB数据...${NC}"
rm -rf data/mongodb/*
mkdir -p data/mongodb
if [ -d "$BACKUP_DIR/mongodb" ]; then
  cp -r $BACKUP_DIR/mongodb/* data/mongodb/
else
  echo -e "${RED}MongoDB备份数据不存在${NC}"
fi

# 恢复RabbitMQ数据
echo -e "${GREEN}恢复RabbitMQ数据...${NC}"
if [ -f "$BACKUP_DIR/rabbitmq-data.tar.gz" ]; then
  rm -rf data/rabbitmq/*
  mkdir -p data/rabbitmq
  tar -xzf $BACKUP_DIR/rabbitmq-data.tar.gz -C ./
else
  echo -e "${RED}RabbitMQ备份数据不存在${NC}"
fi

# 恢复配置文件（可选）
if [ -d "$BACKUP_DIR/config" ]; then
  echo -e "${GREEN}是否要恢复配置文件? (y/n)${NC}"
  read -r restore_config
  if [[ $restore_config =~ ^[Yy]$ ]]; then
    echo -e "${GREEN}恢复配置文件...${NC}"
    cp $BACKUP_DIR/config/docker-compose-local-prod.yml ./
    if [ -d "$BACKUP_DIR/config/.env-files" ]; then
      cp -r $BACKUP_DIR/config/.env-files ./
    fi
  fi
fi

# 重新启动服务
echo -e "${GREEN}重新启动服务...${NC}"
./local-production-deploy.sh

echo -e "${YELLOW}回滚完成${NC}" 