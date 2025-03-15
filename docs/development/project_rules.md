# LiqPro 项目开发规范

## 1. 命名规范

### 文件与目录命名
- **后端**：使用小写字母和连字符（kebab-case）
  - 示例：`pool-service.ts`, `agent-manager.ts`
- **前端**：
  - React组件使用大驼峰（PascalCase）
    - 示例：`AgentCard.tsx`, `PoolList.tsx`
  - 工具函数和辅助文件使用小驼峰（camelCase）
    - 示例：`formatAmount.ts`, `usePoolData.ts`
- **测试文件**：添加 `.test.ts` 或 `.spec.ts` 后缀

### 变量与函数命名
- **变量和函数**：使用小驼峰（camelCase）
  - 示例：`getPoolData()`, `userBalance`
- **类和接口**：使用大驼峰（PascalCase）
  - 示例：`AgentConfig`, `PoolInterface`
- **常量**：使用大写和下划线（UPPER_SNAKE_CASE）
  - 示例：`MAX_RISK_LEVEL`, `DEFAULT_TIMEOUT`
- **布尔类型变量**：使用 `is`、`has` 或 `should` 前缀
  - 示例：`isActive`, `hasPermission`, `shouldRefresh`

### API命名
- **API路径**：使用复数名词
  - 示例：`/api/pools`, `/api/agents`
- **API方法**：使用动词+名词形式
  - 示例：`getPools`, `createAgent`, `updateSettings`
- **事件处理函数**：使用 `handle` 前缀
  - 示例：`handleSubmit`, `handlePoolSelect`
- **上下文提供者**：使用 `Provider` 后缀
  - 示例：`AgentContextProvider`, `PoolContextProvider`

## 2. 代码组织规范

### 项目结构
- 严格遵循项目目录结构文档定义
- **后端三模块设计**：
  1. 数据与监控模块
  2. 信号与风控模块
  3. Agent执行模块
- 每个模块必须有明确的职责边界和接口定义
- 前端按功能域组织组件，而非按类型

### 代码分层
- **后端分层**：
  1. API层
  2. 业务逻辑层
  3. 数据访问层
- **前端分层**：
  1. UI组件层
  2. 业务逻辑层
  3. API调用层
- 严格遵循单向依赖原则，禁止跨层调用

### 组件设计原则
- React组件遵循单一职责原则
- UI组件与业务逻辑分离，使用自定义hooks封装逻辑
- 优先使用组合而非继承
- 共享组件统一放置在 `components/common` 目录

### 状态管理
- 使用React Context API进行全局状态管理
- 按业务域划分Context：
  - `AuthContext`
  - `AgentContext`
  - `PoolContext`
- 避免过度使用全局状态
- 优先考虑组件内部状态和属性传递

## 3. 依赖管理规范

### 包管理器选择
- 使用pnpm作为包管理工具
- 使用pnpm workspace支持monorepo结构
- 使用固定版本号，禁止使用`^`或`~`

### 依赖添加原则
- 添加新依赖前必须评估必要性
- 遵循最小依赖原则
- 优先使用核心库提供的功能
- 评估依赖的：
  - 包大小
  - 维护状态
  - 安全性
- 共享依赖放在根package.json
- 模块特定依赖放在各自的package.json

### 依赖更新策略
- 定期更新依赖修复安全漏洞
- 使用`pnpm outdated`检查过时依赖
- 依赖更新后必须运行完整测试套件
- 重大依赖更新记录在CHANGELOG中

### 特定依赖规范
- **UI组件**：Tailwind CSS + shadcn/ui
- **数据获取**：Axios/fetch API
- **表单处理**：React Hook Form
- **Web3交互**：@solana/web3.js + Meteora SDK

## 4. 环境配置规范

### 环境划分
- **开发环境**（development）：本地开发
- **生产环境**（production）：线上部署

### 两环境共性
- 连接Solana主网获取真实数据
- 使用相同的外部服务API端点：
  - Meteora API
  - Jupiter API
  - Solana RPC
- 保持相同的核心业务逻辑实现

### 环境变量管理
- 使用.env文件管理环境变量：
  - `.env.development`：开发环境
  - `.env.production`：生产环境
  - `.env.example`：模板文件
- 敏感信息不提交到代码库

### 开发环境特性
- 配置热更新（Hot Reload）
- 启用源码映射（Source Maps）
- 详细日志输出
- 开发工具支持：
  - React DevTools
  - Redux DevTools
- 可配置RPC节点切换
- 使用本地数据库实例
- 支持模拟数据生成
- 动态钱包账户切换

### 生产环境特性
- 构建优化：
  - 代码压缩
  - 懒加载
  - 代码分割
- 禁用开发工具和详细日志
- 错误监控和性能跟踪
- 数据库连接池优化
- CDN资源分发
- 严格的CSP策略

### Docker配置
- 使用多阶段构建
- 开发环境使用Docker Compose
- 配置卷挂载支持热更新
- 开发容器包含必要工具
- 生产镜像优化移除开发依赖
- 统一基础镜像确保一致性

### Solana连接配置
- 多RPC节点负载均衡
- 请求重试和超时机制
- 高频请求缓存策略
- 安全的交易签名流程
- RPC节点性能监控 