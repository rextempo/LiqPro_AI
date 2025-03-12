import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AgentList, AgentCreate, AgentDetail } from '../components/Agent';
import { ProtectedRoute } from './ProtectedRoute';

/**
 * Agent相关路由组件
 */
const AgentRoutes: React.FC = () => {
  return (
    <Routes>
      <Route path="/" element={<ProtectedRoute />}>
        {/* Agent列表页面 */}
        <Route index element={<AgentList />} />
        
        {/* 创建Agent页面 */}
        <Route path="create" element={<AgentCreate />} />
        
        {/* Agent详情页面 */}
        <Route path=":id" element={<AgentDetail />} />
        
        {/* 重定向其他路径到Agent列表 */}
        <Route path="*" element={<Navigate to="/agents" replace />} />
      </Route>
    </Routes>
  );
};

export default AgentRoutes; 