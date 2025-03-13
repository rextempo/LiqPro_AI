#!/bin/bash

# 启动本地生产环境

echo "正在启动 LiqPro 本地生产环境..."

# 确保使用生产环境配置
export NODE_ENV=production

# 停止并移除所有现有容器
echo "停止并移除现有容器..."
docker-compose down

# 构建并启动所有服务
echo "构建并启动所有服务..."
docker-compose up -d

# 等待所有服务启动
echo "等待服务启动..."
sleep 15

# 检查服务状态
echo "检查服务状态..."
docker-compose ps

echo "LiqPro 本地生产环境已启动。"
echo "前端访问地址: http://localhost:3000"
echo "API 访问地址: http://localhost:3001"
echo "MongoDB: mongodb://localhost:27017"
echo "RabbitMQ 管理界面: http://localhost:15672 (用户名: liqpro, 密码: liqpro_password)"
echo ""
echo "前端测试说明:"
echo "1. 打开浏览器访问 http://localhost:3000"
echo "2. 使用钱包连接功能登录系统"
echo "3. 在主控制台创建新的 Agent 并测试功能"
echo "4. 查看 Agent 详情页面的健康状态和交易历史"
echo ""
echo "如需停止环境，请运行: docker-compose down" 