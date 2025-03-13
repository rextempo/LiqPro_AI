# LiqPro Signal Service

信号服务负责处理来自数据服务的池数据，生成交易信号，并将这些信号发布到消息队列供其他服务使用。

## 功能

- 接收并处理来自RabbitMQ的池数据
- 基于池数据生成交易信号
- 将生成的信号发布到RabbitMQ队列
- 提供API端点以查询信号和策略

## 技术栈

- Node.js
- TypeScript
- Express
- MongoDB
- RabbitMQ
- Winston (日志记录)

## 目录结构

```
signal-service/
├── src/
│   ├── controllers/     # 控制器
│   ├── models/          # 数据模型
│   ├── routes/          # API路由
│   ├── services/        # 业务逻辑
│   ├── types/           # TypeScript类型定义
│   ├── utils/           # 工具函数
│   ├── logger.ts        # 日志配置
│   ├── rabbitmq.ts      # RabbitMQ配置
│   └── server.ts        # 服务入口点
├── .env                 # 环境变量
├── package.json         # 项目依赖
└── tsconfig.json        # TypeScript配置
```

## 安装

```bash
npm install
```

## 开发

```bash
npm run dev
```

## 构建

```bash
npm run build
```

## 运行

```bash
npm start
```

## 环境变量

- `PORT`: 服务端口 (默认: 3002)
- `MONGODB_URI`: MongoDB连接URI
- `RABBITMQ_HOST`: RabbitMQ主机
- `RABBITMQ_PORT`: RabbitMQ端口
- `RABBITMQ_USER`: RabbitMQ用户名
- `RABBITMQ_PASS`: RabbitMQ密码
- `LOG_LEVEL`: 日志级别 (默认: info)

## API端点

- `GET /health`: 健康检查
- `GET /api/signals`: 获取所有信号
- `GET /api/signals/:id`: 获取特定信号
- `GET /api/strategies`: 获取所有策略 