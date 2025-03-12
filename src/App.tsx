import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import ProtectedRoute from './components/ProtectedRoute/index';
import MainLayout from './components/Layout/MainLayout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/NotFound';
import { 
  AgentList, 
  AgentCreate, 
  AgentDetail, 
  AgentControls, 
  AgentHealth 
} from './pages/Agent';
import { lazyLoad } from './utils/lazyLoad';
import { userManagementRoutes } from './routes/userManagementRoutes';

// Lazy load user management components
const UserManagementPage = lazyLoad(() => import('./pages/UserManagementPage'), {
  preload: false,
});

// Lazy load individual user management components
const UserManagement = lazyLoad(() => import('./components/user/UserManagement'));
const RoleManagement = lazyLoad(() => import('./components/user/RoleManagement'));
const PermissionManagement = lazyLoad(() => import('./components/user/PermissionManagement'));
const ApiKeyManagement = lazyLoad(() => import('./components/user/ApiKeyManagement'));
const SessionMonitoring = lazyLoad(() => import('./components/user/SessionMonitoring'));
const UserSettings = lazyLoad(() => import('./components/user/UserSettings'));

/**
 * Unauthorized page
 */
const UnauthorizedPage: React.FC = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
    <h1 className="text-3xl font-bold text-red-600 mb-4">访问被拒绝</h1>
    <p className="text-xl text-gray-700 mb-8">您没有权限访问此页面</p>
    <a href="/login" className="btn-primary">返回登录</a>
  </div>
);

/**
 * App component
 */
const App: React.FC = () => {
  // WebSocket服务器URL
  const wsUrl = process.env.REACT_APP_WS_URL || 'wss://api.liqpro.com/ws';

  return (
    <AuthProvider>
      <WebSocketProvider url={wsUrl}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            
            <Route path="/" element={<ProtectedRoute />}>
              <Route element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Agent routes */}
                <Route path="agents" element={<AgentList />} />
                <Route path="agents/create" element={<AgentCreate />} />
                <Route path="agents/:id" element={<AgentDetail />} />
                <Route path="agents/:id/controls" element={<AgentControls />} />
                <Route path="agents/:id/health" element={<AgentHealth />} />
                
                {/* User Management routes */}
                <Route path="user-management" element={<UserManagementPage />}>
                  <Route index element={<UserManagement />} />
                  <Route path="users" element={<UserManagement />} />
                  <Route path="roles" element={<RoleManagement />} />
                  <Route path="permissions" element={<PermissionManagement />} />
                  <Route path="api-keys" element={<ApiKeyManagement />} />
                  <Route path="sessions" element={<SessionMonitoring />} />
                  <Route path="settings" element={<UserSettings />} />
                </Route>
              </Route>
            </Route>
            
            {/* Admin routes */}
            <Route element={<ProtectedRoute requiredRoles={['admin']} />}>
              <Route path="/admin" element={<div className="card m-4 p-4">Admin Page</div>} />
            </Route>
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </AuthProvider>
  );
};

export default App; 