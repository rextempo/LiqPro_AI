#!/bin/bash

# 设置工作目录
cd "$(dirname "$0")/.."

# 检查环境文件
if [ ! -f "config/.env" ]; then
  echo "错误: 环境配置文件不存在"
  echo "请复制 config/.env.template 为 config/.env 并填写适当的值"
  exit 1
fi

# 加载环境变量
export $(grep -v '^#' config/.env | xargs)

# 启动服务
echo "启动 LiqPro 生产环境服务..."
docker-compose -f config/docker-compose.yml up -d

# 检查服务状态
echo "服务状态:"
docker-compose -f config/docker-compose.yml ps

echo "服务已启动，可以通过以下命令查看日志:"
echo "docker-compose -f config/docker-compose.yml logs -f"
