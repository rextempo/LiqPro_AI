# LiqPro - AI驱动的Meteora DLMM流动性池投资平台

## 项目概述
LiqPro是一个基于Solana区块链的AI驱动自动化LP投资平台，帮助用户自动捕捉高质量LP投资机会并执行交易，创造被动收益。

## 系统架构
- **前端**: React应用，提供用户界面和交互
- **API服务**: 处理前端请求，协调后端服务
- **数据服务**: 从Meteora API获取池数据
- **信号服务**: 分析池数据，生成投资信号
- **评分服务**: 评估池子质量和风险
- **Agent引擎**: 执行自动化投资策略
- **Solana缓存**: 缓存Solana区块链数据

## 目录结构
所有微服务都位于`/services`目录下：
- `/services/frontend`: 前端应用
- `/services/api-service`: API服务
- `/services/data-service`: 数据服务
- `/services/signal-service`: 信号服务
- `/services/scoring-service`: 评分服务
- `/services/agent-engine`: Agent引擎
- `/services/solana-cache`: Solana缓存服务

## 简化环境配置
LiqPro 现在使用统一的环境配置，支持两种模式：

- **开发模式**：支持热更新和使用真实数据，适合即时开发和测试
- **生产模式**：针对部署优化，关闭热更新

所有配置都通过环境变量控制，位于 `unified-config` 目录：
- `docker-compose.yml`: 统一的服务配置
- `.env.dev`: 开发模式环境变量
- `.env.prod`: 生产模式环境变量

## 快速启动

使用统一启动脚本，选择所需模式：

```bash
./start-unified.sh
```

或直接启动特定模式：

```bash
# 开发模式（热更新 + 真实数据）
cd unified-config && ./start.sh dev

# 生产模式
cd unified-config && ./start.sh prod
```

停止服务：

```bash
cd unified-config && ./stop.sh
```

## 服务访问

启动后，可通过以下地址访问各服务：

- 前端: http://localhost:3000
- API服务: http://localhost:3001
- 数据服务: http://localhost:3002
- 信号服务: http://localhost:3003
- 评分服务: http://localhost:3004
- Agent引擎: http://localhost:3005
- Solana缓存: http://localhost:3006
- RabbitMQ管理界面: http://localhost:15672

## 开发指南
- 所有代码更改必须提交到main分支
- 遵循项目的代码风格和最佳实践
- 确保所有服务之间的接口保持一致
- 开发模式下支持热更新，修改代码后会自动重新加载

## 版本信息
请参阅VERSION.md文件获取最新版本信息。
