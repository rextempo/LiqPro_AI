import { v4 as uuidv4 } from 'uuid';
import { mockUsers, mockRoles, mockPermissions, mockPermissionCategories } from './mockData';
import { User } from '../components/user/UserManagement';
import { Role, Permission } from '../components/user/RoleManagement';

// 深拷贝函数，避免直接修改原始数据
const deepClone = <T>(obj: T): T => {
  return JSON.parse(JSON.stringify(obj));
};

// 内存数据存储
let users = deepClone(mockUsers);
let roles = deepClone(mockRoles);
let permissions = deepClone(mockPermissions);
let permissionCategories = deepClone(mockPermissionCategories);

// 模拟延迟
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// 模拟API响应
const response = async <T>(data: T, error?: string): Promise<T> => {
  // 模拟网络延迟
  await delay(Math.random() * 300 + 100);
  
  // 模拟随机错误（开发测试用）
  if (error && Math.random() < 0.05) {
    throw new Error(error);
  }
  
  return data;
};

// 用户API
export const userApi = {
  // 获取所有用户
  getUsers: async (): Promise<User[]> => {
    return response(users, '获取用户列表失败');
  },
  
  // 获取单个用户
  getUser: async (id: string): Promise<User> => {
    const user = users.find(u => u.id === id);
    if (!user) {
      throw new Error('用户不存在');
    }
    return response(user, '获取用户详情失败');
  },
  
  // 创建用户
  createUser: async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'lastLogin' | 'roles'> & { roleIds: string[] }): Promise<User> => {
    // 查找角色
    const userRoles = roles.filter(role => userData.roleIds.includes(role.id));
    
    const newUser: User = {
      id: uuidv4(),
      username: userData.username,
      email: userData.email,
      fullName: userData.fullName,
      isActive: userData.isActive,
      roles: userRoles,
      lastLogin: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    users.push(newUser);
    return response(newUser, '创建用户失败');
  },
  
  // 更新用户
  updateUser: async (id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'roles'>> & { roleIds?: string[] }): Promise<User> => {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error('用户不存在');
    }
    
    const updatedUser = { ...users[index] };
    
    // 更新基本信息
    if (userData.username) updatedUser.username = userData.username;
    if (userData.email) updatedUser.email = userData.email;
    if (userData.fullName) updatedUser.fullName = userData.fullName;
    if (typeof userData.isActive === 'boolean') updatedUser.isActive = userData.isActive;
    
    // 更新角色
    if (userData.roleIds) {
      updatedUser.roles = roles.filter(role => userData.roleIds!.includes(role.id));
    }
    
    updatedUser.updatedAt = new Date().toISOString();
    
    users[index] = updatedUser;
    return response(updatedUser, '更新用户失败');
  },
  
  // 删除用户
  deleteUser: async (id: string): Promise<void> => {
    const index = users.findIndex(u => u.id === id);
    if (index === -1) {
      throw new Error('用户不存在');
    }
    
    users.splice(index, 1);
    return response(undefined, '删除用户失败');
  },
  
  // 重置密码
  resetPassword: async (id: string, password: string): Promise<void> => {
    const user = users.find(u => u.id === id);
    if (!user) {
      throw new Error('用户不存在');
    }
    
    // 在实际应用中，这里会进行密码加密等操作
    // 这里只是模拟成功
    return response(undefined, '重置密码失败');
  },
};

