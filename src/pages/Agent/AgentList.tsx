import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Agent, agentApi, useOptimizedApi, DataPreloader } from '../../api';

const AgentList: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive' | 'error'>('all');
  const navigate = useNavigate();
  
  // 获取预加载器实例
  const preloader = DataPreloader.getInstance();
  
  // 使用优化的API钩子获取Agent列表
  const { 
    loading, 
    data: agents = [], // 提供默认值为空数组
    error, 
    refresh 
  } = useOptimizedApi<Agent[]>(
    async () => {
      // 如果选择了"all"，则不传递status参数
      if (statusFilter === 'all') {
        return await agentApi.getAgents();
      }
      // 否则，传递选定的状态
      return await agentApi.getAgents(statusFilter);
    },
    {
      // 使用状态过滤器作为缓存键的一部分
      cacheKey: `agents-${statusFilter}`,
      // 缓存30秒
      cacheTTL: 30 * 1000,
      // 使用去重键避免重复请求
      deduplicateKey: `fetch-agents-${statusFilter}`,
      // 依赖于状态过滤器
      dependencies: [statusFilter],
      // 初始数据为空数组
      initialData: [] as Agent[],
      // 预加载其他状态的Agent列表
      preloadKeys: ['agents-active', 'agents-inactive', 'agents-error'],
      preloadFns: [
        () => agentApi.getAgents('active'),
        () => agentApi.getAgents('inactive'),
        () => agentApi.getAgents('error')
      ],
      preloadTTLs: [30 * 1000, 30 * 1000, 30 * 1000],
      preloadPriorities: ['medium', 'low', 'low']
    }
  );

  // 当用户查看Agent列表时，预加载Agent详情页可能需要的数据
  useEffect(() => {
    if (agents.length > 0) {
      // 预加载第一个Agent的详情
      const firstAgent = agents[0];
      if (firstAgent) {
        preloader.preloadHighPriority(
          `agent-${firstAgent.id}`,
          () => agentApi.getAgentById(firstAgent.id),
          60 * 1000 // 缓存1分钟
        );
        
        // 预加载第一个Agent的健康状态
        preloader.preloadMediumPriority(
          `agent-health-${firstAgent.id}`,
          () => agentApi.getAgentHealth(firstAgent.id),
          30 * 1000 // 缓存30秒
        );
        
        // 预加载第一个Agent的性能数据
        preloader.preloadLowPriority(
          `agent-performance-${firstAgent.id}-daily`,
          () => agentApi.getAgentPerformance(firstAgent.id, 'daily'),
          60 * 1000 // 缓存1分钟
        );
      }
    }
  }, [agents]);

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

  // 处理状态过滤器变化
  const handleStatusFilterChange = (status: 'all' | 'active' | 'inactive' | 'error') => {
    setStatusFilter(status);
  };
  
  // 处理点击Agent行
  const handleAgentClick = (agentId: string) => {
    // 预加载Agent详情页可能需要的数据
    preloader.preloadHighPriority(
      `agent-${agentId}`,
      () => agentApi.getAgentById(agentId),
      60 * 1000 // 缓存1分钟
    );
    
    // 预加载Agent健康状态
    preloader.preloadMediumPriority(
      `agent-health-${agentId}`,
      () => agentApi.getAgentHealth(agentId),
      30 * 1000 // 缓存30秒
    );
    
    // 预加载Agent性能数据
    preloader.preloadLowPriority(
      `agent-performance-${agentId}-daily`,
      () => agentApi.getAgentPerformance(agentId, 'daily'),
      60 * 1000 // 缓存1分钟
    );
    
    // 导航到Agent详情页
    navigate(`/agents/${agentId}`);
  };

  if (loading && agents.length === 0) {
    return (
      <div className="p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Agent管理</h1>
        </div>
        <div className="animate-pulse">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white p-4 rounded-lg shadow mb-4 h-20"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
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
              <p className="text-sm text-red-700">{error.message}</p>
            </div>
          </div>
        </div>
        <button 
          onClick={refresh} 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          重试
        </button>
      </div>
    );
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Agent管理</h1>
        <Link 
          to="/agents/create" 
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
          创建Agent
        </Link>
      </div>

      {/* 状态过滤器 */}
      <div className="mb-4 flex space-x-2">
        <button
          onClick={() => handleStatusFilterChange('all')}
          className={`px-3 py-1 rounded ${
            statusFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          全部
        </button>
        <button
          onClick={() => handleStatusFilterChange('active')}
          className={`px-3 py-1 rounded ${
            statusFilter === 'active' ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          活跃
        </button>
        <button
          onClick={() => handleStatusFilterChange('inactive')}
          className={`px-3 py-1 rounded ${
            statusFilter === 'inactive' ? 'bg-gray-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          不活跃
        </button>
        <button
          onClick={() => handleStatusFilterChange('error')}
          className={`px-3 py-1 rounded ${
            statusFilter === 'error' ? 'bg-red-500 text-white' : 'bg-gray-200 text-gray-700'
          }`}
        >
          错误
        </button>
      </div>

      {/* 加载指示器 */}
      {loading && agents.length > 0 && (
        <div className="mb-4 text-blue-500 flex items-center">
          <svg className="animate-spin -ml-1 mr-2 h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <span>更新中...</span>
        </div>
      )}

      {/* 空状态 */}
      {!loading && agents.length === 0 && (
        <div className="bg-white rounded-lg shadow p-6 text-center">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path>
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">没有Agent</h3>
          <p className="mt-1 text-sm text-gray-500">开始创建您的第一个Agent</p>
          <div className="mt-6">
            <Link
              to="/agents/create"
              className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              创建Agent
            </Link>
          </div>
        </div>
      )}

      {/* Agent列表 */}
      {agents.length > 0 && (
        <div className="bg-white shadow-md rounded-lg overflow-hidden">
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
                  类型
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  创建时间
                </th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  最后活跃
                </th>
                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {agents.map((agent) => (
                <tr 
                  key={agent.id} 
                  className="hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleAgentClick(agent.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{agent.name}</div>
                    <div className="text-sm text-gray-500">ID: {agent.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(agent.status)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.type}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.createdAt}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {agent.lastActive}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium" onClick={(e) => e.stopPropagation()}>
                    <Link to={`/agents/${agent.id}`} className="text-blue-600 hover:text-blue-900 mr-4">
                      详情
                    </Link>
                    <Link to={`/agents/${agent.id}/controls`} className="text-green-600 hover:text-green-900 mr-4">
                      控制
                    </Link>
                    <Link to={`/agents/${agent.id}/health`} className="text-purple-600 hover:text-purple-900">
                      健康
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 刷新按钮 */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={refresh}
          className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <svg className="mr-2 h-4 w-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path>
          </svg>
          刷新
        </button>
      </div>
    </div>
  );
};

export default AgentList; 