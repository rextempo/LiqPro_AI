import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AuthClient } from '../api/clients/auth-client';

// 定义用户类型
export interface User {
  id: string;
  walletAddress?: string;
  username?: string;
  email?: string;
  role: string;
  createdAt: string;
  lastLogin: string;
}

// 定义认证上下文类型
interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  loginWithWallet: (walletAddress: string, signature: string) => Promise<void>;
  loginWithApiKey: (apiKey: string, apiSecret: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

// 创建认证上下文
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 认证提供者属性
interface AuthProviderProps {
  children: ReactNode;
}

// 认证提供者组件
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const authClient = new AuthClient();

  // 初始化时检查用户会话
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const isValid = await authClient.validateSession();
        
        if (isValid) {
          const currentUser = await authClient.getCurrentUser();
          setUser(currentUser);
          setIsAuthenticated(true);
        }
      } catch (err) {
        console.error('Authentication initialization error:', err);
        setError('Failed to initialize authentication');
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // 使用钱包登录
  const loginWithWallet = async (walletAddress: string, signature: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authClient.loginWithWallet(walletAddress, signature);
      const currentUser = await authClient.getCurrentUser();
      
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Wallet login error:', err);
      setError(err.message || 'Failed to login with wallet');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 使用API密钥登录
  const loginWithApiKey = async (apiKey: string, apiSecret: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      await authClient.loginWithApiKey(apiKey, apiSecret);
      const currentUser = await authClient.getCurrentUser();
      
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('API key login error:', err);
      setError(err.message || 'Failed to login with API key');
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = async () => {
    try {
      setIsLoading(true);
      await authClient.logout();
      
      setUser(null);
      setIsAuthenticated(false);
    } catch (err: any) {
      console.error('Logout error:', err);
      setError(err.message || 'Failed to logout');
    } finally {
      setIsLoading(false);
    }
  };

  // 刷新会话
  const refreshSession = async () => {
    try {
      setIsLoading(true);
      await authClient.refreshAccessToken();
      
      const currentUser = await authClient.getCurrentUser();
      setUser(currentUser);
      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('Session refresh error:', err);
      setError(err.message || 'Failed to refresh session');
      
      // 如果刷新失败，清除用户状态
      setUser(null);
      setIsAuthenticated(false);
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    user,
    isAuthenticated,
    isLoading,
    error,
    loginWithWallet,
    loginWithApiKey,
    logout,
    refreshSession
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// 自定义钩子，用于在组件中访问认证上下文
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}; 