// 角色API
export const roleApi = {
  // 获取所有角色
  getRoles: async (): Promise<Role[]> => {
    return response(roles, '获取角色列表失败');
  },
  
  // 获取单个角色
  getRole: async (id: string): Promise<Role> => {
    const role = roles.find(r => r.id === id);
    if (!role) {
      throw new Error('角色不存在');
    }
    return response(role, '获取角色详情失败');
  },
  
  // 创建角色
  createRole: async (roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'permissions'> & { permissions: string[] }): Promise<Role> => {
    // 查找权限
    const rolePermissions = permissions.filter(p => roleData.permissions.includes(p.id));
    
    const newRole: Role = {
      id: uuidv4(),
      name: roleData.name,
      description: roleData.description,
      permissions: rolePermissions,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    roles.push(newRole);
    return response(newRole, '创建角色失败');
  },
  
  // 更新角色
  updateRole: async (id: string, roleData: Omit<Role, 'id' | 'createdAt' | 'updatedAt' | 'permissions'> & { permissions: string[] }): Promise<Role> => {
    const index = roles.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error('角色不存在');
    }
    
    // 查找权限
    const rolePermissions = permissions.filter(p => roleData.permissions.includes(p.id));
    
    const updatedRole: Role = {
      ...roles[index],
      name: roleData.name,
      description: roleData.description,
      permissions: rolePermissions,
      updatedAt: new Date().toISOString(),
    };
    
    roles[index] = updatedRole;
    
    // 更新用户的角色
    users = users.map(user => {
      const userRoles = user.roles.map(r => r.id === id ? updatedRole : r);
      return { ...user, roles: userRoles };
    });
    
    return response(updatedRole, '更新角色失败');
  },
  
  // 删除角色
  deleteRole: async (id: string): Promise<void> => {
    const index = roles.findIndex(r => r.id === id);
    if (index === -1) {
      throw new Error('角色不存在');
    }
    
    roles.splice(index, 1);
    
    // 从用户中移除该角色
    users = users.map(user => ({
      ...user,
      roles: user.roles.filter(r => r.id !== id),
    }));
    
    return response(undefined, '删除角色失败');
  },
};

// 权限API
export const permissionApi = {
  // 获取所有权限
  getPermissions: async (): Promise<Permission[]> => {
    return response(permissions, '获取权限列表失败');
  },
  
  // 获取单个权限
  getPermission: async (id: string): Promise<Permission> => {
    const permission = permissions.find(p => p.id === id);
    if (!permission) {
      throw new Error('权限不存在');
    }
    return response(permission, '获取权限详情失败');
  },
  
  // 创建权限
  createPermission: async (permissionData: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission> => {
    const newPermission: Permission = {
      id: uuidv4(),
      name: permissionData.name,
      code: permissionData.code,
      description: permissionData.description,
      category: permissionData.category,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    permissions.push(newPermission);
    return response(newPermission, '创建权限失败');
  },
  
  // 更新权限
  updatePermission: async (id: string, permissionData: Omit<Permission, 'id' | 'createdAt' | 'updatedAt'>): Promise<Permission> => {
    const index = permissions.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('权限不存在');
    }
    
    const updatedPermission: Permission = {
      ...permissions[index],
      name: permissionData.name,
      code: permissionData.code,
      description: permissionData.description,
      category: permissionData.category,
      updatedAt: new Date().toISOString(),
    };
    
    permissions[index] = updatedPermission;
    
    // 更新角色中的权限
    roles = roles.map(role => {
      const rolePermissions = role.permissions.map(p => p.id === id ? updatedPermission : p);
      return { ...role, permissions: rolePermissions };
    });
    
    return response(updatedPermission, '更新权限失败');
  },
  
  // 删除权限
  deletePermission: async (id: string): Promise<void> => {
    const index = permissions.findIndex(p => p.id === id);
    if (index === -1) {
      throw new Error('权限不存在');
    }
    
    permissions.splice(index, 1);
    
    // 从角色中移除该权限
    roles = roles.map(role => ({
      ...role,
      permissions: role.permissions.filter(p => p.id !== id),
    }));
    
    return response(undefined, '删除权限失败');
  },
};

// 权限类别API
export const permissionCategoryApi = {
  // 获取所有权限类别
  getPermissionCategories: async () => {
    return response(permissionCategories, '获取权限类别列表失败');
  },
  
  // 创建权限类别
  createPermissionCategory: async (categoryData: Omit<typeof permissionCategories[0], 'id'>) => {
    const newCategory = {
      id: uuidv4(),
      name: categoryData.name,
      description: categoryData.description,
    };
    
    permissionCategories.push(newCategory);
    return response(newCategory, '创建权限类别失败');
  },
}; 