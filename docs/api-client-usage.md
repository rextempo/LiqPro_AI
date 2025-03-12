# API客户端使用指南

本文档提供了LiqPro API客户端的使用示例和最佳实践，帮助开发人员快速集成和使用API功能。

## 目录

- [初始化](#初始化)
- [认证](#认证)
- [数据获取](#数据获取)
- [实时订阅](#实时订阅)
- [错误处理](#错误处理)
- [缓存控制](#缓存控制)
- [高级用法](#高级用法)

## 初始化

在应用启动时，需要初始化API客户端系统，这将设置认证状态并建立WebSocket连接：

```typescript
import { initApi } from '../api';

// 在应用入口点（如App.tsx）
useEffect(() => {
  // 初始化API客户端
  initApi().then(isAuthenticated => {
    if (isAuthenticated) {
      console.log('用户已认证，API客户端已初始化');
    } else {
      console.log('用户未认证，需要登录');
      // 重定向到登录页面
      navigate('/login');
    }
  });
}, []);
```

## 认证

### 钱包登录

使用钱包地址和签名进行登录：

```typescript
import { authClient, walletClient } from '../api';

// 在登录组件中
const handleWalletLogin = async (walletAddress: string) => {
  try {
    // 1. 获取签名消息
    const messageResponse = await walletClient.createSignatureMessage(walletAddress);

    if (!messageResponse.success) {
      throw new Error(messageResponse.error?.message || '获取签名消息失败');
    }

    // 2. 使用钱包签名消息（这里假设有一个wallet对象）
    const signature = await wallet.signMessage(
      new TextEncoder().encode(messageResponse.data.message)
    );

    // 3. 使用签名登录
    const loginResponse = await authClient.loginWithWallet(walletAddress, signature);

    if (loginResponse.success) {
      console.log('登录成功');
      // 重定向到仪表盘
      navigate('/dashboard');
    } else {
      throw new Error(loginResponse.error?.message || '登录失败');
    }
  } catch (error) {
    console.error('登录过程中出错:', error);
    // 显示错误消息
  }
};
```

### API密钥登录

使用API密钥进行登录：

```typescript
import { authClient } from '../api';

// 在API密钥登录组件中
const handleApiKeyLogin = async (apiKey: string) => {
  try {
    const response = await authClient.loginWithApiKey(apiKey);

    if (response.success) {
      console.log('API密钥登录成功');
      // 重定向到仪表盘
      navigate('/dashboard');
    } else {
      throw new Error(response.error?.message || 'API密钥登录失败');
    }
  } catch (error) {
    console.error('登录过程中出错:', error);
    // 显示错误消息
  }
};
```

### 登出

```typescript
import { authClient } from '../api';

// 在登出按钮点击处理函数中
const handleLogout = async () => {
  try {
    const response = await authClient.logout();

    if (response.success) {
      console.log('登出成功');
      // 重定向到登录页面
      navigate('/login');
    } else {
      throw new Error(response.error?.message || '登出失败');
    }
  } catch (error) {
    console.error('登出过程中出错:', error);
    // 显示错误消息
  }
};
```

## 数据获取

### 获取Agent列表

```typescript
import { useState, useEffect } from 'react';
import { agentClient } from '../api';
import { Agent } from '../api/types';

// 在Agent列表组件中
const AgentListComponent = () => {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgents = async () => {
      try {
        setLoading(true);
        const response = await agentClient.getAgents();

        if (response.success) {
          setAgents(response.data.items);
        } else {
          setError(response.error?.message || '获取Agent列表失败');
        }
      } catch (err) {
        setError('获取Agent列表时发生错误');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAgents();
  }, []);

  if (loading) return <div>加载中...</div>;
  if (error) return <div>错误: {error}</div>;

  return (
    <div>
      <h2>我的Agent</h2>
      {agents.length === 0 ? (
        <p>暂无Agent，请创建一个新的Agent</p>
      ) : (
        <ul>
          {agents.map(agent => (
            <li key={agent.id}>
              {agent.name} - {agent.status}
              <button onClick={() => navigate(`/agents/${agent.id}`)}>
                查看详情
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
```

### 获取市场数据

```typescript
import { useState, useEffect } from 'react';
import { marketClient } from '../api';
import { MarketData } from '../api/types';

// 在市场概览组件中
const MarketOverviewComponent = () => {
  const [marketData, setMarketData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchMarketData = async () => {
      try {
        setLoading(true);
        const response = await marketClient.getMarketOverview();

        if (response.success) {
          setMarketData(response.data);
        }
      } catch (err) {
        console.error('获取市场数据失败:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMarketData();

    // 每60秒刷新一次市场数据
    const intervalId = setInterval(fetchMarketData, 60000);

    return () => clearInterval(intervalId);
  }, []);

  if (loading && !marketData) return <div>加载市场数据...</div>;

  return (
    <div>
      <h2>市场概览</h2>
      {marketData && (
        <>
          <p>SOL价格: ${marketData.solPrice.toFixed(2)} ({marketData.solChange > 0 ? '+' : ''}{marketData.solChange.toFixed(2)}%)</p>
          <p>总锁仓量: ${marketData.totalValueLocked.toLocaleString()}</p>
          <p>24小时交易量: ${marketData.volume24h.toLocaleString()}</p>
        </>
      )}
    </div>
  );
};
```

### 获取钱包资产

```typescript
import { useState, useEffect } from 'react';
import { walletClient } from '../api';

// 在钱包资产组件中
const WalletAssetsComponent = ({ walletAddress }) => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        setLoading(true);
        const response = await walletClient.getWalletAssets(walletAddress);

        if (response.success) {
          setAssets(response.data);
        }
      } catch (err) {
        console.error('获取钱包资产失败:', err);
      } finally {
        setLoading(false);
      }
    };

    if (walletAddress) {
      fetchAssets();
    }
  }, [walletAddress]);

  if (!walletAddress) return <div>请先连接钱包</div>;
  if (loading) return <div>加载资产中...</div>;

  return (
    <div>
      <h2>我的资产</h2>
      <table>
        <thead>
          <tr>
            <th>代币</th>
            <th>数量</th>
            <th>价值 (USD)</th>
          </tr>
        </thead>
        <tbody>
          {assets.map(asset => (
            <tr key={asset.token}>
              <td>{asset.symbol}</td>
              <td>{asset.amount.toFixed(asset.decimals)}</td>
              <td>${asset.usdValue.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
```

## 实时订阅

### 订阅Agent更新

```typescript
import { useState, useEffect } from 'react';
import { agentClient } from '../api';
import { Agent } from '../api/types';

// 在Agent详情组件中
const AgentDetailComponent = ({ agentId }) => {
  const [agent, setAgent] = useState<Agent | null>(null);

  useEffect(() => {
    // 获取初始Agent数据
    const fetchAgent = async () => {
      const response = await agentClient.getAgent(agentId);
      if (response.success) {
        setAgent(response.data);
      }
    };

    fetchAgent();

    // 订阅Agent更新
    const subscriptionId = agentClient.subscribeToAgentUpdates(agentId);

    // 设置更新监听器
    agentClient.onAgentUpdate(subscriptionId, (updatedAgent) => {
      setAgent(updatedAgent);
    });

    // 设置状态变更监听器
    agentClient.onAgentStatusChange(subscriptionId, (data) => {
      if (data.agentId === agentId) {
        setAgent(prev => prev ? { ...prev, status: data.status } : null);
      }
    });

    // 清理函数
    return () => {
      agentClient.unsubscribeFromAgentUpdates(subscriptionId);
    };
  }, [agentId]);

  if (!agent) return <div>加载中...</div>;

  return (
    <div>
      <h2>{agent.name}</h2>
      <p>状态: {agent.status}</p>
      <p>资产价值: {agent.assetValueSOL.toFixed(3)} SOL (${agent.assetValueUSD.toFixed(2)})</p>
      <p>24小时收益率: {agent.yield24h.toFixed(2)}%</p>

      {/* 其他Agent详情 */}
    </div>
  );
};
```

### 订阅市场价格更新

```typescript
import { useState, useEffect } from 'react';
import { marketClient } from '../api';

// 在代币价格组件中
const TokenPriceComponent = ({ symbols = ['SOL', 'BTC', 'ETH'] }) => {
  const [prices, setPrices] = useState({});

  useEffect(() => {
    // 获取初始价格数据
    const fetchPrices = async () => {
      const response = await marketClient.getTokenPrices(symbols);
      if (response.success) {
        setPrices(response.data);
      }
    };

    fetchPrices();

    // 订阅价格更新
    const subscriptionId = marketClient.subscribeToMarketUpdates(symbols);

    // 设置价格更新监听器
    marketClient.onTokenPriceUpdate(subscriptionId, (data) => {
      setPrices(prev => ({
        ...prev,
        [data.symbol]: {
          price: data.price,
          change24h: data.change
        }
      }));
    });

    // 清理函数
    return () => {
      marketClient.unsubscribeFromMarketUpdates(subscriptionId);
    };
  }, [symbols.join(',')]);

  return (
    <div>
      <h3>代币价格</h3>
      <ul>
        {symbols.map(symbol => {
          const price = prices[symbol];
          return (
            <li key={symbol}>
              {symbol}: ${price?.price.toFixed(2)}
              {price?.change24h && (
                <span style={{ color: price.change24h >= 0 ? 'green' : 'red' }}>
                  ({price.change24h > 0 ? '+' : ''}{price.change24h.toFixed(2)}%)
                </span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
```

## 错误处理

### 统一错误处理

```typescript
import { ApiResponse } from '../api/types';

// 通用错误处理函数
const handleApiError = <T>(
  response: ApiResponse<T>,
  successCallback: (data: T) => void,
  errorCallback?: (message: string) => void
) => {
  if (response.success && response.data) {
    successCallback(response.data);
  } else {
    const errorMessage = response.error?.message || '操作失败';
    if (errorCallback) {
      errorCallback(errorMessage);
    } else {
      console.error(errorMessage);
      // 可以使用全局通知系统显示错误
      // notification.error({ message: errorMessage });
    }
  }
};

// 使用示例
const fetchData = async () => {
  try {
    const response = await agentClient.getAgents();

    handleApiError(
      response,
      data => {
        setAgents(data.items);
      },
      errorMessage => {
        setError(errorMessage);
      }
    );
  } catch (error) {
    setError('网络错误，请稍后重试');
  }
};
```

### 处理认证错误

API客户端已经内置了令牌刷新机制，但有时仍需要处理认证失败的情况：

```typescript
import { useState, useEffect } from 'react';
import { agentClient, authClient } from '../api';

// 在需要认证的组件中
const AuthenticatedComponent = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await agentClient.getAgents();

        if (!response.success && response.error?.code === 'unauthorized') {
          // 尝试刷新令牌
          const refreshResponse = await authClient.refreshToken();

          if (!refreshResponse.success) {
            // 刷新令牌失败，需要重新登录
            setIsAuthenticated(false);
            navigate('/login');
          }
        }
      } catch (error) {
        console.error('获取数据失败:', error);
      }
    };

    fetchData();
  }, []);

  if (!isAuthenticated) {
    return <div>认证已过期，请重新登录</div>;
  }

  // 组件正常渲染
  return <div>...</div>;
};
```

## 缓存控制

### 禁用缓存

对于需要实时数据的请求，可以禁用缓存：

```typescript
// 禁用缓存的请求
const fetchFreshData = async () => {
  const response = await poolClient.getPool(poolAddress, {
    cache: false,
  });

  if (response.success) {
    setPoolData(response.data);
  }
};
```

### 清除缓存

在某些操作后，可能需要清除缓存：

```typescript
// 在Agent操作后清除缓存
const startAgent = async agentId => {
  const response = await agentClient.startAgent(agentId);

  if (response.success) {
    // 清除特定Agent的缓存
    agentClient.clearAgentCache(agentId);

    // 或者清除所有Agent相关的缓存
    // agentClient.clearCache();
  }
};
```

## 高级用法

### 批量数据获取

同时获取多个相关数据：

```typescript
import { useState, useEffect } from 'react';
import { agentClient, poolClient, transactionClient } from '../api';

// 在仪表盘组件中
const DashboardComponent = () => {
  const [dashboardData, setDashboardData] = useState({
    agents: [],
    recommendedPools: [],
    recentTransactions: []
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);

        // 并行获取多个数据
        const [agentsResponse, poolsResponse, transactionsResponse] = await Promise.all([
          agentClient.getAgents(),
          poolClient.getRecommendedPools(5),
          transactionClient.getTransactions({ limit: 10 })
        ]);

        setDashboardData({
          agents: agentsResponse.success ? agentsResponse.data.items : [],
          recommendedPools: poolsResponse.success ? poolsResponse.data : [],
          recentTransactions: transactionsResponse.success ? transactionsResponse.data.items : []
        });
      } catch (error) {
        console.error('获取仪表盘数据失败:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) return <div>加载仪表盘数据...</div>;

  // 渲染仪表盘
  return (
    <div>
      {/* 仪表盘内容 */}
    </div>
  );
};
```

### 轮询数据更新

对于不支持WebSocket的环境，可以使用轮询获取更新：

```typescript
import { useState, useEffect } from 'react';
import { poolClient } from '../api';

// 在池价格组件中
const PoolPriceComponent = ({ poolAddress }) => {
  const [price, setPrice] = useState(null);

  useEffect(() => {
    const fetchPrice = async () => {
      const response = await poolClient.getPool(poolAddress);
      if (response.success) {
        // 假设池数据中包含价格信息
        setPrice(response.data.price);
      }
    };

    // 初始获取
    fetchPrice();

    // 设置轮询间隔
    const intervalId = setInterval(fetchPrice, 10000); // 每10秒更新一次

    return () => clearInterval(intervalId);
  }, [poolAddress]);

  return (
    <div>
      <h3>当前价格</h3>
      {price ? `$${price.toFixed(4)}` : '加载中...'}
    </div>
  );
};
```

### 组合使用HTTP和WebSocket

对于复杂场景，可以组合使用HTTP请求和WebSocket订阅：

```typescript
import { useState, useEffect } from 'react';
import { transactionClient } from '../api';
import { Transaction } from '../api/types';

// 在交易历史组件中
const TransactionHistoryComponent = ({ walletAddress }) => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 获取历史交易
    const fetchTransactions = async () => {
      setLoading(true);
      const response = await transactionClient.getTransactions({
        walletAddress,
        limit: 20
      });

      if (response.success) {
        setTransactions(response.data.items);
      }
      setLoading(false);
    };

    fetchTransactions();

    // 订阅新交易
    const subscriptionId = transactionClient.subscribeToTransactionUpdates(walletAddress);

    // 监听新交易
    transactionClient.onTransactionCreated(subscriptionId, (newTransaction) => {
      // 将新交易添加到列表顶部
      setTransactions(prev => [newTransaction, ...prev].slice(0, 20));
    });

    // 监听交易状态更新
    transactionClient.onTransactionStatusUpdate(subscriptionId, (update) => {
      // 更新交易状态
      setTransactions(prev =>
        prev.map(tx =>
          tx.id === update.id
            ? { ...tx, status: update.status }
            : tx
        )
      );
    });

    return () => {
      transactionClient.unsubscribeFromTransactionUpdates(subscriptionId);
    };
  }, [walletAddress]);

  return (
    <div>
      <h2>交易历史</h2>
      {loading && transactions.length === 0 ? (
        <div>加载交易历史...</div>
      ) : (
        <table>
          <thead>
            <tr>
              <th>时间</th>
              <th>类型</th>
              <th>状态</th>
              <th>金额</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map(tx => (
              <tr key={tx.id}>
                <td>{new Date(tx.timestamp).toLocaleString()}</td>
                <td>{tx.type}</td>
                <td>{tx.status}</td>
                <td>
                  {tx.tokens.map(token =>
                    `${token.amount.toFixed(4)} ${token.symbol}`
                  ).join(', ')}
                </td>
                <td>
                  <button onClick={() => window.open(`https://solscan.io/tx/${tx.txHash}`)}>
                    查看
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};
```

## 最佳实践

1. **使用React Hooks封装API调用**：创建自定义hooks简化API调用和状态管理
2. **实现统一的错误处理**：使用统一的错误处理函数处理API响应
3. **合理使用缓存**：对不常变化的数据启用缓存，对实时数据禁用缓存
4. **组合使用HTTP和WebSocket**：对初始数据使用HTTP请求，对实时更新使用WebSocket订阅
5. **清理订阅**：在组件卸载时取消WebSocket订阅
6. **并行请求**：使用Promise.all并行获取多个相关数据
7. **类型安全**：利用TypeScript类型定义确保类型安全

通过遵循这些最佳实践，您可以充分利用API客户端系统的功能，构建高性能、实时响应的用户界面。
