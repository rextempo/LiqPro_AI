import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  FormField, 
  Input, 
  LoadingState, 
  ErrorState, 
  EmptyState,
  notification,
  Select,
  Tooltip,
  Badge
} from '../ui';
import { useUserManagementApi, useUserManagementMutation } from '../../api/userManagementApi';

// API密钥类型定义
export interface ApiKey {
  id: string;
  name: string;
  key: string;
  prefix: string;
  scopes: string[];
  expiresAt: string | null;
  lastUsed: string | null;
  createdAt: string;
  createdBy: string;
  isActive: boolean;
}

// API密钥表单类型
interface ApiKeyForm {
  name: string;
  scopes: string[];
  expiresAt: string | null;
}

// API密钥范围选项
const API_SCOPES = [
  { value: 'read:users', label: '读取用户信息' },
  { value: 'write:users', label: '修改用户信息' },
  { value: 'read:roles', label: '读取角色信息' },
  { value: 'write:roles', label: '修改角色信息' },
  { value: 'read:permissions', label: '读取权限信息' },
  { value: 'write:permissions', label: '修改权限信息' },
  { value: 'read:agents', label: '读取Agent信息' },
  { value: 'write:agents', label: '修改Agent信息' },
  { value: 'read:signals', label: '读取信号信息' },
  { value: 'read:metrics', label: '读取指标信息' },
  { value: 'admin', label: '管理员权限（所有权限）' }
];

/**
 * API密钥管理组件
 * 用于创建、查看、更新和删除API密钥
 */
