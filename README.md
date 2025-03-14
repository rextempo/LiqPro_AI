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

## 部署指南
1. 确保已安装Docker和Docker Compose
2. 克隆仓库: `git clone <repository-url>`
3. 进入项目目录: `cd liqpro`
4. 启动服务: `docker-compose up -d`

## 开发指南
- 所有代码更改必须提交到main分支
- 遵循项目的代码风格和最佳实践
- 确保所有服务之间的接口保持一致

## 版本信息
请参阅VERSION.md文件获取最新版本信息。
