# RabbitMQ连接问题解决方案

## 问题描述

signal-service无法连接到RabbitMQ，出现以下错误：

```
ACCESS_REFUSED - Login was refused using authentication mechanism PLAIN
```

## 原因分析

1. RabbitMQ容器中只有一个用户`liqpro`，没有默认的`guest`用户
2. signal-service尝试使用默认的`guest`用户连接，导致认证失败
3. 环境变量配置不正确，没有指定正确的RabbitMQ用户名和密码

## 解决方案

### 1. 修改环境变量

创建正确的`.env`文件，使用正确的RabbitMQ用户名和密码：

```env
PORT=3002
MONGODB_URI=mongodb://mongodb:27017/liqpro
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_USER=liqpro
RABBITMQ_PASS=liqpro
LOG_LEVEL=info
```

### 2. 重置RabbitMQ用户密码

确保RabbitMQ用户的密码正确：

```bash
docker exec production-rabbitmq-1 rabbitmqctl change_password liqpro liqpro
```

### 3. 改进server.js代码

1. 添加更详细的日志记录，包括连接URL（隐藏密码）
2. 添加错误处理，确保在RabbitMQ连接失败时服务仍能继续运行
3. 添加测试端点，用于验证信号发布功能

### 4. 创建启动脚本

创建`start.sh`脚本，确保容器重启后signal-service能自动启动：

```bash
#!/bin/bash
cd /app/services/signal-service
node server.js > signal-service.log 2>&1
```

## 验证方法

1. 检查RabbitMQ连接状态：

```bash
docker exec production-signal-service-1 curl -u liqpro:liqpro http://rabbitmq:15672/api/overview
```

2. 测试信号发布功能：

```bash
docker exec production-signal-service-1 curl -X POST http://localhost:3002/api/test/publish-signal
```

3. 检查RabbitMQ队列状态：

```bash
docker exec production-rabbitmq-1 rabbitmqctl list_queues
```

4. 检查信号API：

```bash
docker exec production-signal-service-1 curl -s http://localhost:3002/api/signals | jq
```

## 注意事项

1. 确保RabbitMQ和signal-service在同一Docker网络中
2. 确保RabbitMQ用户有足够的权限
3. 使用正确的主机名（rabbitmq）而不是localhost
4. 在生产环境中，应该使用更安全的密码管理方式，如Docker Secrets或Kubernetes Secrets 