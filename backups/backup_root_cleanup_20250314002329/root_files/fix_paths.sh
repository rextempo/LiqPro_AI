#!/bin/bash

# 停止所有容器
cd production
docker-compose -f docker-compose-local-prod.yml down

# 备份当前的common库
mv libs/common libs/common.bak

# 复制修复后的common库
cp -r ../temp_fix/libs/common libs/

# 重新启动所有容器
docker-compose -f docker-compose-local-prod.yml up -d
