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
  Tabs,
  notification
} from '../ui';
import { useUserManagementApi, useUserManagementMutation } from '../../api/userManagementApi';

// 角色类型定义
export interface Role {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  createdAt: string;
  updatedAt: string;
}

// 权限类型定义
export interface Permission {
  id: string;
  name: string;
  code: string;
  description: string;
  category: string;
  createdAt?: string;
  updatedAt?: string;
}

// 角色表单类型
interface RoleForm {
  name: string;
  description: string;
  permissions: string[]; // 权限ID数组
}

/**
 * 角色管理组件
 * 用于创建、编辑、删除角色和分配权限
 */
const RoleManagement: React.FC = () => {
  // 状态
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [roleForm, setRoleForm] = useState<RoleForm>({
    name: '',
    description: '',
    permissions: [],
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  
  // API调用
  const { data: roles, loading: isLoading, error, refresh: refetch } = useUserManagementApi<Role[]>('roles', {
    ttl: 30000, // 30秒缓存
  });
  
  const { data: permissions, loading: isLoadingPermissions } = useUserManagementApi<Permission[]>('permissions', {
    ttl: 60000, // 60秒缓存
  });
  
  const createRoleMutation = useUserManagementMutation<Role, RoleForm>('roles', 'POST');
  const updateRoleMutation = useUserManagementMutation<Role, RoleForm>(`roles/${selectedRole?.id}`, 'PUT');
  const deleteRoleMutation = useUserManagementMutation<void, void>(`roles/${selectedRole?.id}`, 'DELETE');
  
  // 按类别分组权限
  const permissionsByCategory = React.useMemo(() => {
    if (!permissions) return {};
    
    return permissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});
  }, [permissions]);
  
  // 处理表单变更
  const handleFormChange = (field: keyof RoleForm, value: string | string[]) => {
    setRoleForm(prev => ({
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
  
  // 处理权限选择
  const handlePermissionToggle = (permissionId: string) => {
    setRoleForm(prev => {
      const permissions = [...prev.permissions];
      const index = permissions.indexOf(permissionId);
      
      if (index === -1) {
        permissions.push(permissionId);
      } else {
        permissions.splice(index, 1);
      }
      
      return {
        ...prev,
        permissions,
      };
    });
  };
  
  // 验证表单
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!roleForm.name.trim()) {
      errors.name = '角色名称不能为空';
    }
    
    if (roleForm.permissions.length === 0) {
      errors.permissions = '请至少选择一个权限';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 处理创建角色
  const handleCreateRole = async () => {
    if (!validateForm()) return;
    
    try {
      await createRoleMutation.mutate(roleForm);
      notification.success('角色创建成功');
      setIsCreateModalVisible(false);
      refetch();
      resetForm();
    } catch (error) {
      notification.error({
        title: '角色创建失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理更新角色
  const handleUpdateRole = async () => {
    if (!validateForm()) return;
    
    try {
      await updateRoleMutation.mutate(roleForm);
      notification.success('角色更新成功');
      setIsEditModalVisible(false);
      refetch();
    } catch (error) {
      notification.error({
        title: '角色更新失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理删除角色
  const handleDeleteRole = async () => {
    try {
      await deleteRoleMutation.mutate();
      notification.success('角色删除成功');
      setIsDeleteModalVisible(false);
      refetch();
      setSelectedRole(null);
    } catch (error) {
      notification.error({
        title: '角色删除失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 打开编辑模态框
  const openEditModal = (role: Role) => {
    setSelectedRole(role);
    setRoleForm({
      name: role.name,
      description: role.description,
      permissions: role.permissions.map(p => p.id),
    });
    setIsEditModalVisible(true);
  };
  
  // 打开删除模态框
  const openDeleteModal = (role: Role) => {
    setSelectedRole(role);
    setIsDeleteModalVisible(true);
  };
  
  // 重置表单
  const resetForm = () => {
    setRoleForm({
      name: '',
      description: '',
      permissions: [],
    });
    setFormErrors({});
  };
  
  // 打开创建模态框
  const openCreateModal = () => {
    resetForm();
    setIsCreateModalVisible(true);
  };
  
  // 渲染角色列表
  const renderRoleList = () => {
    if (isLoading) {
      return <LoadingState centered text="加载角色列表中..." />;
    }
    
    if (error) {
      return (
        <ErrorState 
          message="加载角色列表失败" 
          type="error" 
          onRetry={refetch}
          centered
        />
      );
    }
    
    if (!roles || roles.length === 0) {
      return (
        <EmptyState 
          title="暂无角色" 
          description="您可以创建新的角色来管理用户权限" 
          action={
            <Button variant="primary" onClick={openCreateModal}>
              创建角色
            </Button>
          }
          centered
        />
      );
    }
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map(role => (
          <Card
            key={role.id}
            title={role.name}
            subtitle={`${role.permissions.length}个权限`}
            hoverable
            className="h-full"
            actions={
              <div className="flex justify-end space-x-2">
                <Button 
                  variant="secondary" 
                  size="small" 
                  onClick={() => openEditModal(role)}
                >
                  编辑
                </Button>
                <Button 
                  variant="danger" 
                  size="small" 
                  onClick={() => openDeleteModal(role)}
                >
                  删除
                </Button>
              </div>
            }
          >
            <p className="text-gray-600 mb-4">{role.description || '无描述'}</p>
            <div className="flex flex-wrap gap-1">
              {role.permissions.slice(0, 5).map(permission => (
                <span 
                  key={permission.id} 
                  className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                >
                  {permission.name}
                </span>
              ))}
              {role.permissions.length > 5 && (
                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                  +{role.permissions.length - 5}
                </span>
              )}
            </div>
          </Card>
        ))}
      </div>
    );
  };
  
  // 渲染权限选择
  const renderPermissionSelection = () => {
    if (isLoadingPermissions) {
      return <LoadingState text="加载权限列表中..." />;
    }
    
    if (!permissions || permissions.length === 0) {
      return <EmptyState title="暂无可用权限" description="系统中没有定义任何权限" />;
    }
    
    const categories = Object.keys(permissionsByCategory);
    
    if (categories.length === 0) {
      return <EmptyState title="暂无可用权限" description="系统中没有定义任何权限" />;
    }
    
    return (
      <div className="mt-4">
        {formErrors.permissions && (
          <div className="mb-4">
            <ErrorState message={formErrors.permissions} type="error" />
          </div>
        )}
        
        <Tabs
          items={categories.map(category => ({
            key: category,
            label: category,
            children: (
              <div className="p-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {permissionsByCategory[category].map(permission => (
                  <div 
                    key={permission.id} 
                    className="flex items-start p-2 border border-gray-200 rounded-md"
                  >
                    <input
                      type="checkbox"
                      id={`permission-${permission.id}`}
                      checked={roleForm.permissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="mt-1 mr-2"
                    />
                    <div>
                      <label 
                        htmlFor={`permission-${permission.id}`}
                        className="font-medium text-gray-700 block"
                      >
                        {permission.name}
                      </label>
                      <span className="text-xs text-gray-500 block">{permission.code}</span>
                      <p className="text-sm text-gray-600 mt-1">{permission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ),
          }))}
        />
      </div>
    );
  };
  
  // 渲染角色表单
  const renderRoleForm = () => {
    return (
      <div className="space-y-4">
        <FormField
          label="角色名称"
          required
          error={formErrors.name}
        >
          <Input
            value={roleForm.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="输入角色名称"
            status={formErrors.name ? 'error' : 'default'}
          />
        </FormField>
        
        <FormField
          label="角色描述"
        >
          <Input
            value={roleForm.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="输入角色描述"
          />
        </FormField>
        
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-2">权限分配</h3>
          {renderPermissionSelection()}
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">角色管理</h2>
        <Button variant="primary" onClick={openCreateModal}>
          创建角色
        </Button>
      </div>
      
      {renderRoleList()}
      
      {/* 创建角色模态框 */}
      <Modal
        visible={isCreateModalVisible}
        title="创建角色"
        onClose={() => setIsCreateModalVisible(false)}
        onOk={handleCreateRole}
        confirmLoading={createRoleMutation.loading}
        width={700}
      >
        {renderRoleForm()}
      </Modal>
      
      {/* 编辑角色模态框 */}
      <Modal
        visible={isEditModalVisible}
        title={`编辑角色: ${selectedRole?.name}`}
        onClose={() => setIsEditModalVisible(false)}
        onOk={handleUpdateRole}
        confirmLoading={updateRoleMutation.loading}
        width={700}
      >
        {renderRoleForm()}
      </Modal>
      
      {/* 删除角色确认模态框 */}
      <Modal
        visible={isDeleteModalVisible}
        title="删除角色"
        onClose={() => setIsDeleteModalVisible(false)}
        onOk={handleDeleteRole}
        confirmLoading={deleteRoleMutation.loading}
        okText="删除"
        cancelText="取消"
      >
        <p className="text-gray-700">
          确定要删除角色 <span className="font-medium">{selectedRole?.name}</span> 吗？此操作不可撤销，
          且可能影响已分配此角色的用户权限。
        </p>
      </Modal>
    </div>
  );
};

export default RoleManagement; 