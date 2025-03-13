# LiqPro 开发指南

本目录包含 LiqPro 平台的开发指南，帮助开发者理解和使用 LiqPro 平台进行开发。

## 开发环境设置

*开发环境设置指南将在后续添加。*

## 架构概览

LiqPro 是一个基于 Solana 区块链的 AI 驱动投资平台，专注于 Meteora DLMM 流动性池。平台由以下主要组件组成：

- **前端应用**：用户界面，使用 React 和 TypeScript 构建
- **API 服务**：提供 RESTful API 和 WebSocket 连接
- **Agent 引擎**：管理和执行自动化交易策略
- **数据服务**：收集和处理链上数据和市场数据
- **信号服务**：分析市场数据并生成交易信号
- **评分服务**：评估潜在投资的风险和机会
- **Solana 缓存**：缓存 Solana 区块链数据

## 开发流程

### 代码风格和规范

LiqPro 项目使用 ESLint 和 Prettier 来强制执行代码风格和规范。请确保您的代码符合这些规范。

```bash
# 检查代码风格
npm run lint

# 自动修复代码风格问题
npm run lint:fix
```

### 分支管理

- `main`：主分支，包含稳定的代码
- `develop`：开发分支，包含最新的开发代码
- `feature/*`：功能分支，用于开发新功能
- `bugfix/*`：修复分支，用于修复 bug
- `release/*`：发布分支，用于准备发布

### 提交消息规范

提交消息应遵循以下格式：

```
<type>(<scope>): <subject>

<body>

<footer>
```

其中 `type` 可以是：

- `feat`：新功能
- `fix`：修复 bug
- `docs`：文档更改
- `style`：不影响代码含义的更改（空格、格式等）
- `refactor`：既不修复 bug 也不添加功能的代码更改
- `perf`：提高性能的代码更改
- `test`：添加或修改测试
- `chore`：对构建过程或辅助工具的更改

### 代码审查

所有代码更改都需要通过代码审查。代码审查应关注：

- 代码质量和可读性
- 功能正确性
- 性能和安全性
- 测试覆盖率

## 测试指南

*测试指南将在后续添加。*

## API 文档

*API 文档将在后续添加。*

## 故障排除

*故障排除指南将在后续添加。*

## 参考资源

- [React 文档](https://reactjs.org/docs/getting-started.html)
- [TypeScript 文档](https://www.typescriptlang.org/docs/)
- [Solana 文档](https://docs.solana.com/)
- [Meteora DLMM 文档](https://docs.meteora.ag/) 