# TypeScript 类型安全和错误处理最佳实践

本文档提供了 LiqPro 项目中 TypeScript 类型安全和错误处理的最佳实践指南。

## 目录

1. [TypeScript 类型安全](#typescript-类型安全)
   - [避免使用 `any` 类型](#避免使用-any-类型)
   - [使用类型守卫](#使用类型守卫)
   - [使用泛型增强类型安全](#使用泛型增强类型安全)
   - [类型工具函数](#类型工具函数)
2. [错误处理最佳实践](#错误处理最佳实践)
   - [统一错误类型](#统一错误类型)
   - [错误处理模式](#错误处理模式)
   - [异步错误处理](#异步错误处理)
   - [重试机制](#重试机制)
3. [API 客户端和钩子](#api-客户端和钩子)
   - [增强型 API 客户端](#增强型-api-客户端)
   - [类型安全的 API 钩子](#类型安全的-api-钩子)
4. [迁移指南](#迁移指南)
   - [从 `any` 类型迁移](#从-any-类型迁移)
   - [改进错误处理](#改进错误处理)

## TypeScript 类型安全

### 避免使用 `any` 类型

`any` 类型绕过了 TypeScript 的类型检查，应该尽量避免使用。替代方案包括：

- 使用 `unknown` 类型作为未知类型的安全替代
- 使用 `Record<string, unknown>` 替代 `any` 类型的对象
- 使用具体的接口或类型定义

**不推荐：**

```typescript
function processData(data: any): any {
  return data.value;
}
```

**推荐：**

```typescript
interface DataItem {
  value: string;
}

function processData(data: DataItem): string {
  return data.value;
}
```

### 使用类型守卫

类型守卫是一种特殊的函数，用于在运行时检查值的类型，并在 TypeScript 中缩小类型范围。

```typescript
// 类型守卫示例
function isString(value: unknown): value is string {
  return typeof value === 'string';
}

function processValue(value: unknown): string {
  if (isString(value)) {
    // 在这个作用域内，TypeScript 知道 value 是 string 类型
    return value.toUpperCase();
  }
  return '';
}
```

我们提供了一组常用的类型守卫函数，位于 `libs/common/src/utils/type-utils.ts`：

- `isRecord`: 检查值是否为对象
- `isArrayOf`: 检查值是否为特定类型的数组
- `isString`: 检查值是否为字符串
- `isNumber`: 检查值是否为数字
- `isBoolean`: 检查值是否为布尔值
- `isDate`: 检查值是否为有效的日期对象

### 使用泛型增强类型安全

泛型允许我们创建可重用的组件，同时保持类型安全。

```typescript
// 泛型函数示例
function getFirstItem<T>(array: T[]): T | undefined {
  return array.length > 0 ? array[0] : undefined;
}

const numbers = [1, 2, 3];
const firstNumber = getFirstItem(numbers); // TypeScript 知道 firstNumber 的类型是 number | undefined

const strings = ['a', 'b', 'c'];
const firstString = getFirstItem(strings); // TypeScript 知道 firstString 的类型是 string | undefined
```

### 类型工具函数

我们提供了一组类型工具函数，位于 `libs/common/src/utils/type-utils.ts`：

- `assertNonNullable`: 确保值不为 null 或 undefined
- `getTypedProperty`: 安全地访问对象的属性，并进行类型检查
- `safeCast`: 安全地将值转换为特定类型
- `createTypedRecord`: 从未知属性的对象创建类型安全的记录
- `parseJSON`: 解析 JSON 并进行类型检查
- `ensureAllDefined`: 确保对象的所有属性都已定义
- `typedKeys`, `typedEntries`, `typedValues`: Object 方法的类型安全版本

## 错误处理最佳实践

### 统一错误类型

我们使用 `ServiceError` 类作为统一的错误类型，它包含以下信息：

- `type`: 错误类型（枚举值）
- `message`: 错误消息
- `code`: 错误代码（可选）
- `details`: 错误详情（可选）
- `source`: 错误来源（可选）
- `timestamp`: 错误发生时间
- `correlationId`: 关联 ID（可选）
- `statusCode`: HTTP 状态码（可选）
- `originalError`: 原始错误（可选）

```typescript
import { ServiceError, ErrorType } from '../../libs/common/src/utils/enhanced-error-handler';

// 创建错误
const error = new ServiceError({
  type: ErrorType.VALIDATION,
  message: '输入数据验证失败',
  code: 'INVALID_INPUT',
  details: { field: 'username', reason: 'required' }
});

// 从 HTTP 错误创建
try {
  await apiClient.get('/users');
} catch (error) {
  throw ServiceError.fromHttpError(error);
}
```

### 错误处理模式

我们推荐以下错误处理模式：

1. **早期验证**：尽早验证输入数据，避免在深层代码中处理错误
2. **明确错误类型**：使用 `ServiceError` 类和 `ErrorType` 枚举明确错误类型
3. **提供上下文**：在错误消息中提供足够的上下文信息
4. **集中处理**：在应用程序的边界处集中处理错误

```typescript
// 错误处理示例
try {
  const result = await processData(input);
  return result;
} catch (error) {
  if (error instanceof ServiceError) {
    // 已经是 ServiceError，可以直接使用
    logger.error('处理数据失败', { error: error.toJSON() });
    
    // 根据错误类型执行不同的操作
    switch (error.type) {
      case ErrorType.VALIDATION:
        // 处理验证错误
        break;
      case ErrorType.AUTHENTICATION:
        // 处理认证错误
        break;
      default:
        // 处理其他错误
        break;
    }
  } else {
    // 将未知错误转换为 ServiceError
    const serviceError = ServiceError.fromHttpError(error);
    logger.error('处理数据失败', { error: serviceError.toJSON() });
  }
  
  // 向用户显示友好的错误消息
  showErrorMessage(error instanceof ServiceError ? error.toUserFriendlyMessage() : '发生了一个错误，请稍后重试');
}
```

### 异步错误处理

我们提供了 `asyncErrorHandler` 函数，用于安全地处理异步函数中的错误：

```typescript
import { asyncErrorHandler } from '../../libs/common/src/utils/enhanced-error-handler';

// 原始异步函数
async function fetchData(id: string): Promise<Data> {
  // 可能抛出错误的代码
}

// 使用 asyncErrorHandler 包装
const safeFetchData = asyncErrorHandler(fetchData, (error) => {
  logger.error('获取数据失败', { id, error: error.message });
});

// 使用包装后的函数
try {
  const data = await safeFetchData('123');
  // 处理数据
} catch (error) {
  // 处理错误
}
```

### 重试机制

我们提供了 `withRetry` 函数，用于实现指数退避重试机制：

```typescript
import { withRetry } from '../../libs/common/src/utils/enhanced-error-handler';

// 使用重试机制
const result = await withRetry(
  async () => {
    // 可能失败的操作
    return await api.fetchData();
  },
  {
    maxRetries: 3,
    initialDelay: 1000,
    maxDelay: 10000,
    backoffFactor: 2,
    retryCondition: (error) => {
      // 只在特定条件下重试
      return error instanceof ServiceError && error.type === ErrorType.NETWORK;
    },
    onRetry: (attempt, error, delay) => {
      logger.warn(`重试操作 (${attempt}/3)`, { error: error.message, delay });
    }
  }
);
```

## API 客户端和钩子

### 增强型 API 客户端

我们提供了 `EnhancedApiClient` 类，它具有以下特性：

- 类型安全的请求和响应
- 统一的错误处理
- 自动重试机制
- 请求超时处理

```typescript
import { EnhancedApiClient } from '../api/clients/enhanced-api-client';

// 创建 API 客户端
const apiClient = new EnhancedApiClient();

// 发送请求
try {
  const response = await apiClient.get<User>('/users/123');
  const user = response.data;
  // 处理用户数据
} catch (error) {
  // 错误已经是 ServiceError 类型
  console.error('获取用户失败', error.toUserFriendlyMessage());
}
```

### 类型安全的 API 钩子

我们提供了 `useEnhancedApi` 和 `useEnhancedMutation` 钩子，用于在 React 组件中安全地调用 API：

```typescript
import { useEnhancedApi, useEnhancedMutation } from '../hooks/useEnhancedApi';

// 在组件中使用
function UserProfile({ userId }: { userId: string }) {
  // 获取用户数据
  const { data: user, loading, error, refresh } = useEnhancedApi<User>(
    `/users/${userId}`,
    {
      onSuccess: (data) => {
        console.log('用户数据加载成功', data);
      },
      onError: (error) => {
        console.error('加载用户数据失败', error.toUserFriendlyMessage());
      },
      ttl: 60000 // 缓存 60 秒
    }
  );

  // 更新用户数据
  const { mutate, loading: updating, error: updateError } = useEnhancedMutation<User, UserUpdateParams>(
    `/users/${userId}`,
    'PUT',
    {
      onSuccess: (data) => {
        console.log('用户数据更新成功', data);
      },
      onError: (error) => {
        console.error('更新用户数据失败', error.toUserFriendlyMessage());
      }
    }
  );

  // 处理表单提交
  const handleSubmit = async (data: UserUpdateParams) => {
    try {
      const updatedUser = await mutate(data);
      // 处理更新后的用户数据
    } catch (error) {
      // 错误已经在 onError 回调中处理
    }
  };

  // 渲染组件
  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.toUserFriendlyMessage()}</div>;
  if (!user) return <div>未找到用户</div>;

  return (
    <div>
      <h1>{user.name}</h1>
      <UserForm onSubmit={handleSubmit} initialData={user} />
      {updating && <div>更新中...</div>}
      {updateError && <div>更新错误: {updateError.toUserFriendlyMessage()}</div>}
    </div>
  );
}
```

## 迁移指南

### 从 `any` 类型迁移

1. 使用 `unknown` 替代 `any`，然后使用类型守卫缩小类型范围
2. 为 API 响应定义明确的接口或类型
3. 使用 `Record<string, unknown>` 替代 `Record<string, any>`
4. 使用类型工具函数安全地处理未知类型

### 改进错误处理

1. 使用 `ServiceError` 类替代普通的 `Error` 类
2. 使用 `ErrorType` 枚举明确错误类型
3. 使用 `asyncErrorHandler` 和 `withRetry` 函数增强错误处理
4. 使用 `EnhancedApiClient` 和 API 钩子替代现有的 API 客户端和钩子

### 示例：迁移 API 调用

**迁移前：**

```typescript
// 使用 any 类型
async function fetchUser(id: string): Promise<any> {
  try {
    const response = await axios.get(`/users/${id}`);
    return response.data;
  } catch (error) {
    console.error('获取用户失败', error);
    throw error;
  }
}
```

**迁移后：**

```typescript
// 定义类型
interface User {
  id: string;
  name: string;
  email: string;
}

// 使用增强型 API 客户端
async function fetchUser(id: string): Promise<User> {
  try {
    const response = await apiClient.get<User>(`/users/${id}`);
    return response.data;
  } catch (error) {
    // 错误已经是 ServiceError 类型
    logger.error('获取用户失败', { id, error: error instanceof ServiceError ? error.toJSON() : error });
    throw error instanceof ServiceError ? error : ServiceError.fromHttpError(error);
  }
}
```

### 示例：迁移 React 组件

**迁移前：**

```tsx
function UserList() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchUsers() {
      try {
        const response = await axios.get('/users');
        setUsers(response.data);
        setLoading(false);
      } catch (error) {
        setError(error as Error);
        setLoading(false);
      }
    }
    fetchUsers();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.message}</div>;

  return (
    <div>
      <h1>用户列表</h1>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
```

**迁移后：**

```tsx
interface User {
  id: string;
  name: string;
  email: string;
}

function UserList() {
  const { data: users, loading, error, refresh } = useEnhancedApi<User[]>('/users');

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error.toUserFriendlyMessage()}</div>;
  if (!users) return <div>未找到用户</div>;

  return (
    <div>
      <h1>用户列表</h1>
      <button onClick={refresh}>刷新</button>
      <ul>
        {users.map(user => (
          <li key={user.id}>{user.name}</li>
        ))}
      </ul>
    </div>
  );
}
``` 