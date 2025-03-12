import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';

// 认证上下文接口
interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
}

// 模拟认证上下文
// 在实际应用中，这应该从AuthContext中获取
const useAuth = (): AuthContextType => {
  // 这里应该使用真实的认证上下文
  // 现在我们假设用户已经认证
  return {
    isAuthenticated: true,
    isLoading: false
  };
};

/**
 * 受保护的路由组件
 * 如果用户未认证，则重定向到登录页面
 */
export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 如果认证状态正在加载，显示加载指示器
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 如果用户未认证，重定向到登录页面
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 如果用户已认证，渲染子路由
  return <Outlet />;
}; 