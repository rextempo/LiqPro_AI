import React from 'react';
import { createBrowserRouter, RouteObject } from 'react-router-dom';
import AppLayout from '../layouts/AppLayout';
import Dashboard from '../pages/Dashboard';
import NotFound from '../pages/NotFound';
import { userManagementRoutes } from './userManagementRoutes';

// 定义应用程序路由
const routes: RouteObject[] = [
  {
    path: '/',
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
      // 集成用户管理系统路由
      ...userManagementRoutes,
      {
        path: '*',
        element: <NotFound />,
      },
    ],
  },
];

// 创建路由器
const router = createBrowserRouter(routes);

export default router; 