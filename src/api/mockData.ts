import { v4 as uuidv4 } from 'uuid';
import { User } from '../components/user/UserManagement';
import { Role, Permission } from '../components/user/RoleManagement';

// 模拟权限数据
export const mockPermissions: Permission[] = [
  {
    id: uuidv4(),
    name: '查看用户',
    code: 'USER_VIEW',
    description: '允许查看用户列表和用户详情',
    category: '用户管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '创建用户',
    code: 'USER_CREATE',
    description: '允许创建新用户',
    category: '用户管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '编辑用户',
    code: 'USER_EDIT',
    description: '允许编辑用户信息',
    category: '用户管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '删除用户',
    code: 'USER_DELETE',
    description: '允许删除用户',
    category: '用户管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '重置密码',
    code: 'USER_RESET_PASSWORD',
    description: '允许重置用户密码',
    category: '用户管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '查看角色',
    code: 'ROLE_VIEW',
    description: '允许查看角色列表和角色详情',
    category: '角色管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '创建角色',
    code: 'ROLE_CREATE',
    description: '允许创建新角色',
    category: '角色管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '编辑角色',
    code: 'ROLE_EDIT',
    description: '允许编辑角色信息',
    category: '角色管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '删除角色',
    code: 'ROLE_DELETE',
    description: '允许删除角色',
    category: '角色管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '查看权限',
    code: 'PERMISSION_VIEW',
    description: '允许查看权限列表和权限详情',
    category: '权限管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '创建权限',
    code: 'PERMISSION_CREATE',
    description: '允许创建新权限',
    category: '权限管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '编辑权限',
    code: 'PERMISSION_EDIT',
    description: '允许编辑权限信息',
    category: '权限管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '删除权限',
    code: 'PERMISSION_DELETE',
    description: '允许删除权限',
    category: '权限管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '查看仪表盘',
    code: 'DASHBOARD_VIEW',
    description: '允许查看系统仪表盘',
    category: '系统管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '系统设置',
    code: 'SYSTEM_SETTINGS',
    description: '允许修改系统设置',
    category: '系统管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '查看日志',
    code: 'LOG_VIEW',
    description: '允许查看系统日志',
    category: '系统管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '创建Agent',
    code: 'AGENT_CREATE',
    description: '允许创建新的Agent',
    category: 'Agent管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '编辑Agent',
    code: 'AGENT_EDIT',
    description: '允许编辑Agent信息',
    category: 'Agent管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '删除Agent',
    code: 'AGENT_DELETE',
    description: '允许删除Agent',
    category: 'Agent管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '启动/停止Agent',
    code: 'AGENT_CONTROL',
    description: '允许启动或停止Agent',
    category: 'Agent管理',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 模拟角色数据
export const mockRoles: Role[] = [
  {
    id: uuidv4(),
    name: '超级管理员',
    description: '拥有系统所有权限',
    permissions: mockPermissions,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '普通管理员',
    description: '拥有大部分管理权限，但不能管理权限和角色',
    permissions: mockPermissions.filter(p => 
      !['PERMISSION_CREATE', 'PERMISSION_EDIT', 'PERMISSION_DELETE', 
        'ROLE_CREATE', 'ROLE_EDIT', 'ROLE_DELETE'].includes(p.code)
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '用户管理员',
    description: '只能管理用户',
    permissions: mockPermissions.filter(p => 
      ['USER_VIEW', 'USER_CREATE', 'USER_EDIT', 'USER_DELETE', 'USER_RESET_PASSWORD'].includes(p.code)
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: '普通用户',
    description: '只有基本查看权限',
    permissions: mockPermissions.filter(p => 
      ['USER_VIEW', 'ROLE_VIEW', 'PERMISSION_VIEW', 'DASHBOARD_VIEW'].includes(p.code)
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    name: 'Agent管理员',
    description: '管理Agent的创建和运行',
    permissions: mockPermissions.filter(p => 
      p.category === 'Agent管理' || ['DASHBOARD_VIEW'].includes(p.code)
    ),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 模拟用户数据
export const mockUsers: User[] = [
  {
    id: uuidv4(),
    username: 'admin',
    email: 'admin@liqpro.ai',
    fullName: '系统管理员',
    roles: [mockRoles[0]], // 超级管理员
    isActive: true,
    lastLogin: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    username: 'manager',
    email: 'manager@liqpro.ai',
    fullName: '普通管理员',
    roles: [mockRoles[1]], // 普通管理员
    isActive: true,
    lastLogin: new Date(Date.now() - 86400000).toISOString(), // 1天前
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    username: 'user_admin',
    email: 'user_admin@liqpro.ai',
    fullName: '用户管理员',
    roles: [mockRoles[2]], // 用户管理员
    isActive: true,
    lastLogin: new Date(Date.now() - 172800000).toISOString(), // 2天前
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    username: 'user1',
    email: 'user1@liqpro.ai',
    fullName: '测试用户1',
    roles: [mockRoles[3]], // 普通用户
    isActive: true,
    lastLogin: new Date(Date.now() - 259200000).toISOString(), // 3天前
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    username: 'user2',
    email: 'user2@liqpro.ai',
    fullName: '测试用户2',
    roles: [mockRoles[3]], // 普通用户
    isActive: false,
    lastLogin: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: uuidv4(),
    username: 'agent_admin',
    email: 'agent_admin@liqpro.ai',
    fullName: 'Agent管理员',
    roles: [mockRoles[4]], // Agent管理员
    isActive: true,
    lastLogin: new Date(Date.now() - 345600000).toISOString(), // 4天前
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

// 模拟权限类别数据
export const mockPermissionCategories = [
  {
    id: uuidv4(),
    name: '用户管理',
    description: '用户相关的权限',
  },
  {
    id: uuidv4(),
    name: '角色管理',
    description: '角色相关的权限',
  },
  {
    id: uuidv4(),
    name: '权限管理',
    description: '权限相关的权限',
  },
  {
    id: uuidv4(),
    name: '系统管理',
    description: '系统相关的权限',
  },
  {
    id: uuidv4(),
    name: 'Agent管理',
    description: 'Agent相关的权限',
  },
]; 