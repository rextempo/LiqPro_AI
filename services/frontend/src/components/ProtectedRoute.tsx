import React from 'react';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { Box, Spinner, Center } from '@chakra-ui/react';
import { useAuth } from '../contexts/AuthContext';

const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  // 如果正在加载认证状态，显示加载指示器
  if (isLoading) {
    return (
      <Center h="100vh">
        <Box textAlign="center">
          <Spinner size="xl" color="primary.500" thickness="4px" speed="0.65s" />
          <Box mt={4}>验证身份中...</Box>
        </Box>
      </Center>
    );
  }

  // 如果未认证，重定向到登录页面，并保存当前位置
  if (!isAuthenticated) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 如果已认证，渲染子路由
  return <Outlet />;
};

export default ProtectedRoute; 