import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 404页面组件
 */
const NotFound: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full text-center">
        <h1 className="text-9xl font-extrabold text-blue-600">404</h1>
        <h2 className="text-3xl font-bold text-gray-900 mt-4">页面未找到</h2>
        <p className="text-gray-600 mt-2">
          抱歉，您请求的页面不存在或已被移除。
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-block px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            返回首页
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound; 