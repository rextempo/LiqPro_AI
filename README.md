# LiqPro Frontend

这是LiqPro的前端应用程序，LiqPro是一个专注于Solana区块链上Meteora DLMM流动性池的AI驱动投资平台。

## 功能特性

- 多种认证方式：钱包登录和API密钥登录
- 通过WebSocket实现实时数据更新
- 受保护的路由系统，基于用户角色控制访问权限
- 响应式设计，适配各种设备尺寸
- 定时任务管理，支持自动化操作

## 技术栈

- React 18
- TypeScript
- Tailwind CSS 用于样式设计
- React Router v6 用于导航
- Axios 用于API请求
- WebSocket 用于实时通信
- Solana Web3.js 用于区块链交互

## 开发状态

当前版本: **0.1.0-alpha** (开发中)

已完成的功能:

- ✅ 项目基础架构
- ✅ 认证系统
- ✅ WebSocket通信
- ✅ 路由保护
- ✅ 基础UI组件

正在开发的功能:

- 🔄 Agent管理界面
- 🔄 LP池子展示
- 🔄 资产概况和收益分析

查看 [VERSION.md](./VERSION.md) 获取更多详细信息。

## 快速开始

### 前提条件

- Node.js 16+
- npm 或 yarn

### 安装

1. 克隆仓库

```bash
git clone https://github.com/yourusername/liqpro.git
cd liqpro
```

2. 安装依赖

```bash
npm install
```

3. 启动开发服务器

```bash
npm start
```

应用程序将在 http://localhost:3000 可用。

## 项目结构

```
src/
├── api/              # API客户端实现
│   └── clients/      # 各种API客户端
├── components/       # 可复用UI组件
├── contexts/         # React上下文提供者
├── config/           # 应用配置
├── core/             # 核心功能实现
├── types/            # TypeScript类型定义
├── utils/            # 工具函数
├── App.tsx           # 主应用组件
└── index.tsx         # 应用入口点
```

## 可用脚本

- `npm start` - 启动开发服务器
- `npm build` - 构建生产版本
- `npm test` - 运行测试套件
- `npm lint` - 运行代码检查
- `npm lint:fix` - 修复代码检查问题

## 安全考虑

- 所有API请求都使用JWT令牌进行认证
- 令牌过期时自动刷新
- 敏感数据从不以明文形式存储在本地存储中
- 受保护的路由确保适当的授权
- WebSocket连接使用安全会话管理

## 贡献指南

1. Fork 仓库
2. 创建功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 许可证

本项目采用MIT许可证 - 详情请参阅LICENSE文件。
