import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

interface ProtectedRouteProps {
  requiredRoles?: string[];
}

/**
 * 受保护路由组件
 * 用于保护需要认证的路由
 * 如果用户未认证，则重定向到登录页面
 * 如果指定了requiredRoles，则还会检查用户角色是否满足要求
 */
const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ requiredRoles }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  // 如果正在加载认证状态，显示加载中
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // 如果未认证，重定向到登录页面
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 如果指定了角色要求，检查用户角色是否满足
  if (requiredRoles && requiredRoles.length > 0 && user) {
    const hasRequiredRole = requiredRoles.includes(user.role);
    if (!hasRequiredRole) {
      // 如果用户没有所需角色，重定向到未授权页面
      return <Navigate to="/unauthorized" replace />;
    }
  }

  // 用户已认证且满足角色要求，渲染子路由
  return <Outlet />;
};

export default ProtectedRoute; 