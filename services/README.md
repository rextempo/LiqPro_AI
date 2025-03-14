# LiqPro 统一服务

本目录包含 LiqPro 平台的所有微服务的统一版本。

## 服务列表

1. **API Service** - API 网关服务
2. **Data Service Real** - 真实数据收集和处理服务（位于production目录）
3. **Signal Service** - 信号生成服务
4. **Scoring Service** - 风险评分服务
5. **Agent Engine** - 代理引擎服务
6. **Solana Cache** - Solana 区块链数据缓存服务

## 部署说明

使用以下命令启动所有服务：

```bash
docker-compose up -d
```

## 端口分配

- Frontend: 3000
- API Service: 3001
- Data Service Real: 3002
- Signal Service: 3003
- Scoring Service: 3004
- Agent Engine: 3005
- Solana Cache: 3006
- MongoDB: 27017
- RabbitMQ: 5672, 15672 (管理界面)

## 版本信息

所有服务版本: 1.0.0
