import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';

// 模拟钱包连接库的接口
interface Wallet {
  publicKey: string;
  signMessage: (message: Uint8Array) => Promise<Uint8Array>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  isConnected: boolean;
}

// 模拟钱包提供者
const mockWallet: Wallet = {
  publicKey: '',
  isConnected: false,
  connect: async () => {
    // 模拟连接过程
    await new Promise(resolve => setTimeout(resolve, 1000));
    mockWallet.publicKey = 'mock-wallet-address-' + Math.random().toString(36).substring(2, 10);
    mockWallet.isConnected = true;
  },
  disconnect: async () => {
    // 模拟断开连接过程
    await new Promise(resolve => setTimeout(resolve, 500));
    mockWallet.publicKey = '';
    mockWallet.isConnected = false;
  },
  signMessage: async (message: Uint8Array) => {
    // 模拟签名过程
    await new Promise(resolve => setTimeout(resolve, 800));
    // 返回一个模拟的签名
    return new Uint8Array([...message, ...new Uint8Array(64).fill(1)]);
  }
};

interface WalletConnectProps {
  onSuccess?: () => void;
  buttonText?: string;
  className?: string;
}

/**
 * 钱包连接组件
 * 用于连接钱包并进行认证
 */
const WalletConnect: React.FC<WalletConnectProps> = ({
  onSuccess,
  buttonText = '连接钱包',
  className = ''
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { loginWithWallet, isAuthenticated } = useAuth();

  // 当组件卸载时断开钱包连接
  useEffect(() => {
    return () => {
      if (mockWallet.isConnected) {
        mockWallet.disconnect().catch(console.error);
      }
    };
  }, []);

  const connectWallet = async () => {
    try {
      setIsConnecting(true);
      setError(null);

      // 连接钱包
      await mockWallet.connect();
      
      // 生成认证消息
      const message = new TextEncoder().encode(
        `Sign this message to authenticate with LiqPro: ${Date.now()}`
      );
      
      // 签名消息
      const signature = await mockWallet.signMessage(message);
      
      // 使用钱包地址和签名进行登录
      await loginWithWallet(
        mockWallet.publicKey,
        Buffer.from(signature).toString('base64')
      );
      
      // 调用成功回调
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Wallet connection error:', err);
      setError(err.message || '连接钱包失败');
      
      // 如果发生错误，确保断开钱包连接
      if (mockWallet.isConnected) {
        await mockWallet.disconnect().catch(console.error);
      }
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`wallet-connect ${className}`}>
      {error && (
        <div className="text-red-500 mb-4 p-2 bg-red-50 rounded-md">
          {error}
        </div>
      )}
      
      <button
        onClick={connectWallet}
        disabled={isConnecting || isAuthenticated}
        className={`
          px-4 py-2 rounded-md font-medium
          ${isConnecting ? 'bg-gray-300 cursor-not-allowed' : 'bg-blue-500 hover:bg-blue-600 text-white'}
          ${isAuthenticated ? 'bg-green-500 cursor-not-allowed' : ''}
          transition-colors duration-200
        `}
      >
        {isConnecting ? (
          <span className="flex items-center">
            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            连接中...
          </span>
        ) : isAuthenticated ? (
          '已连接'
        ) : (
          buttonText
        )}
      </button>
    </div>
  );
};

export default WalletConnect; 