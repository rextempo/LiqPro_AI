import React from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

/**
 * 主布局组件
 * 包含导航栏和侧边栏
 */
const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  // 检查当前路径是否激活
  const isActive = (path: string) => {
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 顶部导航栏 */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex-shrink-0 flex items-center">
                <Link to="/dashboard" className="text-2xl font-bold text-blue-600">LiqPro</Link>
              </div>
            </div>
            <div className="flex items-center">
              <span className="text-gray-700 mr-4">
                {user?.username || '用户'}
              </span>
              <button
                onClick={logout}
                className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                退出
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="flex">
        {/* 侧边栏 */}
        <div className="w-64 bg-white shadow-md h-screen">
          <div className="py-4 px-2">
            <ul className="space-y-2">
              <li>
                <Link
                  to="/dashboard"
                  className={`flex items-center px-4 py-2 text-gray-700 rounded-lg ${
                    isActive('/dashboard') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="ml-3">仪表盘</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/agents"
                  className={`flex items-center px-4 py-2 text-gray-700 rounded-lg ${
                    isActive('/agents') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="ml-3">Agent管理</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/pools"
                  className={`flex items-center px-4 py-2 text-gray-700 rounded-lg ${
                    isActive('/pools') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="ml-3">LP池</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/assets"
                  className={`flex items-center px-4 py-2 text-gray-700 rounded-lg ${
                    isActive('/assets') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="ml-3">资产概览</span>
                </Link>
              </li>
              <li>
                <Link
                  to="/settings"
                  className={`flex items-center px-4 py-2 text-gray-700 rounded-lg ${
                    isActive('/settings') ? 'bg-blue-100 text-blue-700' : 'hover:bg-gray-100'
                  }`}
                >
                  <span className="ml-3">设置</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* 主内容区域 */}
        <div className="flex-1 p-6">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default MainLayout; 