#!/bin/bash

# 启动生产环境

echo "Starting LiqPro production environment..."

# 确保使用生产环境配置
export NODE_ENV=production

# 停止并移除所有现有容器
echo "Stopping and removing existing containers..."
docker-compose -f docker-compose.production.yml down

# 构建并启动所有服务
echo "Building and starting all services..."
docker-compose -f docker-compose.production.yml up -d --build

# 等待所有服务启动
echo "Waiting for services to start..."
sleep 10

# 检查服务状态
echo "Checking service status..."
docker-compose -f docker-compose.production.yml ps

echo "LiqPro production environment is now running."
echo "Frontend: http://localhost:3000"
echo "API: http://localhost:3001"
echo "MongoDB: mongodb://localhost:27017"
echo "RabbitMQ Management: http://localhost:15672" 