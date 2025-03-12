import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
  type: string;
  config: Record<string, any>;
}

interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  message: string;
}

const AgentControls: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRestarting, setIsRestarting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [configEdit, setConfigEdit] = useState('');
  const [configError, setConfigError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      try {
        setLoading(true);
        // 实际项目中，这里应该是一个API调用
        // const response = await fetch(`/api/agents/${id}`);
        // const data = await response.json();
        
        // 模拟数据
        const mockAgent: Agent = {
          id: id || '1',
          name: 'LP监控Agent',
          status: 'active',
          type: '监控',
          config: {
            interval: 5000,
            threshold: 0.5,
            alertEndpoints: ['email', 'slack'],
            pools: ['SOL/USDC', 'ETH/USDC']
          }
        };
        
        const mockLogs: LogEntry[] = [
          {
            id: '1',
            timestamp: '2025-03-12 14:30:00',
            level: 'info',
            message: 'Agent started successfully'
          },
          {
            id: '2',
            timestamp: '2025-03-12 14:31:05',
            level: 'info',
            message: 'Checking pool SOL/USDC'
          },
          {
            id: '3',
            timestamp: '2025-03-12 14:31:10',
            level: 'warning',
            message: 'Pool liquidity below threshold (0.45)'
          },
          {
            id: '4',
            timestamp: '2025-03-12 14:32:05',
            level: 'info',
            message: 'Checking pool ETH/USDC'
          },
          {
            id: '5',
            timestamp: '2025-03-12 14:32:15',
            level: 'error',
            message: 'Failed to fetch pool data: API timeout'
          },
          {
            id: '6',
            timestamp: '2025-03-12 14:33:00',
            level: 'info',
            message: 'Retrying connection to pool ETH/USDC'
          }
        ];
        
        // 模拟网络延迟
        setTimeout(() => {
          setAgent(mockAgent);
          setLogs(mockLogs);
          setConfigEdit(JSON.stringify(mockAgent.config, null, 2));
          setLoading(false);
        }, 800);
      } catch (err) {
        setError('获取Agent数据失败');
        setLoading(false);
        console.error('Error fetching agent data:', err);
      }
    };

    if (id) {
      fetchAgentData();
    } else {
      setError('Agent ID不存在');
      setLoading(false);
    }
  }, [id]);

  const handleRestart = async () => {
    setIsRestarting(true);
    try {
      // 实际项目中，这里应该是一个API调用
      // await fetch(`/api/agents/${id}/restart`, { method: 'POST' });
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 模拟成功响应
      console.log('Agent restarted successfully');
      
      // 更新状态
      if (agent) {
        setAgent({ ...agent, status: 'active' });
      }
      
      // 添加新日志
      const newLog: LogEntry = {
        id: String(Date.now()),
        timestamp: new Date().toLocaleString(),
        level: 'info',
        message: 'Agent restarted successfully'
      };
      setLogs(prevLogs => [newLog, ...prevLogs]);
    } catch (err) {
      console.error('Error restarting agent:', err);
      alert('重启Agent失败，请重试');
    } finally {
      setIsRestarting(false);
    }
  };

  const handlePause = async () => {
    setIsPausing(true);
    try {
      // 实际项目中，这里应该是一个API调用
      // await fetch(`/api/agents/${id}/pause`, { method: 'POST' });
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟成功响应
      console.log('Agent paused successfully');
      
      // 更新状态
      if (agent) {
        setAgent({ ...agent, status: 'inactive' });
      }
      
      // 添加新日志
      const newLog: LogEntry = {
        id: String(Date.now()),
        timestamp: new Date().toLocaleString(),
        level: 'info',
        message: 'Agent paused by user'
      };
      setLogs(prevLogs => [newLog, ...prevLogs]);
    } catch (err) {
      console.error('Error pausing agent:', err);
      alert('暂停Agent失败，请重试');
    } finally {
      setIsPausing(false);
    }
  };

  const handleConfigChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setConfigEdit(e.target.value);
    setConfigError(null);
  };

  const handleSaveConfig = async () => {
    try {
      // 验证JSON格式
      const configObj = JSON.parse(configEdit);
      
      // 实际项目中，这里应该是一个API调用
      // await fetch(`/api/agents/${id}/config`, {
      //   method: 'PUT',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(configObj)
      // });
      
      // 模拟网络延迟
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 模拟成功响应
      console.log('Agent config updated successfully', configObj);
      
      // 更新状态
      if (agent) {
        setAgent({ ...agent, config: configObj });
      }
      
      // 添加新日志
      const newLog: LogEntry = {
        id: String(Date.now()),
        timestamp: new Date().toLocaleString(),
        level: 'info',
        message: 'Agent configuration updated'
      };
      setLogs(prevLogs => [newLog, ...prevLogs]);
      
      alert('配置已更新');
    } catch (err) {
      console.error('Error updating config:', err);
      setConfigError('配置必须是有效的JSON格式');
    }
  };

  const getLogBadge = (level: LogEntry['level']) => {
    switch (level) {
      case 'info':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">INFO</span>;
      case 'warning':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">WARNING</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">ERROR</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">UNKNOWN</span>;
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="h-32 bg-gray-200 rounded mb-6"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !agent) {
    return (
      <div className="p-4">
        <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-red-700">{error || 'Agent不存在'}</p>
            </div>
          </div>
        </div>
        <Link to="/agents" className="text-blue-500 hover:underline">
          返回Agent列表
        </Link>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{agent.name} - 控制面板</h1>
          <div className="flex items-center mt-1">
            <span className="text-gray-500 mr-2">ID: {agent.id}</span>
            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
              agent.status === 'active' ? 'bg-green-100 text-green-800' : 
              agent.status === 'inactive' ? 'bg-gray-100 text-gray-800' : 
              'bg-red-100 text-red-800'
            }`}>
              {agent.status === 'active' ? '活跃' : 
               agent.status === 'inactive' ? '不活跃' : '错误'}
            </span>
          </div>
        </div>
        <div className="flex space-x-2">
          <Link 
            to={`/agents/${agent.id}`} 
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            详情
          </Link>
          <Link 
            to={`/agents/${agent.id}/health`} 
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            健康监控
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <div className="bg-white p-4 rounded-lg shadow mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">控制操作</h3>
            <div className="flex flex-wrap gap-2">
              <button 
                onClick={handleRestart}
                disabled={isRestarting}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 flex items-center"
              >
                {isRestarting && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isRestarting ? '重启中...' : '重启Agent'}
              </button>
              <button 
                onClick={handlePause}
                disabled={isPausing || agent.status === 'inactive'}
                className="px-4 py-2 bg-yellow-500 text-white rounded hover:bg-yellow-600 disabled:opacity-50 flex items-center"
              >
                {isPausing && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                )}
                {isPausing ? '暂停中...' : '暂停Agent'}
              </button>
              <button className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600">
                删除Agent
              </button>
            </div>
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h3 className="text-lg font-medium text-gray-900 mb-4">配置编辑</h3>
            <div className="mb-4">
              <textarea
                value={configEdit}
                onChange={handleConfigChange}
                rows={10}
                className={`w-full px-3 py-2 border rounded-md font-mono text-sm ${configError ? 'border-red-500' : 'border-gray-300'}`}
              />
              {configError && <p className="mt-1 text-sm text-red-500">{configError}</p>}
            </div>
            <div className="flex justify-end">
              <button 
                onClick={handleSaveConfig}
                className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
              >
                保存配置
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Agent日志</h3>
          <div className="overflow-auto max-h-96">
            {logs.length > 0 ? (
              <table className="min-w-full">
                <thead>
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">时间</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">级别</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">消息</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {logs.map(log => (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                        {log.timestamp}
                      </td>
                      <td className="px-4 py-2 whitespace-nowrap">
                        {getLogBadge(log.level)}
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-900">
                        {log.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-500 text-center py-4">暂无日志</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AgentControls; 