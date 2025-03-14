#!/bin/bash

# LiqPro 简化启动脚本
MODE=${1:-dev}

cd "$(dirname "$0")"

if [ "$MODE" == "prod" ]; then
  echo "以生产模式启动 LiqPro..."
  echo "加载生产环境配置..."
  export $(grep -v '^#' .env.prod | xargs)
  CONTAINER_SUFFIX="-prod"
else
  echo "以开发模式启动 LiqPro (使用真实数据)..."
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
docker-compose -f docker-compose.yml up -d

echo
echo "服务已启动，可通过以下地址访问："
echo "前端: http://localhost:3000"
echo "API服务: http://localhost:3001"
echo "数据服务: http://localhost:3002"
echo "信号服务: http://localhost:3003"
echo "评分服务: http://localhost:3004"
echo "Agent引擎: http://localhost:3005"
echo "Solana缓存: http://localhost:3006"
echo "RabbitMQ管理界面: http://localhost:15672 (用户名: $RABBITMQ_USER, 密码: $RABBITMQ_PASS)"
echo
echo "查看日志: docker-compose -f docker-compose.yml logs -f [服务名]"
echo "停止服务: ./stop.sh" 