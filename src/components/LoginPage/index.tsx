import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import WalletConnect from '../WalletConnect';

/**
 * 登录页面组件
 * 提供钱包登录和API密钥登录两种方式
 */
const LoginPage: React.FC = () => {
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loginMethod, setLoginMethod] = useState<'wallet' | 'apiKey'>('wallet');
  
  const { loginWithApiKey, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // 获取重定向路径，如果没有则默认为首页
  const from = location.state?.from?.pathname || '/';
  
  // 如果已经认证，重定向到之前的页面
  React.useEffect(() => {
    if (isAuthenticated) {
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, navigate, from]);
  
  // 处理API密钥登录
  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey || !apiSecret) {
      setError('请输入API密钥和密钥');
      return;
    }
    
    try {
      setIsLoading(true);
      setError(null);
      
      await loginWithApiKey(apiKey, apiSecret);
      // 登录成功后会通过上面的useEffect自动重定向
    } catch (err: any) {
      console.error('API key login error:', err);
      setError(err.message || 'API密钥登录失败');
    } finally {
      setIsLoading(false);
    }
  };
  
  // 钱包登录成功后的回调
  const handleWalletLoginSuccess = () => {
    // 登录成功后会通过上面的useEffect自动重定向
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            登录到 LiqPro
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            AI驱动的Meteora DLMM流动性管理平台
          </p>
        </div>
        
        {/* 登录方式选择 */}
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-4 font-medium ${
              loginMethod === 'wallet'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setLoginMethod('wallet')}
          >
            钱包登录
          </button>
          <button
            className={`py-2 px-4 font-medium ${
              loginMethod === 'apiKey'
                ? 'text-blue-600 border-b-2 border-blue-500'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setLoginMethod('apiKey')}
          >
            API密钥登录
          </button>
        </div>
        
        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-500" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}
        
        {/* 钱包登录 */}
        {loginMethod === 'wallet' && (
          <div className="mt-8 flex justify-center">
            <WalletConnect
              onSuccess={handleWalletLoginSuccess}
              buttonText="使用钱包登录"
              className="w-full"
            />
          </div>
        )}
        
        {/* API密钥登录 */}
        {loginMethod === 'apiKey' && (
          <form className="mt-8 space-y-6" onSubmit={handleApiKeyLogin}>
            <div className="rounded-md shadow-sm -space-y-px">
              <div>
                <label htmlFor="api-key" className="sr-only">
                  API密钥
                </label>
                <input
                  id="api-key"
                  name="apiKey"
                  type="text"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-t-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="API密钥"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  disabled={isLoading}
                />
              </div>
              <div>
                <label htmlFor="api-secret" className="sr-only">
                  API密钥
                </label>
                <input
                  id="api-secret"
                  name="apiSecret"
                  type="password"
                  required
                  className="appearance-none rounded-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-b-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                  placeholder="API密钥"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            </div>
            
            <div>
              <button
                type="submit"
                disabled={isLoading}
                className={`group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white ${
                  isLoading
                    ? 'bg-blue-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    登录中...
                  </span>
                ) : (
                  '登录'
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default LoginPage; 