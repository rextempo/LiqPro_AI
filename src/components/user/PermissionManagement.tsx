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
  Tabs,
  notification
} from '../ui';
import { useUserManagementApi, useUserManagementMutation } from '../../api/userManagementApi';

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

// 权限表单类型
interface PermissionForm {
  name: string;
  code: string;
  description: string;
  category: string;
}

// 权限类别类型
interface Category {
  id: string;
  name: string;
  description: string;
}

/**
 * 权限管理组件
 * 用于创建、编辑、删除系统权限和管理权限类别
 */
const PermissionManagement: React.FC = () => {
  // 状态
  const [selectedPermission, setSelectedPermission] = useState<Permission | null>(null);
  const [isCreateModalVisible, setIsCreateModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isDeleteModalVisible, setIsDeleteModalVisible] = useState(false);
  const [isCategoryModalVisible, setIsCategoryModalVisible] = useState(false);
  const [permissionForm, setPermissionForm] = useState<PermissionForm>({
    name: '',
    code: '',
    description: '',
    category: '',
  });
  const [categoryForm, setCategoryForm] = useState({
    name: '',
    description: '',
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [categoryFormErrors, setCategoryFormErrors] = useState<Record<string, string>>({});
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  
  // API调用
  const { data: permissions, loading: isLoading, error, refresh: refetch } = useUserManagementApi<Permission[]>('permissions', {
    ttl: 30000, // 30秒缓存
  });
  
  const { data: categories, loading: isLoadingCategories, refresh: refetchCategories } = useUserManagementApi<Category[]>('permission-categories', {
    ttl: 60000, // 60秒缓存
  });
  
  const createPermissionMutation = useUserManagementMutation<Permission, PermissionForm>('permissions', 'POST');
  const updatePermissionMutation = useUserManagementMutation<Permission, PermissionForm>(`permissions/${selectedPermission?.id}`, 'PUT');
  const deletePermissionMutation = useUserManagementMutation<void, void>(`permissions/${selectedPermission?.id}`, 'DELETE');
  const createCategoryMutation = useUserManagementMutation<Category, Omit<Category, 'id'>>('permission-categories', 'POST');
  
  // 按类别分组权限
  const permissionsByCategory = React.useMemo(() => {
    if (!permissions) return {};
    
    // 过滤搜索结果
    const filteredPermissions = searchTerm 
      ? permissions.filter(permission => 
          permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
          permission.description.toLowerCase().includes(searchTerm.toLowerCase())
        )
      : permissions;
    
    return filteredPermissions.reduce<Record<string, Permission[]>>((acc, permission) => {
      if (!acc[permission.category]) {
        acc[permission.category] = [];
      }
      acc[permission.category].push(permission);
      return acc;
    }, {});
  }, [permissions, searchTerm]);
  
  // 处理表单变更
  const handleFormChange = (field: keyof PermissionForm, value: string) => {
    setPermissionForm(prev => ({
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
  
  // 处理类别表单变更
  const handleCategoryFormChange = (field: keyof typeof categoryForm, value: string) => {
    setCategoryForm(prev => ({
      ...prev,
      [field]: value,
    }));
    
    // 清除错误
    if (categoryFormErrors[field]) {
      setCategoryFormErrors(prev => ({
        ...prev,
        [field]: '',
      }));
    }
  };
  
  // 验证权限表单
  const validatePermissionForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!permissionForm.name.trim()) {
      errors.name = '权限名称不能为空';
    }
    
    if (!permissionForm.code.trim()) {
      errors.code = '权限代码不能为空';
    } else if (!/^[A-Z_]+$/.test(permissionForm.code)) {
      errors.code = '权限代码只能包含大写字母和下划线';
    }
    
    if (!permissionForm.category) {
      errors.category = '请选择权限类别';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 验证类别表单
  const validateCategoryForm = (): boolean => {
    const errors: Record<string, string> = {};
    
    if (!categoryForm.name.trim()) {
      errors.name = '类别名称不能为空';
    }
    
    setCategoryFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  
  // 处理创建权限
  const handleCreatePermission = async () => {
    if (!validatePermissionForm()) return;
    
    try {
      await createPermissionMutation.mutate(permissionForm);
      notification.success('权限创建成功');
      setIsCreateModalVisible(false);
      refetch();
      resetPermissionForm();
    } catch (error) {
      notification.error({
        title: '权限创建失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理更新权限
  const handleUpdatePermission = async () => {
    if (!validatePermissionForm()) return;
    
    try {
      await updatePermissionMutation.mutate(permissionForm);
      notification.success('权限更新成功');
      setIsEditModalVisible(false);
      refetch();
    } catch (error) {
      notification.error({
        title: '权限更新失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理删除权限
  const handleDeletePermission = async () => {
    try {
      await deletePermissionMutation.mutate();
      notification.success('权限删除成功');
      setIsDeleteModalVisible(false);
      refetch();
      setSelectedPermission(null);
    } catch (error) {
      notification.error({
        title: '权限删除失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 处理创建类别
  const handleCreateCategory = async () => {
    if (!validateCategoryForm()) return;
    
    try {
      await createCategoryMutation.mutate(categoryForm);
      notification.success('类别创建成功');
      setIsCategoryModalVisible(false);
      refetchCategories();
      resetCategoryForm();
    } catch (error) {
      notification.error({
        title: '类别创建失败',
        message: error instanceof Error ? error.message : '未知错误',
      });
    }
  };
  
  // 打开编辑模态框
  const openEditModal = (permission: Permission) => {
    setSelectedPermission(permission);
    setPermissionForm({
      name: permission.name,
      code: permission.code,
      description: permission.description,
      category: permission.category,
    });
    setIsEditModalVisible(true);
  };
  
  // 打开删除模态框
  const openDeleteModal = (permission: Permission) => {
    setSelectedPermission(permission);
    setIsDeleteModalVisible(true);
  };
  
  // 重置权限表单
  const resetPermissionForm = () => {
    setPermissionForm({
      name: '',
      code: '',
      description: '',
      category: activeCategory || '',
    });
    setFormErrors({});
  };
  
  // 重置类别表单
  const resetCategoryForm = () => {
    setCategoryForm({
      name: '',
      description: '',
    });
    setCategoryFormErrors({});
  };
  
  // 打开创建权限模态框
  const openCreateModal = () => {
    resetPermissionForm();
    setIsCreateModalVisible(true);
  };
  
  // 打开创建类别模态框
  const openCategoryModal = () => {
    resetCategoryForm();
    setIsCategoryModalVisible(true);
  };
  
  // 处理类别切换
  const handleCategoryChange = (category: string) => {
    setActiveCategory(category);
  };
  
  // 渲染权限列表
  const renderPermissionList = () => {
    if (isLoading) {
      return <LoadingState centered text="加载权限列表中..." />;
    }
    
    if (error) {
      return (
        <ErrorState 
          message="加载权限列表失败" 
          type="error" 
          onRetry={refetch}
          centered
        />
      );
    }
    
    const categoryKeys = Object.keys(permissionsByCategory);
    
    if (categoryKeys.length === 0) {
      return (
        <EmptyState 
          title={searchTerm ? "没有找到匹配的权限" : "暂无权限"} 
          description={searchTerm ? "请尝试其他搜索条件" : "您可以创建新的权限来管理系统访问控制"} 
          action={
            !searchTerm && (
              <Button variant="primary" onClick={openCreateModal}>
                创建权限
              </Button>
            )
          }
          centered
        />
      );
    }
    
    // 如果没有选中类别，默认选择第一个
    if (!activeCategory || !permissionsByCategory[activeCategory]) {
      setActiveCategory(categoryKeys[0]);
    }
    
    return (
      <Tabs
        activeKey={activeCategory || categoryKeys[0]}
        onChange={handleCategoryChange}
        items={categoryKeys.map(category => ({
          key: category,
          label: `${category} (${permissionsByCategory[category].length})`,
          children: (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
              {permissionsByCategory[category].map(permission => (
                <Card
                  key={permission.id}
                  title={permission.name}
                  subtitle={permission.code}
                  hoverable
                  className="h-full"
                  actions={
                    <div className="flex justify-end space-x-2">
                      <Button 
                        variant="secondary" 
                        size="small" 
                        onClick={() => openEditModal(permission)}
                      >
                        编辑
                      </Button>
                      <Button 
                        variant="danger" 
                        size="small" 
                        onClick={() => openDeleteModal(permission)}
                      >
                        删除
                      </Button>
                    </div>
                  }
                >
                  <p className="text-gray-600 mb-2">{permission.description || '无描述'}</p>
                </Card>
              ))}
            </div>
          ),
        }))}
        extra={
          <div className="flex space-x-2">
            <Button variant="secondary" onClick={openCategoryModal}>
              添加类别
            </Button>
            <Button variant="primary" onClick={openCreateModal}>
              添加权限
            </Button>
          </div>
        }
      />
    );
  };
  
  // 渲染权限表单
  const renderPermissionForm = () => {
    return (
      <div className="space-y-4">
        <FormField
          label="权限名称"
          required
          error={formErrors.name}
        >
          <Input
            value={permissionForm.name}
            onChange={(e) => handleFormChange('name', e.target.value)}
            placeholder="输入权限名称"
            status={formErrors.name ? 'error' : 'default'}
          />
        </FormField>
        
        <FormField
          label="权限代码"
          required
          error={formErrors.code}
          helpText="权限代码只能包含大写字母和下划线，例如：USER_CREATE"
        >
          <Input
            value={permissionForm.code}
            onChange={(e) => handleFormChange('code', e.target.value.toUpperCase())}
            placeholder="输入权限代码"
            status={formErrors.code ? 'error' : 'default'}
          />
        </FormField>
        
        <FormField
          label="权限描述"
        >
          <Input
            value={permissionForm.description}
            onChange={(e) => handleFormChange('description', e.target.value)}
            placeholder="输入权限描述"
          />
        </FormField>
        
        <FormField
          label="权限类别"
          required
          error={formErrors.category}
        >
          <select
            value={permissionForm.category}
            onChange={(e) => handleFormChange('category', e.target.value)}
            className={`w-full px-3 py-2 border ${formErrors.category ? 'border-red-500' : 'border-gray-300'} rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">请选择类别</option>
            {categories?.map(category => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>
      </div>
    );
  };
  
  // 渲染类别表单
  const renderCategoryForm = () => {
    return (
      <div className="space-y-4">
        <FormField
          label="类别名称"
          required
          error={categoryFormErrors.name}
        >
          <Input
            value={categoryForm.name}
            onChange={(e) => handleCategoryFormChange('name', e.target.value)}
            placeholder="输入类别名称"
            status={categoryFormErrors.name ? 'error' : 'default'}
          />
        </FormField>
        
        <FormField
          label="类别描述"
        >
          <Input
            value={categoryForm.description}
            onChange={(e) => handleCategoryFormChange('description', e.target.value)}
            placeholder="输入类别描述"
          />
        </FormField>
      </div>
    );
  };
  
  // 渲染搜索栏
  const renderSearchBar = () => {
    return (
      <div className="mb-6">
        <Input
          placeholder="搜索权限..."
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
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-gray-900">权限管理</h2>
      </div>
      
      {renderSearchBar()}
      
      <Card>
        {renderPermissionList()}
      </Card>
      
      {/* 创建权限模态框 */}
      <Modal
        visible={isCreateModalVisible}
        title="创建权限"
        onClose={() => setIsCreateModalVisible(false)}
        onOk={handleCreatePermission}
        confirmLoading={createPermissionMutation.loading}
        width={600}
      >
        {renderPermissionForm()}
      </Modal>
      
      {/* 编辑权限模态框 */}
      <Modal
        visible={isEditModalVisible}
        title={`编辑权限: ${selectedPermission?.name}`}
        onClose={() => setIsEditModalVisible(false)}
        onOk={handleUpdatePermission}
        confirmLoading={updatePermissionMutation.loading}
        width={600}
      >
        {renderPermissionForm()}
      </Modal>
      
      {/* 删除权限确认模态框 */}
      <Modal
        visible={isDeleteModalVisible}
        title="删除权限"
        onClose={() => setIsDeleteModalVisible(false)}
        onOk={handleDeletePermission}
        confirmLoading={deletePermissionMutation.loading}
        okText="删除"
        cancelText="取消"
      >
        <p className="text-gray-700">
          确定要删除权限 <span className="font-medium">{selectedPermission?.name}</span> 吗？此操作不可撤销，
          且可能影响已分配此权限的角色。
        </p>
      </Modal>
      
      {/* 创建类别模态框 */}
      <Modal
        visible={isCategoryModalVisible}
        title="创建权限类别"
        onClose={() => setIsCategoryModalVisible(false)}
        onOk={handleCreateCategory}
        confirmLoading={createCategoryMutation.loading}
        width={500}
      >
        {renderCategoryForm()}
      </Modal>
    </div>
  );
};

export default PermissionManagement; 