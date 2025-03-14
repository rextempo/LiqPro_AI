#!/bin/bash

# LiqPro 选择性启动脚本
MODE=${1:-dev}

cd "$(dirname "$0")"

if [ "$MODE" == "prod" ]; then
  echo "以生产模式启动选定的 LiqPro 服务..."
  echo "加载生产环境配置..."
  export $(grep -v '^#' .env.prod | xargs)
  CONTAINER_SUFFIX="-prod"
else
  echo "以开发模式启动选定的 LiqPro 服务 (使用真实数据)..."
  echo "加载开发环境配置..."
  export $(grep -v '^#' .env.dev | xargs)
  CONTAINER_SUFFIX=""
fi

# 显示配置信息
echo "环境: $NODE_ENV"
echo "热更新: $HOT_RELOAD"
echo "使用真实数据: $USE_REAL_DATA"
echo "数据服务脚本: $DATA_SERVICE_SCRIPT"

# 启动服务
docker-compose -f docker-compose.yml --profile data --profile api --profile signal up -d

echo
echo "服务已启动，可通过以下地址访问："
echo "API服务: http://localhost:3001"
echo "数据服务: http://localhost:3002"
echo "信号服务: http://localhost:3003"
echo "RabbitMQ管理界面: http://localhost:15672 (用户名: $RABBITMQ_USER, 密码: $RABBITMQ_PASS)"
echo
echo "查看日志: docker-compose -f docker-compose.yml logs -f [服务名]"
echo "例如: docker-compose -f docker-compose.yml logs -f data-service"
echo "停止服务: ./stop.sh" 