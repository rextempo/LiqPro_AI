# LiqPro 项目文档

本目录包含 LiqPro 项目的相关文档，包括项目结构、优化记录等。

## 文档列表

- [仓库优化总结](./OPTIMIZATION_SUMMARY.md) - 对 LiqPro 仓库进行的优化和整理工作总结

## 项目概述

LiqPro 是一个基于 Solana 区块链的 AI 驱动投资平台，专注于 Meteora DLMM 流动性池。平台旨在帮助用户自动捕捉高质量 LP 投资机会并执行交易，创造被动收益。

## 项目结构

```
LiqPro/
├── production/           # 生产环境配置和部署文件
│   ├── services/         # 微服务
│   ├── frontend/         # 前端应用
│   ├── data/             # 数据存储目录
│   ├── docs/             # 文档
│   ├── scripts/          # 脚本
│   ├── deploy/           # 部署配置
│   └── .env-files/       # 环境变量配置
├── src/                  # 源代码
├── docs/                 # 文档
├── scripts/              # 脚本
├── deploy/               # 部署配置
├── tests/                # 测试
└── .env-files/           # 环境变量配置
```

## 技术栈

### 前端

- React
- TypeScript
- Chakra UI
- React Query
- Zustand

### 后端

- Node.js
- Express
- MongoDB
- Redis
- RabbitMQ

### 区块链

- Solana
- Meteora DLMM
- Jupiter API

## 主要功能

- **用户认证**：支持钱包连接和 API 密钥认证
- **Agent 管理**：创建、配置和监控 Agent
- **池分析**：分析和比较 Meteora DLMM 流动性池
- **交易执行**：自动执行交易策略
- **风险管理**：评估和管理投资风险
- **性能监控**：监控 Agent 和池的性能

## 部署环境

- **开发环境**：用于开发和测试
- **生产环境**：用于生产部署

## 未来计划

- 添加更多的交易策略
- 改进风险管理机制
- 增强用户界面和用户体验
- 支持更多的区块链和 DEX

## 贡献指南

如果您想为项目做出贡献，请参考[开发指南](../development-guides/README.md)。 