import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../../hooks/useWebSocket';

// 定义Agent类型
interface Agent {
  id: string;
  name: string;
  status: 'active' | 'paused' | 'error';
  balance: number;
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
    allTime: number;
  };
  createdAt: string;
  lastActive: string;
  riskLevel: number;
  healthScore: number;
  description: string;
  autoRebalance: boolean;
  maxPositions: number;
  emergencyThreshold: number;
  positions: Position[];
  transactions: Transaction[];
}

// 定义仓位类型
interface Position {
  id: string;
  tokenPair: string;
  amount: number;
  value: number;
  entryPrice: number;
  currentPrice: number;
  profitLoss: number;
  profitLossPercentage: number;
  timestamp: string;
}

// 定义交易类型
interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'deposit' | 'withdraw';
  tokenPair: string;
  amount: number;
  price: number;
  value: number;
  timestamp: string;
  status: 'completed' | 'pending' | 'failed';
}

// 模拟数据
const mockAgent: Agent = {
  id: 'agent-123',
  name: '稳健增长策略',
  status: 'active',
  balance: 5.28,
  performance: {
    daily: 2.1,
    weekly: 5.8,
    monthly: 12.3,
    allTime: 24.7
  },
  createdAt: '2023-10-15T08:30:00Z',
  lastActive: '2023-11-02T14:22:35Z',
  riskLevel: 3,
  healthScore: 92,
  description: '这是一个专注于稳健增长的策略，主要投资于高流动性的LP池。',
  autoRebalance: true,
  maxPositions: 5,
  emergencyThreshold: 15,
  positions: [
    {
      id: 'pos-1',
      tokenPair: 'SOL/USDC',
      amount: 2.5,
      value: 250,
      entryPrice: 100,
      currentPrice: 105,
      profitLoss: 12.5,
      profitLossPercentage: 5,
      timestamp: '2023-10-20T10:15:00Z'
    },
    {
      id: 'pos-2',
      tokenPair: 'BTC/USDC',
      amount: 0.01,
      value: 300,
      entryPrice: 30000,
      currentPrice: 31500,
      profitLoss: 15,
      profitLossPercentage: 5,
      timestamp: '2023-10-22T09:30:00Z'
    },
    {
      id: 'pos-3',
      tokenPair: 'ETH/USDC',
      amount: 0.15,
      value: 270,
      entryPrice: 1800,
      currentPrice: 1750,
      profitLoss: -7.5,
      profitLossPercentage: -2.8,
      timestamp: '2023-10-25T11:45:00Z'
    }
  ],
  transactions: [
    {
      id: 'tx-1',
      type: 'buy',
      tokenPair: 'SOL/USDC',
      amount: 2.5,
      price: 100,
      value: 250,
      timestamp: '2023-10-20T10:15:00Z',
      status: 'completed'
    },
    {
      id: 'tx-2',
      type: 'buy',
      tokenPair: 'BTC/USDC',
      amount: 0.01,
      price: 30000,
      value: 300,
      timestamp: '2023-10-22T09:30:00Z',
      status: 'completed'
    },
    {
      id: 'tx-3',
      type: 'buy',
      tokenPair: 'ETH/USDC',
      amount: 0.15,
      price: 1800,
      value: 270,
      timestamp: '2023-10-25T11:45:00Z',
      status: 'completed'
    },
    {
      id: 'tx-4',
      type: 'deposit',
      tokenPair: 'SOL',
      amount: 5,
      price: 100,
      value: 500,
      timestamp: '2023-10-15T08:35:00Z',
      status: 'completed'
    }
  ]
};

