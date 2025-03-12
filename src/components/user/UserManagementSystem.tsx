import React, { useState } from 'react';
import { Tabs, Card } from '../ui';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import RoleManagement from './RoleManagement';
import PermissionManagement from './PermissionManagement';
import ApiKeyManagement from './ApiKeyManagement';
import SessionMonitoring from './SessionMonitoring';
import UserSettings from './UserSettings';

/**
 * 用户管理系统组件
 * 作为用户管理功能的主入口，整合所有用户管理相关组件
 */
const UserManagementSystem: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  
  // 根据当前路径确定激活的标签页
  const getActiveTab = () => {
    const path = location.pathname;
    if (path.includes('/roles')) return 'roles';
    if (path.includes('/permissions')) return 'permissions';
    if (path.includes('/api-keys')) return 'api-keys';
    if (path.includes('/sessions')) return 'sessions';
    if (path.includes('/settings')) return 'settings';
    return 'users';
  };
  
  // 处理标签页切换
  const handleTabChange = (key: string) => {
    switch (key) {
      case 'roles':
        navigate('/user-management/roles');
        break;
      case 'permissions':
        navigate('/user-management/permissions');
        break;
      case 'api-keys':
        navigate('/user-management/api-keys');
        break;
      case 'sessions':
        navigate('/user-management/sessions');
        break;
      case 'settings':
        navigate('/user-management/settings');
        break;
      default:
        navigate('/user-management/users');
    }
  };
  
  // 渲染标签页内容
  const renderTabContent = () => {
    const activeTab = getActiveTab();
    
    // 如果是通过路由渲染的，使用Outlet
    if (location.pathname !== '/user-management') {
      return <Outlet />;
    }
    
    // 否则根据激活的标签页渲染对应组件
    switch (activeTab) {
      case 'roles':
        return <RoleManagement />;
      case 'permissions':
        return <PermissionManagement />;
      case 'api-keys':
        return <ApiKeyManagement />;
      case 'sessions':
        return <SessionMonitoring />;
      case 'settings':
        return <UserSettings />;
      default:
        return <UserManagement />;
    }
  };
  
  return (
    <div className="space-y-6">
      <Card>
        <Tabs
          activeKey={getActiveTab()}
          onChange={handleTabChange}
          items={[
            {
              key: 'users',
              label: '用户管理',
              children: <div></div>
            },
            {
              key: 'roles',
              label: '角色管理',
              children: <div></div>
            },
            {
              key: 'permissions',
              label: '权限管理',
              children: <div></div>
            },
            {
              key: 'api-keys',
              label: 'API密钥',
              children: <div></div>
            },
            {
              key: 'sessions',
              label: '会话监控',
              children: <div></div>
            },
            {
              key: 'settings',
              label: '个人设置',
              children: <div></div>
            },
          ]}
        />
      </Card>
      
      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default UserManagementSystem; 