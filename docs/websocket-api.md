# LiqPro WebSocket API 文档

本文档详细说明 LiqPro WebSocket API 的使用方法、事件类型和数据格式。

## 概述

LiqPro WebSocket API 提供实时信号和系统消息的推送服务。客户端可以订阅特定主题，并根据自定义过滤条件接收相关信号。

## 连接信息

- **WebSocket 端点**: `wss://api.liqpro.ai/socket.io`
- **协议**: Socket.IO v4
- **路径**: `/socket.io`

## 认证

所有 WebSocket 连接都需要进行 API 密钥认证。

### 认证流程

1. 建立 WebSocket 连接
2. 发送 `authenticate` 事件，包含 API 密钥
3. 接收认证响应
4. 认证成功后才能进行订阅操作

### 认证示例

```javascript
// 客户端代码
const socket = io('wss://api.liqpro.ai', {
  path: '/socket.io',
  transports: ['websocket']
});

// 连接成功后进行认证
socket.on('connect', () => {
  socket.emit('authenticate', { apiKey: 'your-api-key' }, (response) => {
    if (response.success) {
      console.log('认证成功');
      // 继续订阅操作
    } else {
      console.error('认证失败:', response.error);
    }
  });
});
```

## 事件类型

### 服务器发送的事件

| 事件名称 | 描述 | 数据格式 |
|---------|------|---------|
| `connection_info` | 连接建立后发送的连接信息 | `{ clientId: string, topics: string[] }` |
| `signals` | 未过滤的信号广播 | `{ signals: Signal[], timestamp: number }` |
| `filtered_signals` | 根据订阅选项过滤后的信号 | `{ subscriptionId: string, signals: Signal[] }` |
| `system_message` | 系统消息通知 | `{ message: string, type: string, timestamp: number }` |
| `ping` | 心跳检测 | `{ timestamp: number }` |

### 客户端发送的事件

| 事件名称 | 描述 | 数据格式 | 回调参数 |
|---------|------|---------|---------|
| `authenticate` | 进行 API 密钥认证 | `{ apiKey: string }` | `{ success: boolean, error?: string }` |
| `subscribe` | 订阅特定主题 | `{ topic: string, options?: object }` | `{ success: boolean, subscriptionId?: string, error?: string }` |
| `unsubscribe` | 取消订阅 | `{ subscriptionId: string }` | `{ success: boolean, error?: string }` |
| `getSubscriptions` | 获取当前订阅列表 | 无 | `{ success: boolean, subscriptions?: object[], error?: string }` |

## 订阅主题

### 可用主题

- `signals`: 投资信号
- `system`: 系统消息
- `performance`: 性能指标
- `strategy`: 策略更新

### 信号订阅选项

订阅 `signals` 主题时，可以提供以下过滤选项：

| 选项名称 | 类型 | 描述 | 示例 |
|---------|------|------|------|
| `poolAddresses` | `string[]` | 池地址过滤 | `['pool-1', 'pool-2']` |
| `signalTypes` | `SignalType[]` | 信号类型过滤 | `[SignalType.ENTRY, SignalType.EXIT]` |
| `minStrength` | `SignalStrength` | 最小信号强度 | `SignalStrength.MEDIUM` |
| `timeframes` | `SignalTimeframe[]` | 时间框架过滤 | `[SignalTimeframe.SHORT_TERM]` |
| `minReliability` | `SignalReliability` | 最小可靠性 | `SignalReliability.HIGH` |
| `fromTimestamp` | `number` | 开始时间戳 | `1646092800000` |
| `toTimestamp` | `number` | 结束时间戳 | `1646179200000` |

## 数据类型

### Signal

```typescript
interface Signal {
  id: string;                         // 信号 ID
  poolAddress: string;                // 池地址
  tokenPair: string;                  // 代币对
  type: SignalType;                   // 信号类型
  strength: SignalStrength;           // 信号强度
  timeframe: SignalTimeframe;         // 时间框架
  reliability: SignalReliability;     // 可靠性
  timestamp: number;                  // 生成时间戳
  expirationTimestamp?: number;       // 过期时间戳
  description: string;                // 描述
  suggestedAction: string;            // 建议操作
  factors: SignalFactorInfo[];        // 信号因素
  metadata?: Record<string, any>;     // 元数据
}
```

