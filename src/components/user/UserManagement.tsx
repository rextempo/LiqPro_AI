import React, { useState } from 'react';
import { 
  Card, 
  Button, 
  Modal, 
  FormField, 
  Input, 
  LoadingState, 
  ErrorState, 
  EmptyState,
  Dropdown,
  notification
} from '../ui';
import { useUserManagementApi, useUserManagementMutation } from '../../api/userManagementApi';
import { Role } from './RoleManagement';

// 用户类型定义
export interface User {
  id: string;
  username: string;
  email: string;
  fullName: string;
  roles: Role[];
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
}

// 用户表单类型
interface UserForm {
  username: string;
  email: string;
  fullName: string;
  password?: string;
  roleIds: string[];
  isActive: boolean;
}

/**
 * 用户管理组件
 * 用于创建、编辑、删除用户和分配角色
 */
const UserManagement: React.FC = () => {
  // 状态
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isResetPasswordModalVisible, setIsResetPasswordModalVisible] = useState(false);
  const [userForm, setUserForm] = useState<UserForm>({
    username: '',
    email: '',
    fullName: '',
    password: '',
    roleIds: [],
    isActive: true,
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // API调用
  const { data: users, loading, error, refresh } = useUserManagementApi<User[]>('users', {
    ttl: 30000, // 30秒缓存
  });
  
  const { data: roles, loading: loadingRoles } = useUserManagementApi<Role[]>('roles', {
    ttl: 60000, // 60秒缓存
  });
  
  const createUserMutation = useUserManagementMutation<User, UserForm>('users', 'POST');
  const updateUserMutation = useUserManagementMutation<User, Partial<UserForm>>(`users/${selectedUser?.id}`, 'PUT');
  const deleteUserMutation = useUserManagementMutation<void, void>(`users/${selectedUser?.id}`, 'DELETE');
  const resetPasswordMutation = useUserManagementMutation<void, { password: string }>(`users/${selectedUser?.id}/reset-password`, 'POST');
  
  // 过滤用户列表
  const filteredUsers = React.useMemo(() => {
    if (!users) return [];
    
    return users.filter(user => {
      // 状态过滤
      if (statusFilter === 'active' && !user.isActive) return false;
      if (statusFilter === 'inactive' && user.isActive) return false;
      
      // 搜索过滤
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          user.username.toLowerCase().includes(term) ||
          user.email.toLowerCase().includes(term) ||
          user.fullName.toLowerCase().includes(term)
        );
      }
      
      return true;
    });
  }, [users, statusFilter, searchTerm]);
  
  // 处理表单变更
  const handleFormChange = (field: keyof UserForm, value: any) => {
    setUserForm(prev => ({
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
  
  // 处理角色选择
  const handleRoleToggle = (roleId: string) => {
    setUserForm(prev => {
      const roleIds = [...prev.roleIds];
      const index = roleIds.indexOf(roleId);
      
      if (index === -1) {
        roleIds.push(roleId);
      } else {
        roleIds.splice(index, 1);
      }
      
      return {
        ...prev,
        roleIds,
      };
    });
  };
  
  // 验证表单
  const validateForm = (isCreate: boolean): boolean => {
    const errors: Record<string, string> = {};
    
    if (!userForm.username.trim()) {
      errors.username = '用户名不能为空';
    }
    
    if (!userForm.email.trim()) {
      errors.email = '邮箱不能为空';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userForm.email)) {
      errors.email = '邮箱格式不正确';
    }
    
    if (isCreate && !userForm.password) {
      errors.password = '密码不能为空';
    } else if (userForm.password && userForm.password.length < 8) {
      errors.password = '密码长度不能少于8个字符';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 处理创建用户
  const handleCreateUser = async () => {
    if (!validateForm(true)) return;
    
    try {
      await createUserMutation.mutate(userForm);
      notification.success('用户创建成功');
      setIsCreateModalVisible(false);
      refresh();
      resetForm();
    } catch (error) {
      notification.error({
        title: '用户创建失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理更新用户
  const handleUpdateUser = async () => {
    if (!validateForm(false)) return;
    
    // 移除空密码
    const formData = { ...userForm };
    if (!formData.password) {
      delete formData.password;
    }
    
    try {
      await updateUserMutation.mutate(formData);
      notification.success('用户更新成功');
      setIsEditModalVisible(false);
      refresh();
    } catch (error) {
      notification.error({
        title: '用户更新失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理删除用户
  const handleDeleteUser = async () => {
    try {
      await deleteUserMutation.mutate();
      notification.success('用户删除成功');
      setIsDeleteModalVisible(false);
      refresh();
      setSelectedUser(null);
    } catch (error) {
      notification.error({
        title: '用户删除失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理重置密码
  const handleResetPassword = async () => {
    if (!userForm.password) {
      setFormErrors({ password: '密码不能为空' });
      return;
    }
    
    if (userForm.password.length < 8) {
      setFormErrors({ password: '密码长度不能少于8个字符' });
      return;
    }
    
    try {
      await resetPasswordMutation.mutate({ password: userForm.password });
      notification.success('密码重置成功');
      setIsResetPasswordModalVisible(false);
      setUserForm(prev => ({ ...prev, password: '' }));
    } catch (error) {
      notification.error({
        title: '密码重置失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 打开编辑模态框
  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setUserForm({
      username: user.username,
      email: user.email,
      fullName: user.fullName || '',
      password: '',
      roleIds: user.roles.map(r => r.id),
      isActive: user.isActive,
    });
    setIsEditModalVisible(true);
  };
  
  // 打开删除模态框
  const openDeleteModal = (user: User) => {
    setSelectedUser(user);
    setIsDeleteModalVisible(true);
  };
  
  // 打开重置密码模态框
  const openResetPasswordModal = (user: User) => {
    setSelectedUser(user);
    setUserForm(prev => ({ ...prev, password: '' }));
    setIsResetPasswordModalVisible(true);
  };
  
  // 重置表单
  const resetForm = () => {
    setUserForm({
      username: '',
      email: '',
      fullName: '',
      password: '',
      roleIds: [],
      isActive: true,
    });
    setFormErrors({});
  };
  
  // 打开创建模态框
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalVisible(true);
  };
  
  // 渲染用户列表
  const renderUserList = () => {
    if (loading) {
      return <LoadingState centered text="加载用户列表中..." />;
    }
    
    if (error) {
      return (
        <ErrorState 
          message="加载用户列表失败" 
          type="error" 
          onRetry={refresh}
          centered
        />
      );
    }
    
    if (!filteredUsers.length) {
      return (
        <EmptyState 
          title="暂无用户" 
          description={searchTerm ? "没有找到匹配的用户" : "您可以创建新的用户账户"} 
          action={
            !searchTerm && (
              <Button variant="primary" onClick={openCreateModal}>
                创建用户
              </Button>
            )
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
                用户名
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                邮箱
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                角色
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                状态
              </th>
              <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                最后登录
              </th>
              <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                操作
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredUsers.map(user => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <span className="text-gray-500 font-medium">
                        {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-gray-900">{user.username}</div>
                      <div className="text-sm text-gray-500">{user.fullName}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex flex-wrap gap-1">
                    {user.roles.map(role => (
                      <span 
                        key={role.id} 
                        className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full"
                      >
                        {role.name}
                      </span>
                    ))}
                    {user.roles.length === 0 && (
                      <span className="text-sm text-gray-500">无角色</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    user.isActive 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {user.isActive ? '活跃' : '禁用'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {user.lastLogin 
                    ? new Date(user.lastLogin).toLocaleString() 
                    : '从未登录'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="secondary" 
                      size="small" 
                      onClick={() => openEditModal(user)}
                    >
                      编辑
                    </Button>
                    <Button 
                      variant="info" 
                      size="small" 
                      onClick={() => openResetPasswordModal(user)}
                    >
                      重置密码
                    </Button>
                    <Button 
                      variant="danger" 
                      size="small" 
                      onClick={() => openDeleteModal(user)}
                    >
                      删除
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };
  
  // 渲染角色选择
  const renderRoleSelection = () => {
    if (loadingRoles) {
      return <LoadingState text="加载角色列表中..." />;
    }
    
    if (!roles || roles.length === 0) {
      return <EmptyState title="暂无可用角色" description="请先创建角色" />;
    }
    
    return (
      <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
        {roles.map(role => (
          <div 
            key={role.id} 
            className="flex items-start p-2 border border-gray-200 rounded-md"
          >
            <input
              type="checkbox"
              id={`role-${role.id}`}
              checked={userForm.roleIds.includes(role.id)}
              onChange={() => handleRoleToggle(role.id)}
              className="mt-1 mr-2"
            />
            <div>
              <label 
                htmlFor={`role-${role.id}`}
                className="font-medium text-gray-700 block"
              >
                {role.name}
              </label>
              <p className="text-sm text-gray-600 mt-1">{role.description}</p>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  // 渲染用户表单
  const renderUserForm = (isCreate: boolean) => {
    return (
      <div className="space-y-4">
        <FormField
          label="用户名"
          required
          error={formErrors.username}
        >
          <Input
            value={userForm.username}
            onChange={(e) => handleFormChange('username', e.target.value)}
            placeholder="输入用户名"
            status={formErrors.username ? 'error' : 'default'}
            disabled={!isCreate} // 编辑时不允许修改用户名
          />
        </FormField>
        
        <FormField
          label="邮箱"
          required
          error={formErrors.email}
        >
          <Input
            type="email"
            value={userForm.email}
            onChange={(e) => handleFormChange('email', e.target.value)}
            placeholder="输入邮箱"
            status={formErrors.email ? 'error' : 'default'}
          />
        </FormField>
        
        <FormField
          label="姓名"
        >
          <Input
            value={userForm.fullName}
            onChange={(e) => handleFormChange('fullName', e.target.value)}
            placeholder="输入姓名"
          />
        </FormField>
        
        {isCreate && (
          <FormField
            label="密码"
            required
            error={formErrors.password}
          >
            <Input
              type="password"
              value={userForm.password || ''}
              onChange={(e) => handleFormChange('password', e.target.value)}
              placeholder="输入密码"
              status={formErrors.password ? 'error' : 'default'}
            />
          </FormField>
        )}
        
        <FormField
          label="状态"
        >
          <div className="flex items-center">
            <input
              type="checkbox"
              id="user-active"
              checked={userForm.isActive}
              onChange={(e) => handleFormChange('isActive', e.target.checked)}
              className="mr-2"
            />
            <label htmlFor="user-active" className="text-sm text-gray-700">
              账户激活
            </label>
          </div>
        </FormField>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">角色分配</h3>
          {renderRoleSelection()}
        </div>
      </div>
    );
  };
  
  // 渲染重置密码表单
  const renderResetPasswordForm = () => {
    return (
      <div className="space-y-4">
        <FormField
          label="新密码"
          required
          error={formErrors.password}
        >
          <Input
            type="password"
            value={userForm.password || ''}
            onChange={(e) => handleFormChange('password', e.target.value)}
            placeholder="输入新密码"
            status={formErrors.password ? 'error' : 'default'}
          />
        </FormField>
      </div>
    );
  };
  
  // 渲染筛选工具栏
  const renderFilterToolbar = () => {
    return (
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
        <div className="w-full sm:w-64">
          <Input
            placeholder="搜索用户..."
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
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                className={`px-3 py-1 text-sm ${statusFilter === 'all' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setStatusFilter('all')}
              >
                全部
              </button>
              <button
                className={`px-3 py-1 text-sm ${statusFilter === 'active' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setStatusFilter('active')}
              >
                活跃
              </button>
              <button
                className={`px-3 py-1 text-sm ${statusFilter === 'inactive' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700'}`}
                onClick={() => setStatusFilter('inactive')}
              >
                禁用
              </button>
            </div>
          </div>
          
          <Button variant="primary" onClick={openCreateModal}>
            创建用户
          </Button>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">用户管理</h2>
      </div>
      
      {renderFilterToolbar()}
      
      <Card>
        {renderUserList()}
      </Card>
      
      {/* 创建用户模态框 */}
      <Modal
        visible={isCreateModalVisible}
        title="创建用户"
        onClose={() => setIsCreateModalVisible(false)}
        onOk={handleCreateUser}
        confirmLoading={createUserMutation.loading}
        width={700}
      >
        {renderUserForm(true)}
      </Modal>
      
      {/* 编辑用户模态框 */}
      <Modal
        visible={isEditModalVisible}
        title={`编辑用户: ${selectedUser?.username}`}
        onClose={() => setIsEditModalVisible(false)}
        onOk={handleUpdateUser}
        confirmLoading={updateUserMutation.loading}
        width={700}
      >
        {renderUserForm(false)}
      </Modal>
      
      {/* 删除用户确认模态框 */}
      <Modal
        visible={isDeleteModalVisible}
        title="删除用户"
        onClose={() => setIsDeleteModalVisible(false)}
        onOk={handleDeleteUser}
        confirmLoading={deleteUserMutation.loading}
        okText="删除"
        cancelText="取消"
      >
        <p className="text-gray-700">
          确定要删除用户 <span className="font-medium">{selectedUser?.username}</span> 吗？此操作不可撤销。
        </p>
      </Modal>
      
      {/* 重置密码模态框 */}
      <Modal
        visible={isResetPasswordModalVisible}
        title={`重置密码: ${selectedUser?.username}`}
        onClose={() => setIsResetPasswordModalVisible(false)}
        onOk={handleResetPassword}
        confirmLoading={resetPasswordMutation.loading}
        okText="重置"
        cancelText="取消"
      >
        {renderResetPasswordForm()}
      </Modal>
    </div>
  );
};

export default UserManagement; 