// 状态标签组件
const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  const statusConfig = {
    active: { color: 'bg-green-100 text-green-800', text: '运行中' },
    paused: { color: 'bg-yellow-100 text-yellow-800', text: '已暂停' },
    error: { color: 'bg-red-100 text-red-800', text: '错误' }
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${config.color}`}>
      {config.text}
    </span>
  );
};

// 性能指标组件
const PerformanceIndicator: React.FC<{ label: string; value: number }> = ({ label, value }) => {
  const isPositive = value >= 0;
  const textColor = isPositive ? 'text-green-600' : 'text-red-600';
  const bgColor = isPositive ? 'bg-green-50' : 'bg-red-50';
  const sign = isPositive ? '+' : '';

  return (
    <div className={`p-3 rounded-lg ${bgColor}`}>
      <p className="text-sm text-gray-500">{label}</p>
      <p className={`text-lg font-semibold ${textColor}`}>
        {sign}{value.toFixed(2)}%
      </p>
    </div>
  );
};

// 健康分数组件
const HealthScore: React.FC<{ score: number }> = ({ score }) => {
  let color = 'text-red-600';
  if (score >= 80) {
    color = 'text-green-600';
  } else if (score >= 50) {
    color = 'text-yellow-600';
  }

  return (
    <div className="flex items-center">
      <div className="relative w-full h-2 bg-gray-200 rounded-full">
        <div 
          className={`absolute top-0 left-0 h-2 rounded-full ${
            score >= 80 ? 'bg-green-500' : score >= 50 ? 'bg-yellow-500' : 'bg-red-500'
          }`}
          style={{ width: `${score}%` }}
        ></div>
      </div>
      <span className={`ml-2 text-sm font-medium ${color}`}>{score}</span>
    </div>
  );
};

// 风险等级组件
const RiskLevel: React.FC<{ level: number }> = ({ level }) => {
  const maxLevel = 5;
  const dots = [];

  for (let i = 1; i <= maxLevel; i++) {
    dots.push(
      <div 
        key={i}
        className={`w-2 h-2 rounded-full mx-0.5 ${
          i <= level ? 'bg-blue-600' : 'bg-gray-300'
        }`}
      ></div>
    );
  }

  return (
    <div className="flex items-center">
      {dots}
      <span className="ml-2 text-sm text-gray-600">
        {level === 1 ? '极低' : 
         level === 2 ? '低' : 
         level === 3 ? '中等' : 
         level === 4 ? '高' : '极高'}
      </span>
    </div>
  );
};

// 交易历史表格组件
const TransactionHistory: React.FC<{ transactions: Transaction[] }> = ({ transactions }) => {
  const typeConfig = {
    buy: { text: '买入', color: 'text-green-600' },
    sell: { text: '卖出', color: 'text-red-600' },
    deposit: { text: '存入', color: 'text-blue-600' },
    withdraw: { text: '提取', color: 'text-orange-600' }
  };

  const statusConfig = {
    completed: { text: '已完成', color: 'text-green-600' },
    pending: { text: '处理中', color: 'text-yellow-600' },
    failed: { text: '失败', color: 'text-red-600' }
  };

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              类型
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              交易对
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              数量
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              价格
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              价值
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              时间
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {transactions.map((tx) => (
            <tr key={tx.id}>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`${typeConfig[tx.type].color} font-medium`}>
                  {typeConfig[tx.type].text}
                </span>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {tx.tokenPair}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {tx.amount}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                ${tx.price.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                ${tx.value.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {new Date(tx.timestamp).toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`${statusConfig[tx.status].color}`}>
                  {statusConfig[tx.status].text}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// 仓位列表组件
const PositionsList: React.FC<{ positions: Position[] }> = ({ positions }) => {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              交易对
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              数量
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              价值
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              入场价
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              当前价
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              盈亏
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {positions.map((position) => (
            <tr key={position.id}>
              <td className="px-6 py-4 whitespace-nowrap font-medium text-gray-900">
                {position.tokenPair}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                {position.amount}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                ${position.value.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                ${position.entryPrice.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                ${position.currentPrice.toLocaleString()}
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={position.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {position.profitLoss >= 0 ? '+' : ''}{position.profitLossPercentage.toFixed(2)}%
                  (${position.profitLoss.toLocaleString()})
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

// Agent详情组件
const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'positions' | 'transactions'>('positions');
  const { lastMessage } = useWebSocket('ws://localhost:8080');

  // 模拟获取Agent数据
  useEffect(() => {
    const fetchAgent = async () => {
      try {
        // 在实际应用中，这里会调用API获取Agent数据
        // const response = await agentClient.getAgentById(id);
        
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 使用模拟数据
        setAgent(mockAgent);
      } catch (error) {
        console.error('Failed to fetch agent:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAgent();
  }, [id]);

  // 处理WebSocket消息更新
  useEffect(() => {
    if (lastMessage && agent) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // 如果消息与当前Agent相关，则更新数据
        if (data.agentId === agent.id) {
          setAgent(prevAgent => {
            if (!prevAgent) return null;
            
            return {
              ...prevAgent,
              ...data.updates
            };
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, agent]);

  // 处理暂停/恢复Agent
  const handleTogglePause = async () => {
    if (!agent) return;
    
    try {
      const newStatus = agent.status === 'active' ? 'paused' : 'active';
      
      // 在实际应用中，这里会调用API更新Agent状态
      // await agentClient.updateAgentStatus(agent.id, newStatus);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 更新本地状态
      setAgent(prevAgent => {
        if (!prevAgent) return null;
        
        return {
          ...prevAgent,
          status: newStatus as Agent['status']
        };
      });
    } catch (error) {
      console.error('Failed to update agent status:', error);
      alert('操作失败，请重试');
    }
  };

  // 处理删除Agent
  const handleDelete = async () => {
    if (!agent) return;
    
    if (!window.confirm('确定要删除这个Agent吗？此操作不可撤销。')) {
      return;
    }
    
    try {
      // 在实际应用中，这里会调用API删除Agent
      // await agentClient.deleteAgent(agent.id);
      
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // 重定向到Agent列表页面
      navigate('/agents');
    } catch (error) {
      console.error('Failed to delete agent:', error);
      alert('删除失败，请重试');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-800">未找到Agent</h2>
        <p className="text-gray-600 mt-2">找不到ID为 {id} 的Agent</p>
        <button
          onClick={() => navigate('/agents')}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          返回Agent列表
        </button>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Agent头部信息 */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div className="flex items-center">
            <h2 className="text-2xl font-bold text-gray-800">{agent.name}</h2>
            <div className="ml-3">
              <StatusBadge status={agent.status} />
            </div>
          </div>
          
          <div className="flex space-x-3 mt-4 md:mt-0">
            <button
              onClick={handleTogglePause}
              className={`px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                agent.status === 'active'
                  ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                  : 'bg-green-100 text-green-800 hover:bg-green-200'
              }`}
            >
              {agent.status === 'active' ? '暂停' : '恢复'}
            </button>
            <button
              onClick={() => navigate(`/agents/${agent.id}/edit`)}
              className="px-4 py-2 bg-blue-100 text-blue-800 rounded-md hover:bg-blue-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              编辑
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              删除
            </button>
          </div>
        </div>
        
        <p className="text-gray-600 mt-2">{agent.description}</p>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-500">当前余额</p>
            <p className="text-xl font-bold text-gray-800">{agent.balance.toFixed(2)} SOL</p>
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">健康分数</p>
            <HealthScore score={agent.healthScore} />
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">风险等级</p>
            <RiskLevel level={agent.riskLevel} />
          </div>
          
          <div>
            <p className="text-sm text-gray-500 mb-1">创建时间</p>
            <p className="text-sm text-gray-800">{new Date(agent.createdAt).toLocaleString()}</p>
            <p className="text-sm text-gray-500 mt-1">最后活动</p>
            <p className="text-sm text-gray-800">{new Date(agent.lastActive).toLocaleString()}</p>
          </div>
        </div>
      </div>
      
      {/* 性能指标 */}
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-800 mb-4">性能指标</h3>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <PerformanceIndicator label="今日" value={agent.performance.daily} />
          <PerformanceIndicator label="本周" value={agent.performance.weekly} />
          <PerformanceIndicator label="本月" value={agent.performance.monthly} />
          <PerformanceIndicator label="总计" value={agent.performance.allTime} />
        </div>
      </div>
      
      {/* 标签页切换 */}
      <div className="border-b border-gray-200">
        <nav className="flex">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === 'positions'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            当前仓位
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-6 py-4 text-sm font-medium ${
              activeTab === 'transactions'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            交易历史
          </button>
        </nav>
      </div>
      
      {/* 标签页内容 */}
      <div className="p-6">
        {activeTab === 'positions' ? (
          agent.positions.length > 0 ? (
            <PositionsList positions={agent.positions} />
          ) : (
            <p className="text-center text-gray-500 py-8">当前没有活跃仓位</p>
          )
        ) : (
          agent.transactions.length > 0 ? (
            <TransactionHistory transactions={agent.transactions} />
          ) : (
            <p className="text-center text-gray-500 py-8">暂无交易记录</p>
          )
        )}
      </div>
    </div>
  );
};

export default AgentDetail; 