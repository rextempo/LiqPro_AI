import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWebSocket } from '../../../contexts/WebSocketContext';

// 定义Agent类型
export interface Agent {
  id: string;
  name: string;
  status: 'running' | 'observing' | 'stopped';
  balance: {
    sol: number;
    usd: number;
  };
  performance: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  createdAt: string;
  lastActive: string;
  riskLevel: number;
  healthScore: number;
}

// 模拟数据
const mockAgents: Agent[] = [
  {
    id: 'agent-1',
    name: 'Stable Growth Agent',
    status: 'running',
    balance: {
      sol: 10.5,
      usd: 1050.25
    },
    performance: {
      daily: 2.3,
      weekly: 5.7,
      monthly: 12.4
    },
    createdAt: '2025-02-15T08:30:00Z',
    lastActive: '2025-03-12T14:22:35Z',
    riskLevel: 2,
    healthScore: 4.8
  },
  {
    id: 'agent-2',
    name: 'High Yield Agent',
    status: 'observing',
    balance: {
      sol: 5.2,
      usd: 520.10
    },
    performance: {
      daily: -1.2,
      weekly: 8.3,
      monthly: 18.7
    },
    createdAt: '2025-02-20T10:15:00Z',
    lastActive: '2025-03-12T13:45:12Z',
    riskLevel: 4,
    healthScore: 3.5
  },
  {
    id: 'agent-3',
    name: 'Conservative Agent',
    status: 'stopped',
    balance: {
      sol: 3.8,
      usd: 380.00
    },
    performance: {
      daily: 0.5,
      weekly: 2.1,
      monthly: 6.8
    },
    createdAt: '2025-03-01T09:00:00Z',
    lastActive: '2025-03-10T16:30:45Z',
    riskLevel: 1,
    healthScore: 4.2
  }
];

// Agent状态标签组件
const StatusBadge: React.FC<{ status: Agent['status'] }> = ({ status }) => {
  const statusConfig = {
    running: {
      color: 'bg-green-100 text-green-800',
      label: '运行中'
    },
    observing: {
      color: 'bg-yellow-100 text-yellow-800',
      label: '观察中'
    },
    stopped: {
      color: 'bg-gray-100 text-gray-800',
      label: '已停止'
    }
  };

  const config = statusConfig[status];

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.color}`}>
      {config.label}
    </span>
  );
};

// 性能指标组件
const PerformanceIndicator: React.FC<{ value: number }> = ({ value }) => {
  const isPositive = value >= 0;
  const color = isPositive ? 'text-green-600' : 'text-red-600';
  const icon = isPositive ? '↑' : '↓';

  return (
    <span className={`font-medium ${color}`}>
      {icon} {Math.abs(value).toFixed(2)}%
    </span>
  );
};

// 健康分数组件
const HealthScore: React.FC<{ score: number }> = ({ score }) => {
  let color = 'bg-red-500';
  
  if (score >= 4) {
    color = 'bg-green-500';
  } else if (score >= 3) {
    color = 'bg-yellow-500';
  } else if (score >= 2) {
    color = 'bg-orange-500';
  }

  return (
    <div className="flex items-center">
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full`} style={{ width: `${(score / 5) * 100}%` }}></div>
      </div>
      <span className="ml-2 text-sm font-medium">{score.toFixed(1)}</span>
    </div>
  );
};

