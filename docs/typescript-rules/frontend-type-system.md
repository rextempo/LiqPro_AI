# LiqPro前端类型系统文档

## 概述

本文档详细说明了LiqPro前端应用的类型系统设计、常见类型错误及其解决方案。该文档旨在帮助开发团队理解项目的类型结构，避免常见的类型错误，并提供标准化的解决方案。

## 目录

1. [核心类型定义](#1-核心类型定义)
2. [组件类型规范](#2-组件类型规范)
3. [WebSocket类型系统](#3-websocket类型系统)
4. [常见类型错误及解决方案](#4-常见类型错误及解决方案)
5. [类型扩展最佳实践](#5-类型扩展最佳实践)
6. [类型安全检查清单](#6-类型安全检查清单)

## 1. 核心类型定义

### 1.1 API响应类型

所有API响应应遵循`ApiResponse<T>`接口，确保统一的错误处理和数据提取：

```typescript
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: ApiError;
  timestamp?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}
```

### 1.2 业务实体类型

核心业务实体类型定义在`api/types/index.ts`中，包括：

- **Agent**: 代理实例，包含状态、资产价值等信息
- **Pool**: 流动性池，包含代币对、TVL、APR等信息
- **Signal**: 交易信号，包含类型、强度、可靠性等信息
- **Transaction**: 交易记录，包含类型、状态、代币等信息
- **MarketData**: 市场数据，包含价格、交易量等信息

### 1.3 状态枚举类型

使用TypeScript枚举定义状态类型，确保类型安全和代码可读性：

```typescript
export enum AgentStatus {
  RUNNING = 'running',
  OBSERVING = 'observing',
  STOPPED = 'stopped',
}

export enum TransactionType {
  BUY = 'buy',
  SELL = 'sell',
  ADD_LIQUIDITY = 'add_liquidity',
  REMOVE_LIQUIDITY = 'remove_liquidity',
  SWAP = 'swap',
  HARVEST = 'harvest',
}

export enum TransactionStatus {
  CONFIRMED = 'confirmed',
  PENDING = 'pending',
  FAILED = 'failed',
}
```

### 1.4 更新类型

为实时更新定义的类型，用于WebSocket通信：

```typescript
export interface AgentUpdate {
  agentId: string;
  timestamp: string;
  status: AgentStatus;
  assetValueSOL: number;
  assetValueUSD: number;
  yield24h: number;
  yieldTrend: 'up' | 'down' | 'neutral';
  recentTransactions?: Transaction[];
  metadata?: Record<string, any>;
}

export interface PoolUpdate {
  poolAddress: string;
  timestamp: string;
  tvl: number;
  apr: number;
  volume24h: number;
  volumeChange: number;
  price0: number;
  price1: number;
  priceChange0: number;
  priceChange1: number;
  metadata?: Record<string, any>;
}

export interface MarketUpdate {
  symbol: string;
  timestamp: string;
  price: number;
  priceChange: number;
  volume24h: number;
  volumeChange: number;
  high24h: number;
  low24h: number;
  metadata?: Record<string, any>;
}
```

## 2. 组件类型规范

### 2.1 组件Props类型

所有组件Props应使用接口定义，并遵循以下命名规范：

```typescript
interface ComponentNameProps {
  // 必需属性
  requiredProp: string;
  // 可选属性
  optionalProp?: number;
  // 回调函数
  onSomething: (param: ParamType) => void;
  // 子组件
  children?: ReactNode;
}
```

### 2.2 通用类型定义

为常用的UI组件定义通用类型：

```typescript
// 时间范围类型
type TimeRangeType = '24h' | '7d' | '30d' | 'all';

// 趋势方向类型
type TrendDirection = 'up' | 'down' | 'neutral';

// 风险等级类型
type RiskLevel = 'low' | 'medium' | 'high';
```

### 2.3 组件状态类型

组件内部状态应明确定义类型：

```typescript
// 类组件状态
interface State {
  isLoading: boolean;
  data: DataType | null;
  error: Error | null;
}

// 函数组件状态
const [isLoading, setIsLoading] = useState<boolean>(false);
const [data, setData] = useState<DataType | null>(null);
const [error, setError] = useState<Error | null>(null);
```

## 3. WebSocket类型系统

### 3.1 WebSocket消息类型

```typescript
export interface WebSocketMessage<T = any> {
  type: string;
  data: T;
  timestamp: string;
}

export interface WebSocketSubscriptionOptions {
  topic: string;
  options?: Record<string, any>;
}
```

### 3.2 WebSocket事件类型

```typescript
export enum WebSocketEventType {
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  MESSAGE = 'message',
  ERROR = 'error',
  RECONNECT = 'reconnect',
  RECONNECT_ATTEMPT = 'reconnect_attempt',
  RECONNECT_ERROR = 'reconnect_error',
  RECONNECT_FAILED = 'reconnect_failed',
  SUBSCRIBE = 'subscribe',
  UNSUBSCRIBE = 'unsubscribe',
}

export enum WebSocketConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
}
```

### 3.3 WebSocket上下文类型

```typescript
interface WebSocketContextType {
  isConnected: boolean;
  isConnecting: boolean;
  signals: Signal[];
  agentUpdates: Record<string, AgentUpdate>;
  poolUpdates: Record<string, PoolUpdate>;
  marketUpdates: Record<string, MarketUpdate>;
  subscribeToSignals: (options?: any) => string;
  unsubscribeFromSignals: (subscriptionId: string) => void;
  subscribeToAgentUpdates: (agentId: string) => string;
  unsubscribeFromAgentUpdates: (subscriptionId: string) => void;
  subscribeToPoolUpdates: (poolAddress: string) => string;
  unsubscribeFromPoolUpdates: (subscriptionId: string) => void;
  subscribeToMarketUpdates: (symbols?: string[]) => string;
  unsubscribeFromMarketUpdates: (subscriptionId: string) => void;
  clearSignals: () => void;
}
```

## 4. 常见类型错误及解决方案

### 4.1 React Hooks在类组件中使用

**错误**：在类组件中使用React Hooks，违反了React Hooks规则。

**解决方案**：
1. 创建单独的函数组件处理需要使用Hooks的逻辑
2. 在类组件中使用这个函数组件
3. 或者将整个类组件重构为函数组件

```typescript
// 错误示例
class ErrorBoundary extends Component<Props, State> {
  render() {
    const bgColor = useColorModeValue('gray.50', 'gray.900'); // 错误：在类组件中使用Hook
    // ...
  }
}

// 正确示例
const ErrorFallback: React.FC<ErrorFallbackProps> = (props) => {
  const bgColor = useColorModeValue('gray.50', 'gray.900'); // 正确：在函数组件中使用Hook
  // ...
};

class ErrorBoundary extends Component<Props, State> {
  render() {
    if (this.state.hasError) {
      return <ErrorFallback {...fallbackProps} />; // 正确：使用函数组件
    }
    // ...
  }
}
```

### 4.2 类型不兼容错误

**错误**：传递给组件的props类型与组件期望的类型不匹配。

**解决方案**：
1. 使用类型断言（谨慎使用）
2. 创建适配器函数转换数据格式
3. 修改组件接口以接受更通用的类型

```typescript
// 错误示例
<AssetSummary
  timeRange={timeRange} // timeRange: string
  onTimeRangeChange={handleTimeRangeChange} // handleTimeRangeChange: (range: '24h' | '7d' | '30d' | 'all') => void
/>

// 正确示例 - 方法1：修改状态类型
const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');

// 正确示例 - 方法2：创建类型守卫
function isValidTimeRange(range: string): range is '24h' | '7d' | '30d' | 'all' {
  return ['24h', '7d', '30d', 'all'].includes(range);
}

const handleTimeRangeChange = (range: string) => {
  if (isValidTimeRange(range)) {
    setTimeRange(range);
  }
};
```

### 4.3 联合类型处理错误

**错误**：无法正确处理联合类型的属性访问。

**解决方案**：
1. 使用类型守卫函数区分不同类型
2. 使用可选链操作符（?.）安全访问属性
3. 使用类型断言（谨慎使用）

```typescript
// 定义联合类型
type GenericTransaction = Transaction | SimplifiedTransaction;

// 错误示例
transactions.filter(tx => tx.type === filter); // 错误：属性'type'在类型'GenericTransaction'上不存在

// 正确示例 - 使用类型守卫
const isSimplifiedTransaction = (tx: GenericTransaction): tx is SimplifiedTransaction => {
  return 'time' in tx && 'amount' in tx && 'impact' in tx;
};

// 正确使用
transactions.filter((tx: GenericTransaction) => {
  if (isSimplifiedTransaction(tx)) {
    return tx.type === filter;
  } else {
    return tx.type === filter;
  }
});
```

### 4.4 导入路径错误

**错误**：导入路径不正确，导致类型无法找到。

**解决方案**：
1. 使用正确的相对路径
2. 使用路径别名（需要在tsconfig.json中配置）
3. 创建索引文件（index.ts）统一导出

```typescript
// 错误示例
import { Signal, AgentUpdate } from '../api/types'; // 错误：找不到模块

// 正确示例
import { Signal, AgentUpdate } from '../api/types/index'; // 正确：指定完整路径

// 更好的方式 - 在api/index.ts中重新导出
// api/index.ts
export * from './types';

// 使用时
import { Signal, AgentUpdate } from '../api';
```

## 5. 类型扩展最佳实践

### 5.1 类型扩展而非重复定义

当需要扩展现有类型时，应使用交叉类型（&）而非重复定义：

```typescript
// 基础类型
interface BaseAgent {
  id: string;
  name: string;
  status: AgentStatus;
}

// 扩展类型 - 好的方式
interface DetailedAgent extends BaseAgent {
  performance: AgentPerformance;
}

// 或者使用交叉类型
type DetailedAgent = BaseAgent & {
  performance: AgentPerformance;
};

// 避免重复定义 - 不好的方式
interface DetailedAgent {
  id: string; // 重复定义
  name: string; // 重复定义
  status: AgentStatus; // 重复定义
  performance: AgentPerformance;
}
```

### 5.2 使用泛型增强类型复用

```typescript
// 分页响应泛型
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// 使用
const agentsResponse: PaginatedResponse<Agent> = await fetchAgents();
const poolsResponse: PaginatedResponse<Pool> = await fetchPools();
```

### 5.3 使用类型守卫函数

```typescript
// 类型守卫函数
function isAgent(obj: any): obj is Agent {
  return obj && typeof obj === 'object' && 'status' in obj && 'assetValueSOL' in obj;
}

// 使用
function processEntity(entity: Agent | Pool) {
  if (isAgent(entity)) {
    // 这里TypeScript知道entity是Agent类型
    console.log(entity.status);
  } else {
    // 这里TypeScript知道entity是Pool类型
    console.log(entity.tvl);
  }
}
```

## 6. 类型安全检查清单

在提交代码前，请确保：

- [ ] 所有组件Props都有明确的类型定义
- [ ] 所有状态变量都有明确的类型定义
- [ ] 所有API响应都使用`ApiResponse<T>`类型
- [ ] 不在类组件中使用React Hooks
- [ ] 使用类型守卫处理联合类型
- [ ] 避免使用`any`类型，除非绝对必要
- [ ] 所有回调函数都有明确的参数和返回值类型
- [ ] 所有异步函数都有明确的返回值类型（Promise<T>）
- [ ] 检查导入路径是否正确
- [ ] 运行TypeScript编译器检查（`tsc --noEmit`）确保无类型错误

---

本文档将随项目发展持续更新。如有任何问题或建议，请联系前端技术负责人。

最后更新日期：2025年3月12日 