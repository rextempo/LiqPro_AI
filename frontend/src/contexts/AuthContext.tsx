import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@chakra-ui/react';
import { authClient } from '../api';
import { UserProfile } from '../api/types';

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: UserProfile | null;
  loginWithWallet: (walletAddress: string, signature: string) => Promise<boolean>;
  loginWithApiKey: (apiKey: string) => Promise<boolean>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [user, setUser] = useState<UserProfile | null>(null);
  const navigate = useNavigate();
  const toast = useToast();

  // 初始化认证状态
  useEffect(() => {
    const initAuth = async () => {
      try {
        setIsLoading(true);
        const isAuth = await checkAuthStatus();
        setIsAuthenticated(isAuth);
      } catch (error) {
        console.error('初始化认证状态失败:', error);
        setIsAuthenticated(false);
      } finally {
        setIsLoading(false);
      }
    };

    initAuth();
  }, []);

  // 检查认证状态
  const checkAuthStatus = async (): Promise<boolean> => {
    // 本地测试环境自动认证
    if (process.env.NODE_ENV === 'development') {
      console.log('本地测试环境：自动认证用户');
      
      // 设置默认用户信息
      setUser({
        id: 'test-user-id',
        walletAddress: 'test-wallet-address',
        username: '测试用户',
        email: 'test@example.com',
        role: 'user',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        preferences: {
          theme: 'light',
          notifications: true,
          language: 'zh-CN'
        }
      });
      
      return true;
    }
    
    // 正常认证流程（生产环境）
    // 初始化认证客户端
    const isInitialized = authClient.initAuth();
    
    if (!isInitialized) {
      return false;
    }
    
    try {
      // 验证会话
      const validateResponse = await authClient.validateSession();
      
      if (validateResponse.success && validateResponse.data?.valid) {
        // 获取用户信息
        const userResponse = await authClient.getCurrentUser();
        
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
          return true;
        }
      }
      
      return false;
    } catch (error) {
      console.error('验证会话失败:', error);
      return false;
    }
  };

  // 使用钱包登录
  const loginWithWallet = async (walletAddress: string, signature: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authClient.loginWithWallet(walletAddress, signature);
      
      if (response.success) {
        setIsAuthenticated(true);
        
        // 获取用户信息
        const userResponse = await authClient.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
        }
        
        toast({
          title: '登录成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        return true;
      } else {
        toast({
          title: '登录失败',
          description: response.error?.message || '无法使用钱包登录',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        
        return false;
      }
    } catch (error) {
      console.error('钱包登录失败:', error);
      
      toast({
        title: '登录失败',
        description: '发生错误，请稍后重试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 使用API密钥登录
  const loginWithApiKey = async (apiKey: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const response = await authClient.loginWithApiKey(apiKey);
      
      if (response.success) {
        setIsAuthenticated(true);
        
        // 获取用户信息
        const userResponse = await authClient.getCurrentUser();
        if (userResponse.success && userResponse.data) {
          setUser(userResponse.data);
        }
        
        toast({
          title: 'API密钥登录成功',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        return true;
      } else {
        toast({
          title: '登录失败',
          description: response.error?.message || '无效的API密钥',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        
        return false;
      }
    } catch (error) {
      console.error('API密钥登录失败:', error);
      
      toast({
        title: '登录失败',
        description: '发生错误，请稍后重试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // 登出
  const logout = async (): Promise<void> => {
    try {
      setIsLoading(true);
      await authClient.logout();
      setIsAuthenticated(false);
      setUser(null);
      
      toast({
        title: '已登出',
        status: 'info',
        duration: 3000,
        isClosable: true,
      });
      
      navigate('/');
    } catch (error) {
      console.error('登出失败:', error);
      
      toast({
        title: '登出失败',
        description: '发生错误，请稍后重试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const value = {
    isAuthenticated,
    isLoading,
    user,
    loginWithWallet,
    loginWithApiKey,
    logout,
    checkAuthStatus,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export default AuthContext; 