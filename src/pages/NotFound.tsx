import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 404页面组件
 */
const NotFound: React.FC = () => {
  return (
    <div className="min-h-full flex flex-col items-center justify-center py-12">
      <div className="text-center">
        <h1 className="text-9xl font-bold text-blue-600">404</h1>
        <h2 className="mt-4 text-3xl font-bold text-gray-900">页面未找到</h2>
        <p className="mt-2 text-base text-gray-500">抱歉，我们找不到您请求的页面。</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 