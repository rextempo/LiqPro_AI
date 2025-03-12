import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../../../hooks/useWebSocket';

// 定义健康指标类型
interface HealthMetrics {
  healthScore: number;
  uptime: number; // 以小时为单位
  lastSyncTime: string;
  errorRate: number; // 百分比
  memoryUsage: number; // 百分比
  cpuUsage: number; // 百分比
  responseTime: number; // 毫秒
  activePositions: number;
  pendingTransactions: number;
  alerts: Alert[];
  performanceHistory: PerformancePoint[];
}

// 定义警报类型
interface Alert {
  id: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

// 定义性能历史点
interface PerformancePoint {
  timestamp: string;
  healthScore: number;
}

// 定义组件属性
interface HealthDashboardProps {
  agentId: string;
  onAcknowledgeAlert: (alertId: string) => Promise<void>;
}

// 模拟数据
const mockHealthMetrics: HealthMetrics = {
  healthScore: 87,
  uptime: 72.5,
  lastSyncTime: '2023-11-02T14:22:35Z',
  errorRate: 1.2,
  memoryUsage: 45,
  cpuUsage: 32,
  responseTime: 120,
  activePositions: 3,
  pendingTransactions: 1,
  alerts: [
    {
      id: 'alert-1',
      severity: 'medium',
      message: '检测到网络延迟增加，可能影响交易执行速度',
      timestamp: '2023-11-02T12:15:22Z',
      acknowledged: false
    },
    {
      id: 'alert-2',
      severity: 'low',
      message: 'SOL/USDC 价格波动超过预期范围',
      timestamp: '2023-11-02T10:45:10Z',
      acknowledged: true
    }
  ],
  performanceHistory: Array.from({ length: 24 }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 3600 * 1000).toISOString(),
    healthScore: Math.floor(80 + Math.random() * 20)
  })).reverse()
};

// 健康分数组件
const HealthScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  // 确定颜色
  let color = 'text-red-600';
  let bgColor = 'bg-red-500';
  let ringColor = 'ring-red-500';
  
  if (score >= 80) {
    color = 'text-green-600';
    bgColor = 'bg-green-500';
    ringColor = 'ring-green-500';
  } else if (score >= 60) {
    color = 'text-yellow-600';
    bgColor = 'bg-yellow-500';
    ringColor = 'ring-yellow-500';
  } else if (score >= 40) {
    color = 'text-orange-600';
    bgColor = 'bg-orange-500';
    ringColor = 'ring-orange-500';
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-32 h-32">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className={`w-28 h-28 rounded-full bg-white ring-4 ${ringColor} flex items-center justify-center`}>
            <span className={`text-3xl font-bold ${color}`}>{score}</span>
          </div>
        </div>
        <svg className="w-32 h-32" viewBox="0 0 100 100">
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke="#e5e7eb" 
            strokeWidth="10" 
          />
          <circle 
            cx="50" 
            cy="50" 
            r="45" 
            fill="none" 
            stroke={bgColor.replace('bg-', 'var(--')} 
            strokeWidth="10" 
            strokeDasharray={`${score * 2.83} 283`} 
            strokeDashoffset="0" 
            transform="rotate(-90 50 50)" 
          />
        </svg>
      </div>
      <p className="mt-2 text-sm font-medium text-gray-700">健康分数</p>
    </div>
  );
};

// 指标卡片组件
const MetricCard: React.FC<{ 
  title: string; 
  value: string | number; 
  icon?: React.ReactNode;
  status?: 'good' | 'warning' | 'danger';
}> = ({ title, value, icon, status = 'good' }) => {
  const statusColors = {
    good: 'bg-green-50 text-green-700',
    warning: 'bg-yellow-50 text-yellow-700',
    danger: 'bg-red-50 text-red-700'
  };

  return (
    <div className={`p-4 rounded-lg ${statusColors[status]}`}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">{title}</p>
        {icon && <div className="text-lg">{icon}</div>}
      </div>
      <p className="mt-1 text-xl font-semibold">{value}</p>
    </div>
  );
};