### SignalType

```typescript
enum SignalType {
  ENTRY = 'entry',           // 入场信号
  EXIT = 'exit',             // 出场信号
  REBALANCE = 'rebalance',   // 再平衡信号
  RISK = 'risk'              // 风险信号
}
```

### SignalStrength

```typescript
enum SignalStrength {
  WEAK = 1,      // 弱信号
  MEDIUM = 2,    // 中等信号
  STRONG = 3,    // 强信号
  VERY_STRONG = 4 // 非常强信号
}
```

### SignalTimeframe

```typescript
enum SignalTimeframe {
  SHORT_TERM = 'short_term',     // 短期
  MEDIUM_TERM = 'medium_term',   // 中期
  LONG_TERM = 'long_term'        // 长期
}
```

### SignalReliability

```typescript
enum SignalReliability {
  LOW = 1,       // 低可靠性
  MEDIUM = 2,    // 中等可靠性
  HIGH = 3,      // 高可靠性
  VERY_HIGH = 4  // 非常高可靠性
}
```

## 使用示例

### 订阅过滤后的信号

```javascript
// 订阅特定类型和池的信号
socket.emit('subscribe', {
  topic: 'signals',
  options: {
    signalTypes: ['entry'],
    poolAddresses: ['pool-1', 'pool-2'],
    minStrength: 2
  }
}, (response) => {
  if (response.success) {
    console.log('订阅成功，订阅 ID:', response.subscriptionId);
  } else {
    console.error('订阅失败:', response.error);
  }
});

// 监听过滤后的信号
socket.on('filtered_signals', (data) => {
  console.log('收到过滤后的信号:', data);
  // 处理信号...
});
```

### 取消订阅

```javascript
socket.emit('unsubscribe', { subscriptionId: 'sub_123456' }, (response) => {
  if (response.success) {
    console.log('取消订阅成功');
  } else {
    console.error('取消订阅失败:', response.error);
  }
});
```

### 获取当前订阅

```javascript
socket.emit('getSubscriptions', (response) => {
  if (response.success) {
    console.log('当前订阅:', response.subscriptions);
  } else {
    console.error('获取订阅失败:', response.error);
  }
});
```

## 错误处理

### 常见错误代码

| 错误消息 | 描述 | 解决方案 |
|---------|------|---------|
| `Client not found` | 客户端 ID 不存在 | 重新连接 WebSocket |
| `Authentication required` | 未进行认证 | 发送 `authenticate` 事件进行认证 |
| `Invalid API key` | API 密钥无效 | 检查 API 密钥是否正确 |
| `Subscription not found` | 订阅 ID 不存在 | 检查订阅 ID 是否正确 |

### 重连策略

当连接断开时，客户端应实现指数退避重连策略：

```javascript
let reconnectAttempts = 0;
const maxReconnectAttempts = 10;
const baseDelay = 1000; // 1秒

socket.on('disconnect', () => {
  console.log('连接断开，尝试重连...');
  
  if (reconnectAttempts < maxReconnectAttempts) {
    const delay = Math.min(30000, baseDelay * Math.pow(2, reconnectAttempts));
    reconnectAttempts++;
    
    setTimeout(() => {
      socket.connect();
    }, delay);
  } else {
    console.error('重连次数超过最大限制，停止重连');
  }
});

socket.on('connect', () => {
  reconnectAttempts = 0;
  // 重新认证和订阅...
});
```

## 性能考虑

- 避免订阅过多主题，以减少网络流量
- 使用具体的过滤条件，减少接收不必要的信号
- 实现适当的重连策略，避免频繁重连
- 处理信号的逻辑应该是非阻塞的，避免阻塞主线程

## 限制

- 每个客户端最多可以创建 10 个订阅
- 信号广播频率限制为每秒 10 条
- 连接空闲超过 30 分钟将被自动断开
- API 密钥每天最多允许 1000 次连接

## 更新日志

### v1.0.0 (2023-03-01)
- 初始版本发布

### v1.1.0 (2023-03-15)
- 添加信号过滤功能
- 添加心跳检测
- 改进错误处理

## 联系支持

如有任何问题或需要帮助，请联系：
- 邮箱: support@liqpro.ai
- 技术支持: https://support.liqpro.ai 