import React from 'react';
import { Route } from 'react-router-dom';
import AgentList from './AgentList';
import AgentCreate from './AgentCreate';
import AgentDetail from './AgentDetail';
import AgentControls from './AgentControls';
import HealthDashboard from './HealthDashboard';

const AgentRoutes = (
  <>
    <Route path="agents" element={<AgentList />} />
    <Route path="agents/create" element={<AgentCreate />} />
    <Route path="agents/:id" element={<AgentDetail />} />
    <Route path="agents/:id/controls" element={<AgentControls />} />
    <Route path="agents/:id/health" element={<HealthDashboard />} />
  </>
);

export default AgentRoutes; 