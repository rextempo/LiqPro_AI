import React from 'react';
import { Outlet } from 'react-router-dom';
import UserManagementSystem from '../components/user/UserManagementSystem';

/**
 * 用户管理系统页面
 * 作为用户管理系统的入口页面
 */
const UserManagementPage: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">用户管理系统</h1>
      <UserManagementSystem />
    </div>
  );
};

export default UserManagementPage; 