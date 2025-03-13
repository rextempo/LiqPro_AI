import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { agentApi, Agent as ApiAgent } from '../../api';
import config from '../../config/env';

// Extended Agent interface with additional UI-specific properties
interface Agent extends ApiAgent {
  description?: string;
  config?: Record<string, any>;
  metrics?: {
    successRate: number;
    executionCount: number;
    averageResponseTime: number;
  };
}

const AgentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentDetail = async () => {
      try {
        setLoading(true);
        // 使用真实API获取Agent详情
        const data = await agentApi.getAgentById(id || '');
        setAgent(data);
      } catch (err) {
        console.error('Error fetching agent details:', err);
        setError('Failed to load agent details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchAgentDetail();
  }, [id]);

  const getStatusBadge = (status: Agent['status']) => {
    switch (status) {
      case 'active':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">活跃</span>;
      case 'inactive':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">不活跃</span>;
      case 'error':
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">错误</span>;
      default:
        return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800">未知</span>;
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
          <h1 className="text-2xl font-bold">{agent.name}</h1>
          <div className="flex items-center mt-1">
            <span className="text-gray-500 mr-2">ID: {agent.id}</span>
            {getStatusBadge(agent.status)}
          </div>
        </div>
        <div className="flex space-x-2">
          <Link 
            to={`/agents/${agent.id}/controls`} 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            控制面板
          </Link>
          <Link 
            to={`/agents/${agent.id}/health`} 
            className="px-4 py-2 bg-purple-500 text-white rounded hover:bg-purple-600"
          >
            健康监控
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">基本信息</h3>
          <div className="space-y-2">
            <div>
              <span className="text-gray-500">类型:</span> {agent.type}
            </div>
            <div>
              <span className="text-gray-500">创建时间:</span> {agent.createdAt}
            </div>
            <div>
              <span className="text-gray-500">最后活跃:</span> {agent.lastActive}
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">性能指标</h3>
          <div className="space-y-2">
            <div>
              <span className="text-gray-500">成功率:</span> {agent.metrics?.successRate}%
            </div>
            <div>
              <span className="text-gray-500">执行次数:</span> {agent.metrics?.executionCount}
            </div>
            <div>
              <span className="text-gray-500">平均响应时间:</span> {agent.metrics?.averageResponseTime}ms
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">快速操作</h3>
          <div className="space-y-2">
            <button className="w-full px-3 py-2 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 mb-2">
              重启Agent
            </button>
            <button className="w-full px-3 py-2 bg-yellow-100 text-yellow-700 rounded hover:bg-yellow-200 mb-2">
              暂停Agent
            </button>
            <button className="w-full px-3 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200">
              删除Agent
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">描述</h3>
          <p className="text-gray-700">{agent.description}</p>
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">配置</h3>
          <pre className="bg-gray-50 p-3 rounded text-sm overflow-auto max-h-60">
            {JSON.stringify(agent.config, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default AgentDetail; 