// Agent列表组件
const AgentList: React.FC = () => {
  const [agents, setAgents] = useState<Agent[]>(mockAgents);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [filter, setFilter] = useState<'all' | 'running' | 'observing' | 'stopped'>('all');
  const navigate = useNavigate();
  const { subscribe, unsubscribe } = useWebSocket();

  // 模拟从API获取Agent列表
  useEffect(() => {
    const fetchAgents = async () => {
      setIsLoading(true);
      try {
        // 在实际应用中，这里会调用API获取Agent列表
        // const response = await agentClient.getAgents();
        // setAgents(response.data);
        
        // 使用模拟数据
        setTimeout(() => {
          setAgents(mockAgents);
          setIsLoading(false);
        }, 500);
      } catch (error) {
        console.error('Failed to fetch agents:', error);
        setIsLoading(false);
      }
    };

    fetchAgents();
  }, []);

  // 订阅Agent状态更新
  useEffect(() => {
    const subscriptionId = subscribe('agent_updates', (data) => {
      // 在实际应用中，这里会处理WebSocket接收到的Agent更新
      console.log('Received agent update:', data);
      // 更新对应的Agent
      // setAgents(prevAgents => {
      //   return prevAgents.map(agent => 
      //     agent.id === data.agentId ? { ...agent, ...data.updates } : agent
      //   );
      // });
    });

    return () => {
      unsubscribe(subscriptionId);
    };
  }, [subscribe, unsubscribe]);

  // 过滤Agent列表
  const filteredAgents = filter === 'all' 
    ? agents 
    : agents.filter(agent => agent.status === filter);

  // 处理创建新Agent
  const handleCreateAgent = () => {
    navigate('/agent/create');
  };

  // 处理查看Agent详情
  const handleViewAgent = (agentId: string) => {
    navigate(`/agent/${agentId}`);
  };

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Agent管理</h2>
        <button
          onClick={handleCreateAgent}
          className="px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
        >
          创建新Agent
        </button>
      </div>

      {/* 过滤器 */}
      <div className="flex space-x-2 mb-4">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1 rounded-md ${
            filter === 'all' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => setFilter('running')}
          className={`px-3 py-1 rounded-md ${
            filter === 'running' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          运行中
        </button>
        <button
          onClick={() => setFilter('observing')}
          className={`px-3 py-1 rounded-md ${
            filter === 'observing' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-800'
          }`}
        >
          观察中
        </button>
        <button
          onClick={() => setFilter('stopped')}
          className={`px-3 py-1 rounded-md ${
            filter === 'stopped' ? 'bg-gray-100 text-gray-800 border border-gray-300' : 'bg-gray-100 text-gray-800'
          }`}
        >
          已停止
        </button>
      </div>

      {/* Agent列表 */}
      {isLoading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : filteredAgents.length === 0 ? (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <p className="text-gray-500">没有找到符合条件的Agent</p>
          <button
            onClick={handleCreateAgent}
            className="mt-4 px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            创建新Agent
          </button>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  资产价值
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  24小时收益
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  健康分数
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  风险等级
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAgents.map((agent) => (
                <tr 
                  key={agent.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleViewAgent(agent.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                    <div className="text-sm text-gray-500">ID: {agent.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={agent.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.balance.sol.toFixed(3)} SOL</div>
                    <div className="text-sm text-gray-500">${agent.balance.usd.toFixed(2)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <PerformanceIndicator value={agent.performance.daily} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <HealthScore score={agent.healthScore} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <div 
                          key={index}
                          className={`w-2 h-2 rounded-full mx-0.5 ${
                            index < agent.riskLevel ? 'bg-red-500' : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewAgent(agent.id);
                      }}
                      className="text-blue-600 hover:text-blue-900 mr-3"
                    >
                      查看
                    </button>
                    {agent.status === 'running' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // 在实际应用中，这里会调用API暂停Agent
                          console.log('Pause agent:', agent.id);
                        }}
                        className="text-yellow-600 hover:text-yellow-900"
                      >
                        暂停
                      </button>
                    )}
                    {agent.status === 'observing' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // 在实际应用中，这里会调用API启动Agent
                          console.log('Start agent:', agent.id);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        启动
                      </button>
                    )}
                    {agent.status === 'stopped' && (
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          // 在实际应用中，这里会调用API启动Agent
                          console.log('Start agent:', agent.id);
                        }}
                        className="text-green-600 hover:text-green-900"
                      >
                        启动
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default AgentList; 