const ApiKeyManagement: React.FC = () => {
  // 状态
  const [selectedApiKey, setSelectedApiKey] = useState<ApiKey | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isViewModalVisible, setIsViewModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [apiKeyForm, setApiKeyForm] = useState<ApiKeyForm>({
    name: '',
    scopes: [],
    expiresAt: null,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [filterActive, setFilterActive] = useState<boolean | null>(null);
  
  // API调用
  const { data: apiKeys, loading: isLoading, error, refresh: refetch } = useUserManagementApi<ApiKey[]>('api-keys', {
    ttl: 30000, // 30秒缓存
  });
  
  const createApiKeyMutation = useUserManagementMutation<{apiKey: ApiKey, secretKey: string}, ApiKeyForm>('api-keys', 'POST');
  const updateApiKeyMutation = useUserManagementMutation<ApiKey, {isActive: boolean}>(`api-keys/${selectedApiKey?.id}`, 'PUT');
  const deleteApiKeyMutation = useUserManagementMutation<void, void>(`api-keys/${selectedApiKey?.id}`, 'DELETE');
  
  // 过滤API密钥
  const filteredApiKeys = React.useMemo(() => {
    if (!apiKeys) return [];
    
    return apiKeys.filter(apiKey => {
      // 搜索过滤
      const matchesSearch = searchTerm 
        ? apiKey.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          apiKey.prefix.toLowerCase().includes(searchTerm.toLowerCase())
        : true;
      
      // 状态过滤
      const matchesStatus = filterActive !== null 
        ? apiKey.isActive === filterActive
        : true;
      
      return matchesSearch && matchesStatus;
    });
  }, [apiKeys, searchTerm, filterActive]);
  
  // 处理表单变更
  const handleFormChange = (field: keyof ApiKeyForm, value: any) => {
    setApiKeyForm(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // 清除错误
    if (formErrors[field]) {
      setFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };
  
  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!apiKeyForm.name.trim()) {
      errors.name = 'API密钥名称不能为空';
    }
    
    if (apiKeyForm.scopes.length === 0) {
      errors.scopes = '请至少选择一个权限范围';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 处理创建API密钥
  const handleCreateApiKey = async () => {
    if (!validateForm()) return;
    
    try {
      const result = await createApiKeyMutation.mutate(apiKeyForm);
      setNewApiKey(result.secretKey);
      notification.success('API密钥创建成功');
      refetch();
    } catch (error) {
      notification.error({
        title: 'API密钥创建失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理更新API密钥状态
  const handleToggleApiKeyStatus = async (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    
    try {
      await updateApiKeyMutation.mutate({ isActive: !apiKey.isActive });
      notification.success(`API密钥${apiKey.isActive ? '禁用' : '启用'}成功`);
      refetch();
    } catch (error) {
      notification.error({
        title: `API密钥${apiKey.isActive ? '禁用' : '启用'}失败`,
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理删除API密钥
  const handleDeleteApiKey = async () => {
    try {
      await deleteApiKeyMutation.mutate();
      notification.success('API密钥删除成功');
      setIsDeleteModalVisible(false);
      refetch();
      setSelectedApiKey(null);
    } catch (error) {
      notification.error({
        title: 'API密钥删除失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 打开查看模态框
  const openViewModal = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setIsViewModalVisible(true);
  };
  
  // 打开删除模态框
  const openDeleteModal = (apiKey: ApiKey) => {
    setSelectedApiKey(apiKey);
    setIsDeleteModalVisible(true);
  };
  
  // 重置表单
  const resetForm = () => {
    setApiKeyForm({
      name: '',
      scopes: [],
      expiresAt: null,
    });
    setFormErrors({});
  };
  
  // 打开创建模态框
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalVisible(true);
    setNewApiKey(null);
  };
  
  // 复制API密钥到剪贴板
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      notification.success('已复制到剪贴板');
    }).catch(() => {
      notification.error({
        title: '复制失败',
        message: '无法复制到剪贴板，请手动复制',
      });
    });
  };
  
  // 格式化日期
  const formatDate = (dateString: string | null) => {
    if (!dateString) return '从未';
    
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  // 计算过期状态
  const getExpirationStatus = (expiresAt: string | null) => {
    if (!expiresAt) return { status: 'success', text: '永不过期' };
    
    const now = new Date();
    const expireDate = new Date(expiresAt);
    
    if (expireDate < now) {
      return { status: 'error', text: '已过期' };
    }
    
    const daysLeft = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft <= 7) {
      return { status: 'warning', text: `${daysLeft}天后过期` };
    }
    
    return { status: 'success', text: formatDate(expiresAt) };
  };
  
  // 渲染API密钥列表
  const renderApiKeyList = () => {
    if (isLoading) {
      return <LoadingState centered text="加载API密钥列表中..." />;
    }
    
    if (error) {
      return (
        <ErrorState 
          message="加载API密钥列表失败" 
          type="error" 
          onRetry={refetch}
          centered
        />
      );
    }
    
    if (!filteredApiKeys.length) {
      return (
        <EmptyState 
          title={searchTerm || filterActive !== null ? "没有找到匹配的API密钥" : "暂无API密钥"} 
          description={searchTerm || filterActive !== null ? "请尝试其他搜索条件" : "您可以创建新的API密钥来访问系统API"} 
          action={
            <Button variant="primary" onClick={openCreateModal}>
              创建API密钥
            </Button>
          }
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
                名称
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                密钥前缀
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                过期时间
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后使用
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                创建时间
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredApiKeys.map(apiKey => {
              const expirationStatus = getExpirationStatus(apiKey.expiresAt);
              
              return (
                <tr key={apiKey.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{apiKey.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500 font-mono">{apiKey.prefix}...</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      status={apiKey.isActive ? 'success' : 'error'} 
                      text={apiKey.isActive ? '活跃' : '禁用'} 
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <Badge 
                      status={expirationStatus.status as any} 
                      text={expirationStatus.text} 
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(apiKey.lastUsed)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-500">{formatDate(apiKey.createdAt)}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="secondary" 
                        size="small" 
                        onClick={() => openViewModal(apiKey)}
                      >
                        查看
                      </Button>
                      <Button 
                        variant={apiKey.isActive ? 'warning' : 'success'} 
                        size="small" 
                        onClick={() => handleToggleApiKeyStatus(apiKey)}
                      >
                        {apiKey.isActive ? '禁用' : '启用'}
                      </Button>
                      <Button 
                        variant="danger" 
                        size="small" 
                        onClick={() => openDeleteModal(apiKey)}
                      >
                        删除
                      </Button>
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
          <Input
            placeholder="搜索API密钥..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            prefix={
              <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            }
            allowClear
            onClear={() => setSearchTerm('')}
          />
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-500">状态:</span>
            <Select
              value={filterActive === null ? 'all' : (filterActive ? 'active' : 'inactive')}
              onChange={(value) => {
                if (value === 'all') setFilterActive(null);
                else if (value === 'active') setFilterActive(true);
                else setFilterActive(false);
              }}
              options={[
                { value: 'all', label: '全部' },
                { value: 'active', label: '活跃' },
                { value: 'inactive', label: '禁用' },
              ]}
              style={{ width: 100 }}
            />
          </div>
          
          <Button variant="primary" onClick={openCreateModal}>
            创建API密钥
          </Button>
        </div>
      </div>
    );
  };
  
  // 渲染API密钥表单
  const renderApiKeyForm = () => {
    return (
      <div className="space-y-4">
        <FormField
          label="API密钥名称"
          required
          error={formErrors.name}
          helpText="为API密钥提供一个描述性名称，例如：'Web应用程序'、'移动应用程序'等"
        >
          <Input
            value={apiKeyForm.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="输入API密钥名称"
            status={formErrors.name ? 'error' : 'default'}
          />
        </FormField>
        
        <FormField
          label="权限范围"
          required
          error={formErrors.scopes}
          helpText="选择此API密钥可以访问的权限范围"
        >
          <Select
            mode="multiple"
            placeholder="选择权限范围"
            value={apiKeyForm.scopes}
            onChange={(value) => handleFormChange('scopes', value)}
            options={API_SCOPES}
            status={formErrors.scopes ? 'error' : 'default'}
            style={{ width: '100%' }}
          />
        </FormField>
        
        <FormField
          label="过期时间"
          helpText="设置API密钥的过期时间，留空表示永不过期"
        >
          <Input
            type="datetime-local"
            value={apiKeyForm.expiresAt || ''}
            onChange={(e) => handleFormChange('expiresAt', e.target.value || null)}
            min={new Date().toISOString().slice(0, 16)}
          />
        </FormField>
      </div>
    );
  };
  
  // 渲染API密钥详情
  const renderApiKeyDetails = () => {
    if (!selectedApiKey) return null;
    
    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-medium text-gray-500">名称</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedApiKey.name}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">密钥前缀</h3>
          <p className="mt-1 text-sm font-mono text-gray-900">{selectedApiKey.prefix}...</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">状态</h3>
          <p className="mt-1">
            <Badge 
              status={selectedApiKey.isActive ? 'success' : 'error'} 
              text={selectedApiKey.isActive ? '活跃' : '禁用'} 
            />
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">权限范围</h3>
          <div className="mt-1 flex flex-wrap gap-2">
            {selectedApiKey.scopes.map(scope => (
              <Badge key={scope} status="default" text={API_SCOPES.find(s => s.value === scope)?.label || scope} />
            ))}
          </div>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">过期时间</h3>
          <p className="mt-1 text-sm text-gray-900">
            {selectedApiKey.expiresAt ? formatDate(selectedApiKey.expiresAt) : '永不过期'}
          </p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">最后使用</h3>
          <p className="mt-1 text-sm text-gray-900">{formatDate(selectedApiKey.lastUsed)}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">创建时间</h3>
          <p className="mt-1 text-sm text-gray-900">{formatDate(selectedApiKey.createdAt)}</p>
        </div>
        
        <div>
          <h3 className="text-sm font-medium text-gray-500">创建者</h3>
          <p className="mt-1 text-sm text-gray-900">{selectedApiKey.createdBy}</p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">API密钥管理</h2>
      </div>
      
      {renderToolbar()}
      
      <Card>
        {renderApiKeyList()}
      </Card>
      
      {/* 创建API密钥模态框 */}
      <Modal
        visible={isCreateModalVisible}
        title="创建API密钥"
        onClose={() => {
          if (!newApiKey) {
            setIsCreateModalVisible(false);
          }
        }}
        onOk={newApiKey ? () => setIsCreateModalVisible(false) : handleCreateApiKey}
        okText={newApiKey ? '关闭' : '创建'}
        cancelText="取消"
        cancelButtonProps={{ style: { display: newApiKey ? 'none' : 'inline-block' } }}
        width={600}
      >
        {newApiKey ? (
          <div className="space-y-4">
            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-yellow-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    请立即复制您的API密钥。出于安全原因，此密钥只会显示一次，之后将无法再次查看。
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-gray-100 p-4 rounded-md">
              <div className="flex items-center justify-between">
                <code className="text-sm font-mono break-all">{newApiKey}</code>
                <Button 
                  variant="secondary" 
                  size="small" 
                  onClick={() => copyToClipboard(newApiKey)}
                >
                  复制
                </Button>
              </div>
            </div>
          </div>
        ) : (
          renderApiKeyForm()
        )}
      </Modal>
      
      {/* 查看API密钥模态框 */}
      <Modal
        visible={isViewModalVisible}
        title="API密钥详情"
        onClose={() => setIsViewModalVisible(false)}
        onOk={() => setIsViewModalVisible(false)}
        okText="关闭"
        cancelButtonProps={{ style: { display: 'none' } }}
        width={500}
      >
        {renderApiKeyDetails()}
      </Modal>
      
      {/* 删除API密钥确认模态框 */}
      <Modal
        visible={isDeleteModalVisible}
        title="删除API密钥"
        onClose={() => setIsDeleteModalVisible(false)}
        onOk={handleDeleteApiKey}
        confirmLoading={deleteApiKeyMutation.loading}
        okText="删除"
        cancelText="取消"
      >
        <p className="text-gray-700">
          确定要删除API密钥 <span className="font-medium">{selectedApiKey?.name}</span> 吗？此操作不可撤销，
          且会立即使该密钥失效。
        </p>
      </Modal>
    </div>
  );
};

export default ApiKeyManagement; 