# LiqPro 技术实现规范文档

## 1. 服务架构设计

### 1.1 目录结构
```
/LiqPro
├── services/                # 微服务模块
│   ├── data-service/       # 数据采集和处理服务
│   │   ├── src/
│   │   ├── tests/
│   │   └── Dockerfile
│   ├── signal-service/     # 信号生成和分析服务
│   │   ├── src/
│   │   ├── tests/
│   │   └── Dockerfile
│   ├── scoring-service/    # 评分和决策服务
│   │   ├── src/
│   │   ├── tests/
│   │   └── Dockerfile
│   └── agent-engine/       # Agent执行引擎
│       ├── src/
│       ├── tests/
│       └── Dockerfile
├── libs/                   # 共享库
│   ├── common/            # 共享工具和类型
│   ├── database/          # 数据库访问层
│   └── security/          # 安全相关功能
├── frontend/              # 前端应用
│   ├── src/
│   ├── public/
│   └── Dockerfile
├── deploy/                # 部署配置
│   ├── docker/
│   ├── k8s/
│   └── terraform/
└── docs/                  # 项目文档
```

### 1.2 服务职责划分

#### data-service（数据服务）
- Meteora池子数据采集
- 市场数据聚合
- 历史数据存储和管理
- 实时数据流处理

#### signal-service（信号服务）
- 市场分析
- 策略生成
- 信号优化
- 回测模拟

#### scoring-service（评分服务）
- 池子健康度评分
- 风险评估
- 收益分析
- 决策建议生成

#### agent-engine（Agent引擎）
- Agent生命周期管理
- 交易执行
- 资金管理
- 风控执行

## 2. Docker配置规范

### 2.1 开发环境配置
```yaml
# docker-compose.dev.yml
version: '3.8'

services:
  data-service:
    build: ./services/data-service
    cpu_count: 2
    mem_limit: 2g
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/data-service:/app

  signal-service:
    build: ./services/signal-service
    cpu_count: 2
    mem_limit: 2g
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/signal-service:/app

  scoring-service:
    build: ./services/scoring-service
    cpu_count: 2
    mem_limit: 2g
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/scoring-service:/app

  agent-engine:
    build: ./services/agent-engine
    cpu_count: 2
    mem_limit: 4g
    environment:
      - NODE_ENV=development
    volumes:
      - ./services/agent-engine:/app

  redis:
    image: redis:6.2
    command: redis-server --maxmemory 512mb --maxmemory-policy allkeys-lru
    ports:
      - "6379:6379"

  mongodb:
    image: mongo:5.0
    environment:
      - MONGO_INITDB_ROOT_USERNAME=admin
      - MONGO_INITDB_ROOT_PASSWORD=secret
    ports:
      - "27017:27017"
    volumes:
      - mongodb_data:/data/db

  postgres:
    image: postgres:14
    environment:
      - POSTGRES_USER=admin
      - POSTGRES_PASSWORD=secret
      - POSTGRES_DB=liqpro
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  mongodb_data:
  postgres_data:
```

### 2.2 生产环境资源限制
```yaml
# 生产环境资源配置
resources:
  data-service:
    cpu: "2"
    memory: "4Gi"
    
  signal-service:
    cpu: "2"
    memory: "4Gi"
    
  scoring-service:
    cpu: "2"
    memory: "4Gi"
    
  agent-engine:
    cpu: "4"
    memory: "8Gi"
```

## 3. 数据库配置规范

### 3.1 PostgreSQL配置
```sql
-- 创建分区表
CREATE TABLE agent_transactions (
    agent_id UUID NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    pool_address TEXT NOT NULL,
    transaction_type TEXT NOT NULL,
    amount DECIMAL(20,8) NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (timestamp);

-- 创建索引
CREATE INDEX idx_agent_transactions_agent_id ON agent_transactions(agent_id);
CREATE INDEX idx_agent_transactions_pool ON agent_transactions(pool_address);
CREATE INDEX idx_agent_transactions_timestamp ON agent_transactions(timestamp);
CREATE INDEX idx_agent_transactions_composite ON agent_transactions(agent_id, pool_address);
```

### 3.2 MongoDB配置
```javascript
// 分片配置
sh.enableSharding("liqpro")
sh.shardCollection("liqpro.agent_data", { agent_id: "hashed" })

// 索引创建
db.agent_data.createIndex({ agent_id: 1, timestamp: -1 })
db.agent_data.createIndex({ pool_address: 1 })
db.agent_data.createIndex({ "status.health_score": 1 })
```

### 3.3 Redis配置
```conf
# Redis配置
maxmemory 6gb
maxmemory-policy allkeys-lru
save 900 1
save 300 10
save 60 10000
appendonly yes
appendfsync everysec
```

## 4. 安全实现规范

### 4.1 API认证
```typescript
// JWT配置
interface JWTConfig {
  accessTokenExpiry: '2h',
  refreshTokenExpiry: '7d',
  algorithm: 'RS256',
  issuer: 'liqpro-auth'
}

// API限流配置
const rateLimits = {
  standard: {
    windowMs: 60 * 1000, // 1分钟
    max: 60 // 限制60次
  },
  sensitive: {
    windowMs: 60 * 1000,
    max: 10 // 限制10次
  }
}
```

### 4.2 数据加密
```typescript
// 加密配置
const encryptionConfig = {
  algorithm: 'aes-256-gcm',
  keyDerivation: {
    algorithm: 'pbkdf2',
    iterations: 10000,
    hashLength: 32
  },
  privateKeyStorage: {
    shards: 3,
    threshold: 2
  }
}
```

## 5. 监控配置规范

### 5.1 Prometheus指标
```yaml
metrics:
  # 系统指标
  - name: cpu_usage_percent
    type: gauge
    labels: [service, instance]
    
  - name: memory_usage_percent
    type: gauge
    labels: [service, instance]
    
  # 业务指标
  - name: active_agents_count
    type: gauge
    
  - name: trade_execution_time_seconds
    type: histogram
    buckets: [0.1, 0.5, 1, 2, 5]
```

### 5.2 日志配置
```yaml
logging:
  # ELK配置
  elasticsearch:
    indices:
      - name: data-service-*
        retention: 30d
      - name: signal-service-*
        retention: 30d
      - name: scoring-service-*
        retention: 30d
      - name: agent-engine-*
        retention: 30d
      - name: error-logs-*
        retention: 90d
```

## 6. 开发规范

### 6.1 代码风格
```json
{
  "extends": ["airbnb-base", "prettier"],
  "rules": {
    "max-len": ["error", { "code": 100 }],
    "no-console": ["error", { "allow": ["warn", "error"] }],
    "import/prefer-default-export": "off"
  }
}
```

### 6.2 Git提交规范
```
feat: 新功能
fix: 修复bug
docs: 文档更新
style: 代码格式调整
refactor: 重构
test: 测试相关
chore: 构建/工具链相关
```

### 6.3 分支管理
```
main: 生产环境分支
develop: 开发主分支
feature/*: 功能分支
bugfix/*: 问题修复分支
release/*: 发布分支
``` 