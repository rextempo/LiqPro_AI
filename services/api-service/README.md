# LiqPro API服务

LiqPro API服务是一个统一的API网关，用于管理和协调LiqPro平台的各个微服务。它提供了一个集中的接入点，用于访问信号服务、数据服务、评分服务和代理服务等核心功能。

## 功能特点

- **统一API网关**：为所有微服务提供单一接入点
- **服务健康检查**：监控所有微服务的健康状态
- **安全认证**：API密钥认证机制
- **请求限流**：防止API滥用
- **跨域资源共享**：支持前端应用访问
- **日志记录**：详细的请求和错误日志

## 技术栈

- Node.js
- TypeScript
- Express.js
- Axios

## 项目结构

```
services/api-service/
├── src/                  # 源代码
│   ├── clients/          # 服务客户端
│   ├── config/           # 配置文件
│   ├── middleware/       # 中间件
│   ├── routes/           # API路由
│   ├── utils/            # 工具函数
│   ├── app.ts            # 应用配置
│   └── server.ts         # 服务器入口
├── .env                  # 环境变量
├── .gitignore            # Git忽略文件
├── package.json          # 项目依赖
└── tsconfig.json         # TypeScript配置
```

## 安装与运行

### 前置条件

- Node.js >= 18.0.0
- npm 或 yarn

### 安装依赖

```bash
cd services/api-service
npm install
```

### 开发环境运行

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 运行生产版本

```bash
npm start
```

## 环境变量

创建一个`.env`文件在项目根目录，参考`.env.example`文件进行配置：

```
PORT=3000                           # 服务端口
NODE_ENV=development                # 环境（development/production）
CORS_ORIGINS=http://localhost:3000  # 允许的跨域来源
API_KEYS=your-api-key               # API密钥列表（逗号分隔）
SIGNAL_SERVICE_URL=http://...       # 信号服务URL
DATA_SERVICE_URL=http://...         # 数据服务URL
SCORING_SERVICE_URL=http://...      # 评分服务URL
AGENT_SERVICE_URL=http://...        # 代理服务URL
```

## API端点

### 健康检查

```
GET /health
```

返回所有服务的健康状态。

### API路由

所有API路由都需要在请求头中包含有效的API密钥：

```
X-API-Key: your-api-key
```

#### 信号服务

```
GET /api/signal
```

#### 数据服务

```
GET /api/data
```

#### 评分服务

```
GET /api/scoring
```

#### 代理服务

```
GET /api/agent
```

## 开发指南

### 添加新的服务客户端

1. 在`src/clients`目录下创建新的客户端类
2. 扩展`BaseClient`类
3. 在`ServiceManager`中添加获取新客户端的方法
4. 在`src/routes`中添加相应的路由

### 错误处理

所有服务客户端都应该正确处理错误，并将其传递给调用者。API服务将捕获这些错误并返回适当的HTTP响应。

## API Documentation

Once the server is running, you can access the Swagger documentation at:

```
http://localhost:3000/api-docs
```

## API Endpoints

The API service provides the following main endpoint groups:

- `/api/signals` - Trading signal endpoints
- `/api/strategies` - Strategy management endpoints
- `/api/history` - Historical data endpoints
- `/api/alerts` - Alert and notification endpoints

## Environment Variables

See `.env.example` for all available configuration options.

## Authentication

All API endpoints require authentication using an API key. The API key should be provided in the `X-API-Key` header.

## Error Handling

The API uses a standardized error response format:

```json
{
  "status": "error",
  "message": "Error message",
  "errors": [
    {
      "field": "fieldName",
      "message": "Field-specific error message"
    }
  ]
}
```

## Logging

Logs are written to:
- Console (in development)
- `logs/combined.log` - All logs
- `logs/error.log` - Error logs only

## Testing

Run tests:

```
npm test
```

Run tests with coverage:

```
npm run test:coverage
```

## License

Proprietary - All rights reserved 