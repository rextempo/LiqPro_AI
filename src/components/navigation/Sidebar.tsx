import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';

// 导航项类型
interface NavItem {
  title: string;
  path: string;
  icon: React.ReactNode;
  children?: NavItem[];
}

/**
 * 侧边栏导航组件
 */
const Sidebar: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  
  // 导航项列表
  const navItems: NavItem[] = [
    {
      title: '仪表盘',
      path: '/',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
        </svg>
      ),
    },
    {
      title: '用户管理',
      path: '/user-management',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      ),
      children: [
        {
          title: '用户列表',
          path: '/user-management/users',
          icon: <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>,
        },
        {
          title: '角色管理',
          path: '/user-management/roles',
          icon: <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>,
        },
        {
          title: '权限管理',
          path: '/user-management/permissions',
          icon: <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>,
        },
        {
          title: 'API密钥',
          path: '/user-management/api-keys',
          icon: <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>,
        },
        {
          title: '会话监控',
          path: '/user-management/sessions',
          icon: <span className="w-3 h-3 bg-gray-400 rounded-full mr-2"></span>,
        },
      ],
    },
    {
      title: '个人设置',
      path: '/user-management/settings',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
  ];
  
  // 判断导航项是否激活
  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };
  
  // 切换侧边栏折叠状态
  const toggleCollapsed = () => {
    setCollapsed(!collapsed);
  };
  
  // 渲染导航项
  const renderNavItem = (item: NavItem, level = 0) => {
    const active = isActive(item.path);
    const hasChildren = item.children && item.children.length > 0;
    const [expanded, setExpanded] = useState(active);
    
    // 切换子菜单展开状态
    const toggleExpand = (e: React.MouseEvent) => {
      if (hasChildren) {
        e.preventDefault();
        setExpanded(!expanded);
      }
    };
    
    return (
      <div key={item.path} className="mb-2">
        <NavLink
          to={hasChildren ? '#' : item.path}
          onClick={hasChildren ? toggleExpand : undefined}
          className={({ isActive }) => 
            `flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              active
                ? 'bg-blue-100 text-blue-700'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`
          }
        >
          <div className="mr-3">{item.icon}</div>
          {!collapsed && (
            <>
              <span className="flex-1">{item.title}</span>
              {hasChildren && (
                <svg
                  className={`w-5 h-5 transition-transform ${expanded ? 'transform rotate-90' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              )}
            </>
          )}
        </NavLink>
        
        {hasChildren && expanded && !collapsed && (
          <div className="mt-2 ml-8 space-y-1">
            {item.children?.map(child => renderNavItem(child, level + 1))}
          </div>
        )}
      </div>
    );
  };
  
  return (
    <div
      className={`bg-white border-r border-gray-200 transition-all duration-300 ${
        collapsed ? 'w-20' : 'w-64'
      }`}
    >
      <div className="h-full flex flex-col">
        {/* 侧边栏头部 */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200">
          {!collapsed && <h1 className="text-xl font-bold text-gray-900">LiqPro</h1>}
          <button
            onClick={toggleCollapsed}
            className="p-1 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              {collapsed ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
              )}
            </svg>
          </button>
        </div>
        
        {/* 导航菜单 */}
        <div className="flex-1 overflow-y-auto py-4 px-3">
          <nav className="space-y-1">
            {navItems.map(item => renderNavItem(item))}
          </nav>
        </div>
      </div>
    </div>
  );
};

export default Sidebar; 