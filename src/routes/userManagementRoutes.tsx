import React from 'react';
import { RouteObject } from 'react-router-dom';
import UserManagementPage from '../pages/UserManagementPage';
import UserManagement from '../components/user/UserManagement';
import RoleManagement from '../components/user/RoleManagement';
import PermissionManagement from '../components/user/PermissionManagement';
import ApiKeyManagement from '../components/user/ApiKeyManagement';
import SessionMonitoring from '../components/user/SessionMonitoring';
import UserSettings from '../components/user/UserSettings';

/**
 * 用户管理系统路由配置
 */
export const userManagementRoutes: RouteObject[] = [
  {
    path: 'user-management',
    element: <UserManagementPage />,
    children: [
      {
        index: true,
        element: <UserManagement />,
      },
      {
        path: 'users',
        element: <UserManagement />,
      },
      {
        path: 'roles',
        element: <RoleManagement />,
      },
      {
        path: 'permissions',
        element: <PermissionManagement />,
      },
      {
        path: 'api-keys',
        element: <ApiKeyManagement />,
      },
      {
        path: 'sessions',
        element: <SessionMonitoring />,
      },
      {
        path: 'settings',
        element: <UserSettings />,
      },
    ],
  },
]; 