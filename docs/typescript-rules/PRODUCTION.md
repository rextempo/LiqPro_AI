# LiqPro 生产环境部署指南

本文档提供了如何在生产环境中部署和运行LiqPro平台的详细说明。

## 系统要求

- Docker 20.10+
- Docker Compose 2.0+
- 至少8GB RAM
- 至少50GB磁盘空间
- 稳定的互联网连接（用于连接Solana网络）

## 环境配置

LiqPro使用以下服务：

1. **前端应用** - React应用，提供用户界面
2. **API服务** - 处理前端请求的主要API服务
3. **数据服务** - 负责从Solana区块链收集和存储数据
4. **信号服务** - 处理市场信号和分析
5. **评分服务** - 评估LP池的健康状况和风险
6. **Agent引擎** - 管理自动化投资代理
7. **MongoDB** - 数据存储
8. **RabbitMQ** - 消息队列

## 部署步骤

### 1. 克隆代码库

```bash
git clone https://github.com/yourusername/liqpro.git
cd liqpro
```

### 2. 配置环境变量

每个服务都有自己的`.env.production`文件，包含了该服务所需的所有环境变量。请确保这些文件中的配置正确，特别是：

- Solana RPC端点
- MongoDB连接字符串
- RabbitMQ凭据
- API密钥和密钥

### 3. 启动生产环境

使用提供的脚本启动所有服务：

```bash
./start-production.sh
```

这将启动所有必要的Docker容器，并配置它们使用生产环境设置。

### 4. 验证部署

启动后，您可以访问以下URL来验证各个服务是否正常运行：

- 前端应用：http://localhost:3000
- API服务：http://localhost:3001
- RabbitMQ管理界面：http://localhost:15672（用户名：liqpro，密码：liqpro_password）

## 监控和维护

### 日志查看

查看特定服务的日志：

```bash
docker-compose -f docker-compose.production.yml logs -f [service-name]
```

例如，查看数据服务的日志：

```bash
docker-compose -f docker-compose.production.yml logs -f data-service
```

### 重启服务

如果需要重启特定服务：

```bash
docker-compose -f docker-compose.production.yml restart [service-name]
```

### 停止所有服务

```bash
docker-compose -f docker-compose.production.yml down
```

## 备份和恢复

### 数据库备份

```bash
docker exec -it liqpro_mongodb_1 mongodump --out /data/backup
```

然后将备份文件从容器中复制出来：

```bash
docker cp liqpro_mongodb_1:/data/backup ./mongodb-backup
```

### 数据库恢复

```bash
docker cp ./mongodb-backup liqpro_mongodb_1:/data/
docker exec -it liqpro_mongodb_1 mongorestore /data/mongodb-backup
```

## 故障排除

### 常见问题

1. **服务无法启动**
   - 检查日志以获取详细错误信息
   - 验证环境变量是否正确配置
   - 确保所有依赖服务（如MongoDB和RabbitMQ）都在运行

2. **无法连接到Solana网络**
   - 检查RPC端点是否可访问
   - 验证网络连接是否稳定
   - 考虑使用备用RPC提供商

3. **性能问题**
   - 检查服务器资源使用情况
   - 考虑增加Docker容器的资源限制
   - 优化MongoDB查询和索引

## 安全注意事项

- 定期更新所有服务和依赖项
- 使用强密码保护MongoDB和RabbitMQ
- 限制API访问，使用API密钥认证
- 考虑在生产环境中使用HTTPS
- 定期备份数据

## 联系支持

如有任何问题或需要帮助，请联系：

- 技术支持：support@liqpro.com
- 开发团队：dev@liqpro.com 