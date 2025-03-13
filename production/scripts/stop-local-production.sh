#!/bin/bash

# LiqPro 本地生产环境停止脚本

set -e
echo "停止 LiqPro 本地生产环境..."

# 停止服务
docker-compose -f docker-compose-local-prod.yml down

echo "LiqPro 本地生产环境已停止"
