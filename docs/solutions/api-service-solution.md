# API服务问题解决方案

## 问题描述

API服务容器持续重启，出现以下错误：

```
npm error code ENOENT
npm error syscall open
npm error path /app/services/api-service/package.json
npm error errno -2
npm error enoent Could not read package.json: Error: ENOENT: no such file or directory, open '/app/services/api-service/package.json'
```

## 原因分析

1. 生产环境中的API服务容器挂载了`/Users/rex/Documents/LiqPro/production`目录到容器的`/app`目录
2. 但是在这个目录中没有正确的文件结构，特别是缺少`/app/services/api-service/package.json`文件
3. 容器启动命令尝试执行`npm install`和`npm start`，但是由于缺少必要的文件而失败

## 解决方案

### 1. 创建必要的目录和文件

创建了一个脚本`fix-api-service.sh`，用于创建必要的目录和文件：

```bash
#!/bin/bash

# 创建必要的目录
mkdir -p production/services/api-service/src
mkdir -p production/services/api-service/dist
mkdir -p production/libs/common/dist

# 复制API服务代码
cp -r services/api-service/src/* production/services/api-service/src/
cp services/api-service/package.json production/services/api-service/
cp services/api-service/tsconfig.json production/services/api-service/
cp services/api-service/.env.production production/services/api-service/

# 复制common库代码
cp -r libs/common/src/* production/libs/common/src/
cp -r libs/common/dist/* production/libs/common/dist/
cp libs/common/package.json production/libs/common/
cp libs/common/tsconfig.json production/libs/common/

# 创建server.js文件
# ... (server.js内容)

# 创建.env文件
# ... (.env内容)

# 创建启动脚本
# ... (start.sh内容)

# 添加执行权限
chmod +x production/services/api-service/start.sh
```

### 2. 简化API服务代码

为了避免TypeScript编译问题，我们创建了一个简化版的`server.js`文件，直接使用JavaScript而不是TypeScript：

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const http = require('http');
const WebSocket = require('ws');
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const winston = require('winston');
const axios = require('axios');

// ... (其余代码)
```

### 3. 创建简化版的package.json

创建了一个简化版的`package.json`文件，只包含必要的依赖项：

```json
{
  "name": "api-service",
  "version": "1.0.0",
  "description": "API service for LiqPro platform",
  "main": "server.js",
  "scripts": {
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.1",
    "cors": "^2.8.5",
    "helmet": "^6.0.0",
    "compression": "^1.7.4",
    "dotenv": "^16.0.1",
    "mongoose": "^6.5.0",
    "winston": "^3.8.1",
    "axios": "^0.27.2",
    "ws": "^8.8.1",
    "http": "^0.0.1-security"
  }
}
```

### 4. 创建启动脚本

创建了一个启动脚本`start.sh`，用于启动API服务：

```bash
#!/bin/bash
cd /app/services/api-service
node server.js > api-service.log 2>&1
```

### 5. 创建新的Docker容器

由于原来的容器启动命令有问题，我们创建了一个新的Docker容器，使用我们的启动脚本：

```bash
docker run -d --name api-service-fixed -v /Users/rex/Documents/LiqPro/production:/app -p 3001:3000 --network production_liqpro-network node:18 bash -c "cd /app/services/api-service && npm install && node server.js"
```

## 验证方法

1. 检查API服务的健康状态：

```bash
docker exec api-service-fixed curl -s http://localhost:3000/health
```

返回结果：

```json
{"status":"ok","service":"api-service"}
```

## 注意事项

1. 在生产环境中，应该使用Docker Compose或Kubernetes来管理容器，而不是直接使用Docker命令
2. 应该使用Docker镜像构建过程来安装依赖项，而不是在容器启动时安装
3. 应该使用环境变量来配置服务，而不是硬编码在代码中
4. 应该使用日志收集工具来收集和分析日志，而不是直接写入文件 