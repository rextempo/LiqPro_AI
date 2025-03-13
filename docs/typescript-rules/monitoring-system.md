# LiqPro 监控系统指南

本文档详细介绍 LiqPro 项目的监控系统，包括架构设计、配置方法、指标说明和告警规则。

## 目录

1. [监控架构](#监控架构)
2. [指标收集](#指标收集)
3. [日志管理](#日志管理)
4. [健康检查](#健康检查)
5. [告警系统](#告警系统)
6. [仪表盘](#仪表盘)
7. [监控最佳实践](#监控最佳实践)
8. [故障排查](#故障排查)

## 监控架构

LiqPro 监控系统采用以下组件：

- **Prometheus**: 用于指标收集和存储
- **Grafana**: 用于指标可视化和告警
- **Elasticsearch**: 用于日志存储和搜索
- **Kibana**: 用于日志可视化和分析
- **Logstash**: 用于日志收集和处理

整体架构如下：

```
                    ┌─────────────┐
                    │   Grafana   │
                    │  (可视化)   │
                    └──────┬──────┘
                           │
                    ┌──────┴──────┐
                    │ Prometheus  │
                    │ (指标存储)  │
                    └──────┬──────┘
                           │
┌──────────────────┬──────┴──────┬──────────────────┐
│                  │             │                  │
▼                  ▼             ▼                  ▼
┌──────────┐ ┌──────────┐ ┌──────────┐      ┌──────────┐
│API Service│ │Data Svc  │ │Signal Svc│ ...  │Agent Eng │
│ /metrics  │ │ /metrics │ │ /metrics │      │ /metrics │
└──────┬───┘ └──────┬───┘ └──────┬───┘      └──────┬───┘
       │            │            │                 │
       └────────────┼────────────┼─────────────────┘
                    │            │
                    ▼            ▼
             ┌─────────────┐    ┌─────────────┐
             │  Logstash   │───▶│Elasticsearch│
             │ (日志收集)  │    │ (日志存储)  │
             └─────────────┘    └──────┬──────┘
                                       │
                                       ▼
                                ┌─────────────┐
                                │   Kibana    │
                                │ (日志分析)  │
                                └─────────────┘
```

## 指标收集

### Prometheus 配置

Prometheus 配置文件位于 `deploy/docker/prometheus/prometheus.yml`，定义了从各服务抓取指标的方式：

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'prometheus'
    static_configs:
      - targets: ['localhost:9090']

  - job_name: 'node-exporter'
    static_configs:
      - targets: ['node-exporter:9100']

  - job_name: 'data-service'
    static_configs:
      - targets: ['data-service:3001']
    metrics_path: '/metrics'

  - job_name: 'signal-service'
    static_configs:
      - targets: ['signal-service:3002']
    metrics_path: '/metrics'

  - job_name: 'scoring-service'
    static_configs:
      - targets: ['scoring-service:3003']
    metrics_path: '/metrics'

  - job_name: 'agent-engine'
    static_configs:
      - targets: ['agent-engine:3004']
    metrics_path: '/metrics'
```

### 关键指标

LiqPro 系统收集以下关键指标：

#### HTTP 指标

| 指标名称 | 类型 | 描述 | 标签 |
|---------|------|------|------|
| `http_requests_total` | Counter | HTTP 请求总数 | `method`, `route`, `status_code` |
| `http_request_duration_seconds` | Histogram | HTTP 请求处理时间 | `method`, `route`, `status_code` |

#### 消息队列指标

| 指标名称 | 类型 | 描述 | 标签 |
|---------|------|------|------|
| `mq_connection_status` | Gauge | RabbitMQ 连接状态 | `service` |
| `mq_messages_published_total` | Counter | 已发布消息总数 | `exchange`, `routing_key` |
| `mq_messages_consumed_total` | Counter | 已消费消息总数 | `queue`, `event_type` |
| `mq_message_processing_duration_seconds` | Histogram | 消息处理时间 | `queue`, `event_type` |
| `mq_message_processing_errors_total` | Counter | 消息处理错误总数 | `queue`, `event_type`, `error_type` |

#### Agent 指标

| 指标名称 | 类型 | 描述 | 标签 |
|---------|------|------|------|
| `agents_total` | Gauge | 当前 Agent 总数 | `status` |
| `agent_operations_total` | Counter | Agent 操作总数 | `operation`, `status` |
| `agent_operation_duration_seconds` | Histogram | Agent 操作耗时 | `operation` |

#### 系统健康指标

| 指标名称 | 类型 | 描述 | 标签 |
|---------|------|------|------|
| `system_health_status` | Gauge | 系统组件健康状态 | `component` |
| `external_service_health_status` | Gauge | 外部服务健康状态 | `service` |

### 在服务中集成指标收集

每个服务使用 `monitoring` 模块来收集和暴露指标：

```typescript
import express from 'express';
import { 
  metricsMiddleware, 
  setupMetricsEndpoint,
  httpRequestsTotal,
  httpRequestDurationSeconds
} from '@liqpro/monitoring';

const app = express();

// 添加指标中间件
app.use(metricsMiddleware());

// 设置指标端点
setupMetricsEndpoint(app);

// 手动记录指标
httpRequestsTotal.inc({
  method: 'POST',
  route: '/api/agents',
  status_code: 201
});

// 使用计时器记录耗时
const end = httpRequestDurationSeconds.startTimer({
  method: 'POST',
  route: '/api/agents'
});
try {
  // 执行操作
  // ...
  end({ status_code: 201 });
} catch (error) {
  end({ status_code: 500 });
  throw error;
}
```

## 日志管理

### 日志架构

LiqPro 使用 ELK 栈（Elasticsearch, Logstash, Kibana）进行日志管理：

1. 服务使用 Winston 记录结构化日志
2. 日志输出到文件和控制台
3. Logstash 收集日志文件
4. Elasticsearch 存储和索引日志
5. Kibana 提供日志可视化和搜索

### 日志配置

每个服务使用以下配置记录日志：

```typescript
import { createLogger } from '@liqpro/monitoring';

const logger = createLogger('ServiceName');

// 使用不同级别记录日志
logger.error('严重错误', { error: err });
logger.warn('警告信息', { resourceId: '123' });
logger.info('普通信息', { userId: '456' });
logger.debug('调试信息', { details: { ... } });
```

### 日志格式

所有日志遵循以下 JSON 格式：

```json
{
  "timestamp": "2023-03-15T12:34:56.789Z",
  "level": "info",
  "service": "api-service",
  "component": "AuthController",
  "message": "User authenticated successfully",
  "correlationId": "corr-123456",
  "userId": "user-789",
  "requestId": "req-abc123",
  "ip": "192.168.1.1",
  "duration": 45,
  "metadata": {
    "additional": "information"
  }
}
```

### 日志查询

可以通过 Kibana 界面（http://localhost:5601）查询和分析日志：

```
service: "api-service" AND level: "error"
message: "Failed to connect*" AND @timestamp: [now-1h TO now]
correlationId: "corr-123456"
```

## 健康检查

### 健康检查端点

每个服务提供以下健康检查端点：

- `/health`: 基本健康状态（适用于负载均衡器）
- `/health/detailed`: 详细健康信息（适用于监控系统）

### 健康检查实现

```typescript
import { 
  initializeHealthMonitoring, 
  setupHealthEndpoint,
  updateComponentHealth,
  SystemComponent,
  HealthStatus
} from '@liqpro/monitoring';

// 初始化健康监控
initializeHealthMonitoring();

// 设置健康检查端点
setupHealthEndpoint(app);

// 更新组件健康状态
updateComponentHealth(
  SystemComponent.DATABASE,
  HealthStatus.HEALTHY,
  'Connected successfully'
);

// 检查外部服务健康状态
await checkExternalServiceHealth(
  SystemComponent.API_SERVICE,
  'http://api-service:3000/health'
);
```

### 健康检查响应格式

```json
// GET /health
{
  "status": "healthy",
  "timestamp": "2023-03-15T12:34:56.789Z",
  "version": "1.0.0"
}

// GET /health/detailed
{
  "status": "degraded",
  "timestamp": "2023-03-15T12:34:56.789Z",
  "version": "1.0.0",
  "components": [
    {
      "name": "database",
      "status": "healthy",
      "message": "Connected successfully",
      "lastChecked": "2023-03-15T12:34:50.123Z"
    },
    {
      "name": "rabbitmq",
      "status": "degraded",
      "message": "High latency detected",
      "lastChecked": "2023-03-15T12:34:55.456Z"
    },
    {
      "name": "api_service",
      "status": "healthy",
      "message": "OK",
      "lastChecked": "2023-03-15T12:34:52.789Z"
    }
  ]
}
```

## 告警系统

### 告警配置

告警规则配置在 Grafana 中，位于 `deploy/docker/grafana/provisioning/alerting/alerts.yaml`：

```yaml
groups:
  - name: LiqPro Alerts
    folder: LiqPro
    interval: 1m
    rules:
      - name: Service Down
        condition: B
        data:
          - refId: A
            datasourceUid: prometheus
            model:
              expr: up == 0
          - refId: B
            datasourceUid: __expr__
            model:
              conditions:
                - evaluator:
                    type: gt
                  query:
                    params: [A]
        for: 1m
        annotations:
          summary: "Service {{ $labels.job }} is down"
          description: "Service {{ $labels.job }} has been down for more than 1 minute."
        labels:
          severity: critical
```

### 关键告警规则

LiqPro 配置了以下关键告警：

1. **服务宕机**: 服务不可用超过 1 分钟
2. **高错误率**: 5xx 错误率超过 5% 持续 5 分钟
3. **响应缓慢**: 95 百分位响应时间超过 1 秒持续 5 分钟
4. **RabbitMQ 连接丢失**: 服务与 RabbitMQ 断开连接超过 1 分钟

### 告警通知

告警可以通过以下渠道发送：

- Email
- Slack
- Webhook
- PagerDuty

配置告警通知渠道：

1. 登录 Grafana (http://localhost:3000)
2. 导航到 Alerting -> Notification channels
3. 添加新的通知渠道
4. 在告警规则中引用该通知渠道

## 仪表盘

### 预配置仪表盘

LiqPro 提供以下预配置的 Grafana 仪表盘：

1. **LiqPro Overview**: 系统整体状态和关键指标
2. **Service Performance**: 服务性能和资源使用情况
3. **Message Queue**: 消息队列状态和性能
4. **Agent Operations**: Agent 操作和状态

### 仪表盘配置

仪表盘配置文件位于 `deploy/docker/grafana/dashboards/` 目录下：

- `liqpro-overview.json`: 系统概览仪表盘
- `service-performance.json`: 服务性能仪表盘
- `message-queue.json`: 消息队列仪表盘
- `agent-operations.json`: Agent 操作仪表盘

### 自定义仪表盘

可以通过 Grafana 界面创建自定义仪表盘：

1. 登录 Grafana (http://localhost:3000)
2. 点击 "Create" -> "Dashboard"
3. 添加面板并配置数据源和查询
4. 保存仪表盘

## 监控最佳实践

### 指标设计

1. **选择合适的指标类型**:
   - Counter: 单调递增的计数器（如请求总数）
   - Gauge: 可增可减的值（如当前连接数）
   - Histogram: 观测值分布（如响应时间）
   - Summary: 类似 Histogram，但计算服务端分位数

2. **使用有意义的标签**:
   - 添加足够的标签以便分析（如 service, endpoint, status_code）
   - 避免基数过高的标签（如 user_id, request_id）
   - 保持标签命名一致性

3. **关注四个黄金信号**:
   - 延迟: 服务响应时间
   - 流量: 系统需求量
   - 错误: 失败请求率
   - 饱和度: 系统资源使用率

### 日志最佳实践

1. **使用结构化日志**:
   - 使用 JSON 格式
   - 包含上下文信息
   - 使用一致的字段名

2. **合理设置日志级别**:
   - ERROR: 需要立即关注的问题
   - WARN: 潜在问题或异常情况
   - INFO: 重要操作或状态变更
   - DEBUG: 详细调试信息

3. **包含关联标识符**:
   - correlationId: 跟踪相关事件
   - requestId: 标识特定请求
   - sessionId: 标识用户会话

### 告警最佳实践

1. **避免告警疲劳**:
   - 只对需要人工干预的问题发出告警
   - 设置合理的阈值，避免误报
   - 对相似告警进行分组

2. **设置合理的告警级别**:
   - Critical: 需要立即处理的严重问题
   - Warning: 需要关注但不紧急的问题
   - Info: 提供信息，不需要立即行动

3. **提供有用的上下文**:
   - 清晰描述问题
   - 包含相关指标和阈值
   - 提供排查建议

## 故障排查

### Prometheus 问题

#### 无法抓取指标

**问题**: Prometheus 无法从服务抓取指标

**解决方案**:
- 检查服务是否正常运行
- 确认服务暴露了 `/metrics` 端点
- 验证网络连接和防火墙设置
- 检查 Prometheus 配置中的 target 设置

#### 查询返回空结果

**问题**: Prometheus 查询返回空结果

**解决方案**:
- 确认指标名称和标签正确
- 检查时间范围设置
- 验证服务是否正在生成该指标
- 使用 Prometheus UI 检查原始指标数据

### Grafana 问题

#### 仪表盘无数据

**问题**: Grafana 仪表盘显示 "No data"

**解决方案**:
- 检查数据源连接是否正常
- 验证查询语法是否正确
- 确认时间范围设置
- 检查 Prometheus 中是否有数据

#### 告警未触发

**问题**: 预期的告警未触发

**解决方案**:
- 检查告警规则配置
- 验证告警条件是否满足
- 检查告警评估间隔
- 确认通知渠道配置正确

### 日志问题

#### 日志未出现在 Elasticsearch

**问题**: 服务日志未出现在 Elasticsearch 中

**解决方案**:
- 检查服务日志文件是否正确生成
- 确认 Logstash 配置正确
- 验证 Elasticsearch 连接状态
- 检查 Logstash 和 Elasticsearch 日志中的错误

#### 日志查询性能差

**问题**: Kibana 日志查询性能差

**解决方案**:
- 优化查询语句，避免使用通配符前缀
- 使用更精确的时间范围
- 增加 Elasticsearch 资源
- 考虑优化索引策略 