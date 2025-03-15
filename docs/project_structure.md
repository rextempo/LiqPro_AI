# LiqPro 项目目录结构

## 顶层目录结构
```
lp-agent/
├── backend/          # 后端服务代码
├── frontend/         # React 前端应用
├── shared/           # 共享类型和工具
├── scripts/         # 开发和部署脚本
├── config/          # 环境配置文件
├── docker/          # Docker 相关文件
├── docs/            # 文档
├── .github/         # GitHub Actions 工作流
├── package.json     # 项目根配置
├── tsconfig.json    # TypeScript 配置
└── README.md        # 项目说明
```

## 后端代码结构
```
backend/
├── src/
│   ├── api/              # API 路由和控制器
│   │   ├── agents/
│   │   ├── auth/
│   │   ├── pools/
│   │   └── index.ts
│   ├── core/             # 核心业务逻辑
│   │   ├── data/         # 数据与监控模块
│   │   ├── signal/       # 信号与风控模块
│   │   ├── agent/        # Agent 执行模块
│   │   └── index.ts
│   ├── db/               # 数据库连接和模型
│   │   ├── models/
│   │   ├── migrations/
│   │   └── index.ts
│   ├── services/         # 外部服务集成
│   │   ├── meteora.ts    # Meteora API 集成
│   │   ├── jupiter.ts    # Jupiter API 集成
│   │   ├── solana.ts     # Solana Web3 交互
│   │   └── index.ts
│   ├── utils/            # 工具函数
│   │   ├── cache.ts      # 内存缓存实现
│   │   ├── logger.ts     # 日志工具
│   │   ├── security.ts   # 加密工具
│   │   └── validators.ts # 数据验证工具
│   ├── config.ts         # 配置加载器
│   ├── app.ts            # Express 应用设置
│   └── index.ts          # 入口文件
├── package.json
├── tsconfig.json
└── .env.example          # 环境变量示例
```

## 前端代码结构
```
frontend/
├── src/
│   ├── components/       # UI 组件
│   │   ├── common/       # 通用组件
│   │   ├── dashboard/    # Dashboard 相关组件
│   │   ├── agent/        # Agent 详情组件
│   │   ├── pools/        # 池子相关组件
│   │   └── auth/         # 认证相关组件
│   ├── contexts/         # React Context
│   │   ├── AuthContext.tsx
│   │   ├── AgentContext.tsx
│   │   └── PoolContext.tsx
│   ├── hooks/            # 自定义 Hooks
│   │   ├── useApi.ts     # API 调用 Hook
│   │   ├── useAgent.ts   # Agent 管理 Hook
│   │   └── usePools.ts   # 池子数据 Hook
│   ├── pages/            # 页面组件
│   │   ├── Login.tsx
│   │   ├── Dashboard.tsx
│   │   ├── AgentDetail.tsx
│   │   └── Settings.tsx
│   ├── services/         # 服务调用
│   │   ├── api.ts        # API 客户端
│   │   └── auth.ts       # 认证服务
│   ├── utils/            # 工具函数
│   │   ├── format.ts     # 格式化工具
│   │   ├── validation.ts # 表单验证
│   │   └── storage.ts    # 本地存储工具
│   ├── styles/           # 样式文件
│   ├── App.tsx           # 主应用组件
│   ├── index.tsx         # 入口文件
│   └── routes.tsx        # 路由配置
├── public/               # 静态资源
├── package.json
├── tsconfig.json
└── .env.example
```

## 共享代码结构
```
shared/
├── src/
│   ├── types/            # 共享类型定义
│   │   ├── agent.ts      # Agent 相关类型
│   │   ├── pool.ts       # 池子相关类型
│   │   ├── api.ts        # API 请求/响应类型
│   │   └── index.ts
│   ├── constants/        # 共享常量
│   │   ├── errorCodes.ts # 错误代码
│   │   ├── poolTypes.ts  # 池子类型定义
│   │   └── index.ts
│   └── utils/            # 共享工具函数
│       ├── math.ts       # 数学计算工具
│       └── validation.ts # 通用验证规则
├── package.json
└── tsconfig.json
```

## 配置文件结构
```
config/
├── default.js            # 默认配置
├── development.js        # 开发环境配置
├── production.js         # 生产环境配置
└── test.js              # 测试环境配置
```

## Docker 文件结构
```
docker/
├── Dockerfile           # 主 Dockerfile
├── docker-compose.yml   # Docker Compose 配置
└── .dockerignore        # Docker 忽略文件
``` 