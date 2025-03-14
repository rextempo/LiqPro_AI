#!/bin/bash

# 修复RabbitMQ用户名和密码问题的脚本
echo "开始修复RabbitMQ用户名和密码问题..."

# 确保在正确的目录中执行
cd "$(dirname "$0")"

# 定义标准的用户名和密码
RABBITMQ_USER="liqpro"
RABBITMQ_PASS="liqpro_password"

# 更新环境文件
update_env_file() {
  local file=$1
  
  if [ -f "$file" ]; then
    echo "更新 $file 中的RabbitMQ配置..."
    
    # 检查是否存在RABBITMQ_USER和RABBITMQ_PASS
    if grep -q "RABBITMQ_USER" "$file"; then
      # 更新RABBITMQ_USER
      sed -i '' "s/RABBITMQ_USER=.*/RABBITMQ_USER=$RABBITMQ_USER/" "$file"
    else
      # 添加RABBITMQ_USER
      echo "RABBITMQ_USER=$RABBITMQ_USER" >> "$file"
    fi
    
    if grep -q "RABBITMQ_PASS" "$file"; then
      # 更新RABBITMQ_PASS
      sed -i '' "s/RABBITMQ_PASS=.*/RABBITMQ_PASS=$RABBITMQ_PASS/" "$file"
    else
      # 添加RABBITMQ_PASS
      echo "RABBITMQ_PASS=$RABBITMQ_PASS" >> "$file"
    fi
  else
    echo "警告: $file 不存在，跳过更新"
  fi
}

# 更新环境文件
update_env_file ".env"
update_env_file ".env.dev"
update_env_file ".env.prod"

echo "RabbitMQ配置已更新，现在重新启动服务..."

# 停止所有服务
./stop.sh

# 清理RabbitMQ数据卷
echo "清理RabbitMQ数据卷..."
docker volume rm unified-config_rabbitmq_data || true

# 重新启动服务
echo "重新启动服务..."
./start-selected.sh dev

echo "完成！RabbitMQ用户名和密码问题已修复。"
echo "用户名: $RABBITMQ_USER"
echo "密码: $RABBITMQ_PASS" 