// 警报组件
const AlertItem: React.FC<{ 
  alert: Alert; 
  onAcknowledge: (id: string) => Promise<void>;
}> = ({ alert, onAcknowledge }) => {
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  
  const severityConfig = {
    low: { bg: 'bg-blue-50', text: 'text-blue-800', border: 'border-blue-200' },
    medium: { bg: 'bg-yellow-50', text: 'text-yellow-800', border: 'border-yellow-200' },
    high: { bg: 'bg-orange-50', text: 'text-orange-800', border: 'border-orange-200' },
    critical: { bg: 'bg-red-50', text: 'text-red-800', border: 'border-red-200' }
  };
  
  const config = severityConfig[alert.severity];
  
  const handleAcknowledge = async () => {
    setIsAcknowledging(true);
    try {
      await onAcknowledge(alert.id);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    } finally {
      setIsAcknowledging(false);
    }
  };

  return (
    <div className={`p-3 mb-2 rounded-md border ${config.bg} ${config.border}`}>
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center">
            <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text} border ${config.border}`}>
              {alert.severity === 'low' ? '低' : 
               alert.severity === 'medium' ? '中' : 
               alert.severity === 'high' ? '高' : '严重'}
            </span>
            <span className="ml-2 text-xs text-gray-500">
              {new Date(alert.timestamp).toLocaleString()}
            </span>
          </div>
          <p className={`mt-1 text-sm ${config.text}`}>{alert.message}</p>
        </div>
        
        {!alert.acknowledged && (
          <button
            onClick={handleAcknowledge}
            disabled={isAcknowledging}
            className={`px-2 py-1 text-xs rounded-md bg-white border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
              isAcknowledging ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isAcknowledging ? '处理中...' : '确认'}
          </button>
        )}
      </div>
    </div>
  );
};

// 性能历史图表组件
const PerformanceChart: React.FC<{ data: PerformancePoint[] }> = ({ data }) => {
  // 在实际应用中，这里可以使用Chart.js或其他图表库
  // 这里使用简单的SVG实现
  
  const maxScore = 100;
  const height = 100;
  const width = 300;
  
  // 计算点的坐标
  const points = data.map((point, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - (point.healthScore / maxScore) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <div className="mt-4">
      <h4 className="text-sm font-medium text-gray-700 mb-2">健康分数历史</h4>
      <div className="bg-white p-2 rounded-lg border border-gray-200">
        <svg width={width} height={height} className="w-full h-32">
          {/* Y轴网格线 */}
          {[0, 25, 50, 75, 100].map((tick) => (
            <line
              key={tick}
              x1="0"
              y1={height - (tick / maxScore) * height}
              x2={width}
              y2={height - (tick / maxScore) * height}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
          ))}
          
          {/* 折线 */}
          <polyline
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            points={points}
          />
          
          {/* 数据点 */}
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = height - (point.healthScore / maxScore) * height;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill="#3b82f6"
              />
            );
          })}
        </svg>
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>{new Date(data[0].timestamp).toLocaleTimeString()}</span>
          <span>{new Date(data[data.length - 1].timestamp).toLocaleTimeString()}</span>
        </div>
      </div>
    </div>
  );
};

