# LiqPro 消息队列集成指南

本文档详细介绍 LiqPro 项目中的消息队列集成，包括架构设计、使用方法、重试机制和最佳实践。

## 目录

1. [架构概述](#架构概述)
2. [交换机和队列](#交换机和队列)
3. [消息格式](#消息格式)
4. [发布和消费](#发布和消费)
5. [重试机制](#重试机制)
6. [死信处理](#死信处理)
7. [监控和调试](#监控和调试)
8. [最佳实践](#最佳实践)
9. [常见问题](#常见问题)

## 架构概述

LiqPro 使用 RabbitMQ 作为消息队列中间件，实现服务间的异步通信。消息队列在系统中扮演以下角色：

1. **事件广播**：服务可以发布事件，其他服务可以订阅并响应这些事件
2. **命令分发**：服务可以发送命令给特定服务执行
3. **负载均衡**：将工作分配给多个消费者实例
4. **解耦**：减少服务间的直接依赖
5. **缓冲**：处理流量峰值和服务暂时不可用的情况

## 交换机和队列

### 主要交换机

| 交换机名称 | 类型 | 描述 |
|------------|------|------|
| `liqpro.events` | topic | 用于广播事件，支持基于模式的路由 |
| `liqpro.commands` | direct | 用于发送命令到特定服务 |
| `delayed.messages` | direct | 用于处理延迟消息和重试 |
| `dead.letter` | direct | 用于处理无法处理的消息 |

### 主要队列

| 队列名称 | 绑定到交换机 | 路由键 | 描述 |
|----------|--------------|--------|------|
| `api-service.events` | `liqpro.events` | `#` | API 服务订阅所有事件 |
| `data-service.market-events` | `liqpro.events` | `market.#` | 数据服务订阅市场相关事件 |
| `signal-service.events` | `liqpro.events` | `market.#,agent.#` | 信号服务订阅市场和代理事件 |
| `scoring-service.events` | `liqpro.events` | `signal.#` | 评分服务订阅信号事件 |
| `agent-engine.commands` | `liqpro.commands` | `agent` | Agent 引擎接收命令 |
| `dead.letter.queue` | `dead.letter` | `#` | 存储所有死信消息 |

## 消息格式

所有消息应遵循以下 JSON 格式：

```json
{
  "id": "msg-123456",
  "type": "event.type",
  "timestamp": "2023-03-15T12:34:56.789Z",
  "source": "service-name",
  "correlationId": "corr-123456",
  "data": {
    // 消息具体内容
  },
  "metadata": {
    // 可选元数据
  }
}
```

### 字段说明

- **id**: 消息唯一标识符
- **type**: 消息类型，用于路由和处理
- **timestamp**: 消息创建时间
- **source**: 发送消息的服务名称
- **correlationId**: 关联 ID，用于跟踪相关消息
- **data**: 消息主体内容
- **metadata**: 可选元数据，如重试信息

## 发布和消费

### 发布消息

使用 `MessageQueue` 类发布消息：

```typescript
import { MessageQueue } from '@liqpro/common';

// 初始化消息队列
const messageQueue = new MessageQueue({
  host: process.env.RABBITMQ_HOST || 'localhost',
  port: parseInt(process.env.RABBITMQ_PORT || '5672'),
  username: process.env.RABBITMQ_USER || 'guest',
  password: process.env.RABBITMQ_PASSWORD || 'guest',
  vhost: process.env.RABBITMQ_VHOST || '/'
});

// 连接到 RabbitMQ
await messageQueue.connect();

// 发布事件
await messageQueue.publish(
  'liqpro.events',
  'agent.created',
  {
    id: 'msg-' + Date.now(),
    type: 'agent.created',
    timestamp: new Date().toISOString(),
    source: 'api-service',
    correlationId: 'corr-123456',
    data: {
      agentId: 'agent-123',
      name: 'Test Agent',
      createdAt: new Date().toISOString()
    }
  }
);

// 发布命令
await messageQueue.publish(
  'liqpro.commands',
  'agent',
  {
    id: 'msg-' + Date.now(),
    type: 'agent.start',
    timestamp: new Date().toISOString(),
    source: 'api-service',
    correlationId: 'corr-123456',
    data: {
      agentId: 'agent-123',
      parameters: {
        // 启动参数
      }
    }
  }
);
```

### 消费消息

```typescript
// 创建队列并绑定到交换机
await messageQueue.createQueue('agent-engine.commands');
await messageQueue.bindQueue('agent-engine.commands', 'liqpro.commands', 'agent');

// 消费消息
await messageQueue.consume(
  'agent-engine.commands',
  async (message) => {
    if (!message) return;
    
    try {
      // 解析消息内容
      const content = JSON.parse(message.content.toString());
      console.log('Received command:', content);
      
      // 处理不同类型的命令
      switch (content.type) {
        case 'agent.start':
          await handleAgentStart(content.data);
          break;
        case 'agent.stop':
          await handleAgentStop(content.data);
          break;
        default:
          console.warn('Unknown command type:', content.type);
      }
      
      // 处理成功，确认消息
      // 注意：使用增强版 MessageQueue 时，不需要手动确认，会自动处理
    } catch (error) {
      console.error('Error processing message:', error);
      // 处理失败，消息会自动进入重试流程
      throw error;
    }
  },
  { prefetch: 10 } // 每次获取 10 条消息
);
```

## 重试机制

LiqPro 实现了强大的消息重试机制，确保消息处理的可靠性：

### 重试流程

1. 消息处理失败时（抛出异常），会自动进入重试流程
2. 系统会记录重试次数，并使用指数退避算法计算下次重试延迟
3. 消息会被发送到延迟队列，等待指定时间后重新投递
4. 达到最大重试次数后，消息会被发送到死信队列

### 重试配置

可以通过 `MessageQueue` 构造函数配置重试参数：

```typescript
const messageQueue = new MessageQueue({
  // 基本连接配置
  host: 'localhost',
  port: 5672,
  username: 'guest',
  password: 'guest',
  vhost: '/',
  
  // 重试配置
  retryOptions: {
    maxRetries: 5,           // 最大重试次数
    initialDelay: 1000,      // 初始延迟（毫秒）
    maxDelay: 60000,         // 最大延迟（毫秒）
    backoffFactor: 2,        // 退避因子
    retryHeaderName: 'x-retry-count' // 重试计数的消息头名称
  }
});
```

## 死信处理

当消息达到最大重试次数或被显式拒绝时，会被发送到死信队列：

### 死信消息格式

死信消息会包含额外的头信息：

```
x-error: "错误信息"
x-original-exchange: "原始交换机"
x-original-routing-key: "原始路由键"
x-failed-at: "失败时间"
x-retry-count: 5
```

### 处理死信消息

可以通过以下方式处理死信队列中的消息：

```typescript
// 消费死信队列
await messageQueue.consume(
  'dead.letter.queue',
  async (message) => {
    if (!message) return;
    
    // 解析消息内容
    const content = JSON.parse(message.content.toString());
    const headers = message.properties.headers || {};
    
    console.log('Processing dead letter message:', {
      content,
      error: headers['x-error'],
      originalExchange: headers['x-original-exchange'],
      originalRoutingKey: headers['x-original-routing-key'],
      failedAt: headers['x-failed-at'],
      retryCount: headers['x-retry-count']
    });
    
    // 根据业务需求处理死信消息
    // 例如：记录到数据库、发送告警、手动重试等
    
    // 确认消息
    messageQueue.ack(message);
  }
);
```

## 监控和调试

### RabbitMQ 管理界面

访问 http://localhost:15672 (用户名/密码: guest/guest) 可以：

- 查看交换机和队列状态
- 监控消息流量
- 检查队列中的消息
- 发布测试消息

### Prometheus 指标

系统收集以下与消息队列相关的指标：

- `mq_connection_status`: 连接状态 (0=断开, 1=已连接)
- `mq_messages_published_total`: 已发布消息总数
- `mq_messages_consumed_total`: 已消费消息总数
- `mq_message_processing_duration_seconds`: 消息处理耗时
- `mq_message_processing_errors_total`: 消息处理错误总数

### 日志

消息队列相关操作会记录详细日志：

```
[2023-03-15 12:34:56.789] [INFO] [MessageQueue] - Connected to RabbitMQ at localhost:5672/
[2023-03-15 12:34:57.123] [INFO] [MessageQueue] - Published message to liqpro.events (agent.created)
[2023-03-15 12:35:01.456] [ERROR] [MessageQueue] - Error processing message: ...
[2023-03-15 12:35:01.789] [INFO] [MessageQueueRetry] - Retrying message (attempt 1/5) after 1000ms delay
```

## 最佳实践

### 消息设计

1. **保持消息小而精简**：避免在消息中包含大量数据
2. **使用明确的消息类型**：遵循 `domain.entity.action` 格式（如 `agent.position.created`）
3. **包含必要的元数据**：时间戳、来源、关联ID等
4. **使用幂等处理器**：确保消息可以安全地重复处理

### 队列管理

1. **合理设置预取数量**：根据消息处理速度和复杂性调整
2. **监控队列长度**：避免队列积压
3. **设置消息过期时间**：防止过时消息占用资源
4. **使用持久化**：确保消息在RabbitMQ重启后不丢失

### 错误处理

1. **区分临时错误和永久错误**：只对临时错误进行重试
2. **记录详细错误信息**：包括消息ID、错误类型和堆栈跟踪
3. **实现熔断机制**：当下游服务持续失败时暂停消息处理
4. **定期检查死信队列**：分析失败原因并采取措施

## 常见问题

### 连接问题

**问题**：服务无法连接到RabbitMQ

**解决方案**：
- 检查RabbitMQ服务是否运行
- 验证连接参数（主机、端口、用户名、密码）
- 确认网络连接和防火墙设置
- 检查RabbitMQ日志中的错误信息

### 消息丢失

**问题**：消息发送后未被处理

**解决方案**：
- 确保使用了持久化交换机和队列
- 使用发布确认机制
- 检查是否有消费者绑定到队列
- 查看是否有消息被拒绝并丢弃

### 性能问题

**问题**：消息处理速度慢或队列积压

**解决方案**：
- 增加消费者数量
- 优化消息处理逻辑
- 增加预取数量
- 考虑使用消息批处理
- 检查RabbitMQ服务器资源使用情况

### 重复消息

**问题**：同一消息被处理多次

**解决方案**：
- 实现幂等消费者
- 使用消息去重机制
- 检查是否正确确认了消息
- 避免在处理消息时抛出异常后又手动确认 