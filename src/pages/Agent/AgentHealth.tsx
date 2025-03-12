import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

interface Agent {
  id: string;
  name: string;
  status: 'active' | 'inactive' | 'error';
}

interface HealthMetrics {
  cpu: number;
  memory: number;
  responseTime: number[];
  successRate: number[];
  errorRate: number[];
  lastUpdated: string;
}

const AgentHealth: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [agent, setAgent] = useState<Agent | null>(null);
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');

  useEffect(() => {
    const fetchAgentHealth = async () => {
      try {
        setLoading(true);
        // 实际项目中，这里应该是一个API调用
        // const response = await fetch(`/api/agents/${id}/health?timeRange=${timeRange}`);
        // const data = await response.json();
        
        // 模拟数据
        const mockAgent: Agent = {
          id: id || '1',
          name: 'LP监控Agent',
          status: 'active'
        };
        
        // 生成模拟的时间序列数据
        const generateTimeSeriesData = (base: number, variance: number, length: number) => {
          return Array.from({ length }, () => base + (Math.random() * variance * 2 - variance));
        };
        
        const mockMetrics: HealthMetrics = {
          cpu: 35 + Math.random() * 20,
          memory: 42 + Math.random() * 15,
          responseTime: generateTimeSeriesData(250, 100, 24),
          successRate: generateTimeSeriesData(95, 5, 24),
          errorRate: generateTimeSeriesData(3, 3, 24),
          lastUpdated: new Date().toLocaleString()
        };
        
        // 模拟网络延迟
        setTimeout(() => {
          setAgent(mockAgent);
          setMetrics(mockMetrics);
          setLoading(false);
        }, 800);
      } catch (err) {
        setError('获取Agent健康数据失败');
        setLoading(false);
        console.error('Error fetching agent health:', err);
      }
    };

    if (id) {
      fetchAgentHealth();
    } else {
      setError('Agent ID不存在');
      setLoading(false);
    }
  }, [id, timeRange]);

  const getStatusColor = (value: number, thresholds: [number, number]) => {
    const [warning, critical] = thresholds;
    if (value >= critical) return 'text-red-500';
    if (value >= warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const renderMetricCard = (title: string, value: number | string, unit: string, thresholds?: [number, number]) => {
    const colorClass = typeof value === 'number' && thresholds ? getStatusColor(value, thresholds) : '';
    
    return (
      <div className="bg-white p-4 rounded-lg shadow">
        <h3 className="text-sm font-medium text-gray-500 mb-1">{title}</h3>
        <div className={`text-2xl font-bold ${colorClass}`}>
          {typeof value === 'number' ? value.toFixed(1) : value} {unit}
        </div>
      </div>
    );
  };

  // 简单的图表组件（实际项目中应使用专业图表库如Chart.js或Recharts）
  const SimpleChart = ({ data, label, color }: { data: number[], label: string, color: string }) => {
    const max = Math.max(...data);
    const min = Math.min(...data);
    const range = max - min;
    
    return (
      <div className="mt-2">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>{label}</span>
          <span>平均: {(data.reduce((a, b) => a + b, 0) / data.length).toFixed(1)}</span>
        </div>
        <div className="h-16 flex items-end">
          {data.map((value, index) => {
            const height = range === 0 ? 50 : ((value - min) / range) * 100;
            return (
              <div 
                key={index}
                className={`w-full mx-px ${color}`}
                style={{ height: `${Math.max(5, height)}%` }}
              />
            );
          })}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (error || !agent || !metrics) {
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
          <h1 className="text-2xl font-bold">{agent.name} - 健康监控</h1>
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
            to={`/agents/${agent.id}/controls`} 
            className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            控制面板
          </Link>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">健康指标</h2>
          <div className="flex bg-gray-100 rounded-lg p-1">
            {(['1h', '24h', '7d', '30d'] as const).map(range => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={`px-3 py-1 text-sm rounded-md ${
                  timeRange === range 
                    ? 'bg-white shadow-sm text-blue-600' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          最后更新: {metrics.lastUpdated}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {renderMetricCard('CPU 使用率', metrics.cpu, '%', [70, 90])}
        {renderMetricCard('内存使用率', metrics.memory, '%', [80, 95])}
        {renderMetricCard('平均响应时间', metrics.responseTime.reduce((a, b) => a + b, 0) / metrics.responseTime.length, 'ms', [500, 1000])}
        {renderMetricCard('成功率', metrics.successRate.reduce((a, b) => a + b, 0) / metrics.successRate.length, '%')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">响应时间 (ms)</h3>
          <SimpleChart 
            data={metrics.responseTime} 
            label="响应时间" 
            color="bg-blue-400" 
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-2">成功率 (%)</h3>
          <SimpleChart 
            data={metrics.successRate} 
            label="成功率" 
            color="bg-green-400" 
          />
        </div>
      </div>

      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-2">错误率 (%)</h3>
        <SimpleChart 
          data={metrics.errorRate} 
          label="错误率" 
          color="bg-red-400" 
        />
      </div>

      <div className="mt-6 bg-white p-4 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">健康状态评估</h3>
        <div className="flex items-center mb-4">
          <div className={`w-3 h-3 rounded-full ${
            metrics.cpu > 90 || metrics.memory > 95 || 
            (metrics.successRate.reduce((a, b) => a + b, 0) / metrics.successRate.length) < 90
              ? 'bg-red-500'
              : metrics.cpu > 70 || metrics.memory > 80 || 
                (metrics.successRate.reduce((a, b) => a + b, 0) / metrics.successRate.length) < 95
                ? 'bg-yellow-500'
                : 'bg-green-500'
          } mr-2`}></div>
          <span className="font-medium">
            {
              metrics.cpu > 90 || metrics.memory > 95 || 
              (metrics.successRate.reduce((a, b) => a + b, 0) / metrics.successRate.length) < 90
                ? '危险'
                : metrics.cpu > 70 || metrics.memory > 80 || 
                  (metrics.successRate.reduce((a, b) => a + b, 0) / metrics.successRate.length) < 95
                  ? '警告'
                  : '健康'
            }
          </span>
        </div>
        <p className="text-gray-700">
          {
            metrics.cpu > 90 || metrics.memory > 95
              ? 'Agent资源使用率过高，可能导致性能下降或崩溃。建议检查Agent配置或增加资源分配。'
              : (metrics.successRate.reduce((a, b) => a + b, 0) / metrics.successRate.length) < 90
                ? 'Agent成功率过低，可能存在连接问题或逻辑错误。建议检查日志并排查问题。'
                : metrics.cpu > 70 || metrics.memory > 80
                  ? 'Agent资源使用率较高，但仍在可接受范围内。建议关注资源使用趋势。'
                  : 'Agent运行状态良好，所有指标均在正常范围内。'
          }
        </p>
      </div>
    </div>
  );
};

export default AgentHealth; 