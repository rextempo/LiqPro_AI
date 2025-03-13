#!/bin/bash
# backup-local-prod.sh

# 设置颜色输出
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

BACKUP_DIR="./backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR

echo -e "${YELLOW}开始备份LiqPro本地生产环境数据...${NC}"

# 备份MongoDB数据
echo -e "${GREEN}备份MongoDB数据...${NC}"
docker-compose -f docker-compose-local-prod.yml exec mongodb mongodump --out /data/db/backup
docker cp $(docker-compose -f docker-compose-local-prod.yml ps -q mongodb):/data/db/backup $BACKUP_DIR/mongodb

# 备份RabbitMQ数据
echo -e "${GREEN}备份RabbitMQ数据...${NC}"
tar -czf $BACKUP_DIR/rabbitmq-data.tar.gz data/rabbitmq

echo -e "${YELLOW}备份完成，存储在 $BACKUP_DIR${NC}" 