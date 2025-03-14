# LiqPro Scoring Service

评分服务是LiqPro投资平台的核心微服务之一，负责计算Meteora DLMM流动性池的健康评分、风险评估和投资建议。

## 功能概述

- **健康评分计算**：基于多种指标评估流动性池的健康状况
- **风险评估**：分析流动性池的风险水平并分类
- **投资建议**：根据健康评分和风险评估生成投资行动建议
- **API接口**：提供RESTful API获取评分、评估和建议数据

## 技术栈

- Node.js
- Express.js
- Winston (日志记录)
- Docker

## 目录结构

```
scoring-service/
├── Dockerfile
├── .env
├── .env.example
├── server.js
├── package.json
├── src/
│   ├── controllers/
│   │   └── scoring-controller.js
│   ├── routes/
│   │   └── api.js
│   ├── utils/
│   │   └── logger.js
│   └── models/
│       ├── health-score.js
│       ├── risk-assessment.js
│       └── recommendation.js
└── logs/
    ├── scoring-service.log
    └── scoring-service-error.log
```

## 环境变量

服务配置通过`.env`文件进行，主要包括：

- 服务端口和环境设置
- 相关服务URL（数据服务、信号服务）
- 评分间隔和历史数据保留期
- 风险和行动阈值
- 日志级别

详细配置请参考`.env.example`文件。

## 启动服务

### 本地开发

```bash
# 安装依赖
npm install

# 启动服务
npm start
```

### Docker部署

```bash
# 构建Docker镜像
docker build -t liqpro/scoring-service .

# 运行容器
docker run -p 3000:3000 liqpro/scoring-service
```

## API端点

| 端点 | 方法 | 描述 |
|------|------|------|
| `/health` | GET | 服务健康检查 |
| `/pools/:poolAddress/health-scores` | GET | 获取指定池的所有健康评分历史 |
| `/pools/:poolAddress/health-score/latest` | GET | 获取指定池的最新健康评分 |
| `/pools/:poolAddress/risk-assessments` | GET | 获取指定池的所有风险评估历史 |
| `/pools/:poolAddress/risk-assessment/latest` | GET | 获取指定池的最新风险评估 |
| `/pools/:poolAddress/recommendations` | GET | 获取指定池的所有建议历史 |
| `/pools/:poolAddress/recommendation/latest` | GET | 获取指定池的最新建议 |
| `/pools/:poolAddress/score` | POST | 手动触发对指定池的评分 |
| `/score-cycle` | POST | 手动触发对所有池的评分周期 |

## 安全考虑

- 服务使用Helmet中间件增强API安全性
- 实现了适当的错误处理和日志记录
- 使用环境变量管理敏感配置

## 日志

服务日志存储在`logs`目录中：
- `scoring-service.log`：包含所有级别的日志
- `scoring-service-error.log`：仅包含错误日志

日志级别可通过`.env`文件中的`LOG_LEVEL`变量配置。 