// 健康仪表盘组件
const HealthDashboard: React.FC<HealthDashboardProps> = ({ 
  agentId,
  onAcknowledgeAlert 
}) => {
  const [metrics, setMetrics] = useState<HealthMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const { lastMessage } = useWebSocket('ws://localhost:8080');

  // 模拟获取健康指标数据
  useEffect(() => {
    const fetchHealthMetrics = async () => {
      try {
        // 在实际应用中，这里会调用API获取健康指标数据
        // const response = await agentClient.getHealthMetrics(agentId);
        
        // 模拟API调用延迟
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // 使用模拟数据
        setMetrics(mockHealthMetrics);
      } catch (error) {
        console.error('Failed to fetch health metrics:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHealthMetrics();
  }, [agentId]);

  // 处理WebSocket消息更新
  useEffect(() => {
    if (lastMessage && metrics) {
      try {
        const data = JSON.parse(lastMessage.data);
        
        // 如果消息与当前Agent相关，则更新数据
        if (data.agentId === agentId && data.type === 'health_update') {
          setMetrics(prevMetrics => {
            if (!prevMetrics) return null;
            
            return {
              ...prevMetrics,
              ...data.metrics
            };
          });
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, agentId, metrics]);

  // 处理确认警报
  const handleAcknowledgeAlert = async (alertId: string) => {
    try {
      await onAcknowledgeAlert(alertId);
      
      // 更新本地状态
      setMetrics(prevMetrics => {
        if (!prevMetrics) return null;
        
        return {
          ...prevMetrics,
          alerts: prevMetrics.alerts.map(alert => 
            alert.id === alertId ? { ...alert, acknowledged: true } : alert
          )
        };
      });
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-bold text-gray-800">无法获取健康指标</h2>
        <p className="text-gray-600 mt-2">请稍后重试</p>
      </div>
    );
  }

  // 确定系统状态
  const getSystemStatus = () => {
    if (metrics.healthScore >= 80) return { text: '良好', color: 'text-green-600' };
    if (metrics.healthScore >= 60) return { text: '正常', color: 'text-yellow-600' };
    if (metrics.healthScore >= 40) return { text: '需要注意', color: 'text-orange-600' };
    return { text: '异常', color: 'text-red-600' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <h3 className="text-lg font-medium text-gray-800">Agent健康监控</h3>
        <div className="mt-2 md:mt-0 flex items-center">
          <span className="text-sm text-gray-500 mr-2">系统状态:</span>
          <span className={`font-medium ${systemStatus.color}`}>{systemStatus.text}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 左侧：健康分数和关键指标 */}
        <div className="flex flex-col items-center">
          <HealthScoreGauge score={metrics.healthScore} />
          
          <div className="mt-4 w-full">
            <p className="text-sm font-medium text-gray-700 mb-2">关键指标</p>
            <div className="space-y-2">
              <MetricCard 
                title="运行时间" 
                value={`${metrics.uptime.toFixed(1)} 小时`} 
                status="good"
              />
              <MetricCard 
                title="错误率" 
                value={`${metrics.errorRate.toFixed(1)}%`} 
                status={metrics.errorRate > 5 ? 'danger' : metrics.errorRate > 2 ? 'warning' : 'good'}
              />
              <MetricCard 
                title="响应时间" 
                value={`${metrics.responseTime} ms`} 
                status={metrics.responseTime > 500 ? 'danger' : metrics.responseTime > 200 ? 'warning' : 'good'}
              />
            </div>
          </div>
        </div>
        
        {/* 中间：性能图表和系统资源 */}
        <div>
          <PerformanceChart data={metrics.performanceHistory} />
          
          <div className="mt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">系统资源</h4>
            <div className="grid grid-cols-2 gap-2">
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">内存使用</p>
                <div className="mt-1 flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        metrics.memoryUsage > 80 ? 'bg-red-500' : 
                        metrics.memoryUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} 
                      style={{ width: `${metrics.memoryUsage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs font-medium text-gray-700">{metrics.memoryUsage}%</span>
                </div>
              </div>
              
              <div className="p-3 bg-white rounded-lg border border-gray-200">
                <p className="text-xs text-gray-500">CPU使用</p>
                <div className="mt-1 flex items-center">
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div 
                      className={`h-2.5 rounded-full ${
                        metrics.cpuUsage > 80 ? 'bg-red-500' : 
                        metrics.cpuUsage > 60 ? 'bg-yellow-500' : 'bg-green-500'
                      }`} 
                      style={{ width: `${metrics.cpuUsage}%` }}
                    ></div>
                  </div>
                  <span className="ml-2 text-xs font-medium text-gray-700">{metrics.cpuUsage}%</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-2">
            <MetricCard 
              title="活跃仓位" 
              value={metrics.activePositions} 
              status="good"
            />
            <MetricCard 
              title="待处理交易" 
              value={metrics.pendingTransactions} 
              status={metrics.pendingTransactions > 5 ? 'warning' : 'good'}
            />
          </div>
          
          <div className="mt-4 text-xs text-gray-500">
            最后同步时间: {new Date(metrics.lastSyncTime).toLocaleString()}
          </div>
        </div>
        
        {/* 右侧：警报 */}
        <div>
          <h4 className="text-sm font-medium text-gray-700 mb-2">警报 ({metrics.alerts.filter(a => !a.acknowledged).length})</h4>
          
          {metrics.alerts.length > 0 ? (
            <div className="space-y-2">
              {metrics.alerts.map(alert => (
                <AlertItem 
                  key={alert.id} 
                  alert={alert} 
                  onAcknowledge={handleAcknowledgeAlert} 
                />
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500 py-8">暂无警报</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard; 