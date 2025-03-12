import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  LoadingState, 
  ErrorState, 
  EmptyState,
  notification,
  Tabs
} from '../ui';
import { useUserManagementApi, useUserManagementMutation } from '../../api/userManagementApi';

// 会话类型定义
export interface Session {
  id: string;
  userId: string;
  username: string;
  userAgent: string;
  ipAddress: string;
  location: string;
  device: string;
  browser: string;
  os: string;
  lastActivity: string;
  createdAt: string;
  isCurrentSession: boolean;
  status: 'active' | 'idle' | 'expired';
}

/**
 * 会话监控组件
 * 用于监控和管理用户会话
 */
const SessionMonitoring: React.FC = () => {
  // 状态
  const [selectedSession, setSelectedSession] = useState<Session | null>(null);
  const [isTerminateModalVisible, setIsTerminateModalVisible] = useState(false);
  const [isDetailsModalVisible, setIsDetailsModalVisible] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<string>('all');
  
  // API调用
  const { data: sessions, loading: isLoading, error, refresh: refetch } = useUserManagementApi<Session[]>('sessions', {
    ttl: 10000, // 10秒缓存，会话数据需要较频繁更新
  });
  
  const terminateSessionMutation = useUserManagementMutation<void, void>(`sessions/${selectedSession?.id}/terminate`, 'POST');
  
  // 定时刷新会话数据
  useEffect(() => {
    const intervalId = setInterval(() => {
      refetch();
    }, 30000); // 每30秒刷新一次
    
    return () => clearInterval(intervalId);
  }, [refetch]);
  
  // 过滤会话
  const filteredSessions = React.useMemo(() => {
    if (!sessions) return [];
    
    return sessions.filter(session => {
      // 搜索过滤
      const matchesSearch = searchTerm 
        ? session.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.ipAddress.includes(searchTerm) ||
          session.device.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.browser.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.location.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      // 状态过滤
      const matchesStatus = filterStatus !== 'all' 
        ? session.status === filterStatus
        : true;
      
      // 标签页过滤
      const matchesTab = activeTab === 'all' 
        ? true 
        : activeTab === 'current' 
          ? session.isCurrentSession 
          : !session.isCurrentSession;
      
      return matchesSearch && matchesStatus && matchesTab;
    });
  }, [sessions, searchTerm, filterStatus, activeTab]);
  
  // 处理终止会话
  const handleTerminateSession = async () => {
    if (!selectedSession) return;
    
    try {
      await terminateSessionMutation.mutate();
      notification.success('会话已成功终止');
      setIsTerminateModalVisible(false);
      refetch();
      setSelectedSession(null);
    } catch (error) {
      notification.error({
        title: '终止会话失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 打开终止会话模态框
  const openTerminateModal = (session: Session) => {
    setSelectedSession(session);
    setIsTerminateModalVisible(true);
  };
  
  // 打开会话详情模态框
  const openDetailsModal = (session: Session) => {
    setSelectedSession(session);
    setIsDetailsModalVisible(true);
  };
  
  // 格式化日期
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // 计算会话持续时间
  const getSessionDuration = (createdAt: string) => {
    const start = new Date(createdAt).getTime();
    const now = new Date().getTime();
    const durationMs = now - start;
    
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}天 ${hours % 24}小时`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes % 60}分钟`;
    } else if (minutes > 0) {
      return `${minutes}分钟 ${seconds % 60}秒`;
    } else {
      return `${seconds}秒`;
    }
  };
  
  // 获取会话状态样式
  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'active':
        return { color: 'bg-green-100 text-green-800' };
      case 'idle':
        return { color: 'bg-yellow-100 text-yellow-800' };
      case 'expired':
        return { color: 'bg-red-100 text-red-800' };
      default:
        return { color: 'bg-gray-100 text-gray-800' };
    }
  };
  
  // 渲染会话列表
  const renderSessionList = () => {
    if (isLoading) {
      return <LoadingState centered text="加载会话列表中..." />;
    }
    
    if (error) {
      return (
        <ErrorState 
          message="加载会话列表失败" 
          type="error" 
          onRetry={refetch}
          centered
        />
      );
    }
    
    if (!filteredSessions.length) {
      return (
        <EmptyState 
          title={searchTerm || filterStatus !== 'all' ? "没有找到匹配的会话" : "暂无活跃会话"} 
          description={searchTerm || filterStatus !== 'all' ? "请尝试其他搜索条件" : "当前没有用户登录系统"} 
          centered
        />
      );
    }
    
    return (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                用户
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                IP地址
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                位置
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                设备/浏览器
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后活动
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                会话时长
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredSessions.map(session => {
              const statusStyle = getStatusStyle(session.status);
              
              return (
                <tr key={session.id} className={session.isCurrentSession ? 'bg-blue-50' : ''}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{session.username}</div>
                        {session.isCurrentSession && (
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            当前会话
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{session.ipAddress}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{session.location}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{session.device}</div>
                    <div className="text-sm text-gray-500">{session.browser} / {session.os}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${statusStyle.color}`}>
                      {session.status === 'active' ? '活跃' : session.status === 'idle' ? '空闲' : '过期'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(session.lastActivity)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{getSessionDuration(session.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="secondary" 
                        size="small" 
                        onClick={() => openDetailsModal(session)}
                      >
                        详情
                      </Button>
                      {!session.isCurrentSession && (
                        <Button 
                          variant="danger" 
                          size="small" 
                          onClick={() => openTerminateModal(session)}
                        >
                          终止
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };
  
  // 渲染搜索和过滤工具栏
  const renderToolbar = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="w-full sm:w-64">
          <input
            type="text"
            placeholder="搜索会话..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="shadow-sm focus:ring-blue-500 focus:border-blue-500 block w-full sm:text-sm border-gray-300 rounded-md"
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">状态:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
            >
              <option value="all">全部</option>
              <option value="active">活跃</option>
              <option value="idle">空闲</option>
              <option value="expired">过期</option>
            </select>
          </div>
          
          <Button variant="primary" onClick={refetch}>
            刷新
          </Button>
        </div>
      </div>
    );
  };
  
  // 渲染会话详情
  const renderSessionDetails = () => {
    if (!selectedSession) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">用户</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedSession.username}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">会话ID</h3>
          <p className="mt-1 text-sm font-mono text-gray-900">{selectedSession.id}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">IP地址</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedSession.ipAddress}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">位置</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedSession.location}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">设备</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedSession.device}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">浏览器</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedSession.browser}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">操作系统</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedSession.os}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">User Agent</h3>
          <p className="mt-1 text-sm font-mono text-gray-900 break-all">{selectedSession.userAgent}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">状态</h3>
          <p className="mt-1 text-sm text-gray-900">
            {selectedSession.status === 'active' ? '活跃' : selectedSession.status === 'idle' ? '空闲' : '过期'}
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">最后活动时间</h3>
          <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSession.lastActivity)}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">会话开始时间</h3>
          <p className="mt-1 text-sm text-gray-900">{formatDate(selectedSession.createdAt)}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">会话持续时间</h3>
          <p className="mt-1 text-sm text-gray-900">{getSessionDuration(selectedSession.createdAt)}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">会话监控</h2>
      </div>
      
      <Tabs
        activeKey={activeTab}
        onChange={setActiveTab}
        items={[
          {
            key: 'all',
            label: '所有会话',
            children: (
              <>
                {renderToolbar()}
                <Card>
                  {renderSessionList()}
                </Card>
              </>
            ),
          },
          {
            key: 'current',
            label: '当前会话',
            children: (
              <>
                {renderToolbar()}
                <Card>
                  {renderSessionList()}
                </Card>
              </>
            ),
          },
          {
            key: 'others',
            label: '其他会话',
            children: (
              <>
                {renderToolbar()}
                <Card>
                  {renderSessionList()}
                </Card>
              </>
            ),
          },
        ]}
      />
      
      {/* 终止会话确认模态框 */}
      <Modal
        visible={isTerminateModalVisible}
        title="终止会话"
        onClose={() => setIsTerminateModalVisible(false)}
        onOk={handleTerminateSession}
        confirmLoading={terminateSessionMutation.loading}
        okText="终止"
        cancelText="取消"
      >
        <p className="text-gray-700">
          确定要终止用户 <span className="font-medium">{selectedSession?.username}</span> 的会话吗？
          此操作将强制用户登出系统。
        </p>
      </Modal>
      
      {/* 会话详情模态框 */}
      <Modal
        visible={isDetailsModalVisible}
        title="会话详情"
        onClose={() => setIsDetailsModalVisible(false)}
        onOk={() => setIsDetailsModalVisible(false)}
        okText="关闭"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={500}
      >
        {renderSessionDetails()}
      </Modal>
    </div>
  );
};

export default SessionMonitoring; 