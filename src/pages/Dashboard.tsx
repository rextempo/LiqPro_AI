import React from 'react';
import { Link } from 'react-router-dom';

/**
 * 仪表盘页面组件
 */
const Dashboard: React.FC = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-800 mb-6">LiqPro 仪表盘</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Agent管理卡片 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Agent管理</h2>
          <p className="text-gray-600 mb-4">
            管理您的自动化投资Agent，查看性能和状态。
          </p>
          <Link
            to="/agents"
            className="inline-block px-4 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors"
          >
            查看Agent
          </Link>
        </div>
        
        {/* LP池卡片 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">LP池</h2>
          <p className="text-gray-600 mb-4">
            浏览和分析可用的LP池，查看收益和风险指标。
          </p>
          <button
            className="inline-block px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md cursor-not-allowed"
            disabled
          >
            即将推出
          </button>
        </div>
        
        {/* 资产概览卡片 */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">资产概览</h2>
          <p className="text-gray-600 mb-4">
            查看您的资产分布和总体投资表现。
          </p>
          <button
            className="inline-block px-4 py-2 bg-gray-200 text-gray-700 font-medium rounded-md cursor-not-allowed"
            disabled
          >
            即将推出
          </button>
        </div>
      </div>
      
      {/* 快速统计 */}
      <div className="mt-8">
        <h2 className="text-2xl font-semibold text-gray-800 mb-4">快速统计</h2>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-gray-500 text-sm">总资产价值</p>
              <p className="text-3xl font-bold text-gray-800">0.00 SOL</p>
              <p className="text-gray-500 text-sm">$0.00</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">活跃Agent</p>
              <p className="text-3xl font-bold text-gray-800">0</p>
              <p className="text-gray-500 text-sm">共0个Agent</p>
            </div>
            <div className="text-center">
              <p className="text-gray-500 text-sm">总收益</p>
              <p className="text-3xl font-bold text-gray-800">0.00 SOL</p>
              <p className="text-gray-500 text-sm">$0.00</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard; 