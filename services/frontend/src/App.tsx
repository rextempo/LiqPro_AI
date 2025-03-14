import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Box } from '@chakra-ui/react';

// Pages
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import AgentDetailPage from './pages/AgentDetailPage';
import CreateAgentPage from './pages/CreateAgentPage';
import SettingsPage from './pages/SettingsPage';
import NotFoundPage from './pages/NotFoundPage';

// Components
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';

const App: React.FC = () => {
  return (
    <Box>
      <Routes>
        {/* 公共路由 */}
        <Route path="/" element={<LoginPage />} />
        
        {/* 受保护路由 */}
        <Route element={<ProtectedRoute />}>
          <Route element={<Layout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/agent/create" element={<CreateAgentPage />} />
            <Route path="/agent/:agentId" element={<AgentDetailPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>
        </Route>
        
        {/* 404页面 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Box>
  );
};

export default App; 