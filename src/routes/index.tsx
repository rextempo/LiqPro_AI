import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import AgentRoutes from './AgentRoutes';
import Dashboard from '../pages/Dashboard';
import Login from '../pages/Login';
import NotFound from '../pages/NotFound';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * 应用主路由组件
 */
const AppRoutes: React.FC = () => {
  return (
    <Routes>
      {/* 公共路由 */}
      <Route path="/login" element={<Login />} />
      
      {/* 受保护的路由 */}
      <Route path="/" element={<ProtectedRoute />}>
        {/* 仪表盘 */}
        <Route index element={<Dashboard />} />
        
        {/* Agent相关路由 */}
        <Route path="agents/*" element={<AgentRoutes />} />
        
        {/* 重定向根路径到仪表盘 */}
        <Route path="" element={<Navigate to="/" replace />} />
      </Route>
      
      {/* 404页面 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
};

export default AppRoutes; 