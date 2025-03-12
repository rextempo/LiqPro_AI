import React, { useState, useEffect } from 'react';
import {
  Button,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  HStack,
  Icon,
  useColorModeValue,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { FiChevronDown, FiWifi, FiWifiOff } from 'react-icons/fi';
import { IconWrapper, ButtonIcon } from '../IconWrapper';
import { useAuth } from '../../contexts/AuthContext';

// 钱包接口
interface Wallet {
  id: string;
  name: string;
  icon: string;
  isInstalled: () => boolean;
  connect: () => Promise<{ address: string; signature: string } | null>;
}

const WalletConnect: React.FC = () => {
  const { loginWithWallet } = useAuth();
  const toast = useToast();
  const [connecting, setConnecting] = useState(false);
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  const buttonBg = useColorModeValue('white', 'gray.700');
  const buttonBorder = useColorModeValue('gray.200', 'gray.600');

  // 检查本地存储的钱包连接状态
  useEffect(() => {
    const storedAddress = localStorage.getItem('wallet_address');
    if (storedAddress) {
      setWalletAddress(storedAddress);
      setConnected(true);
    }
  }, []);

  // 可用钱包列表
  const wallets: Wallet[] = [
    {
      id: 'phantom',
      name: 'Phantom',
      icon: '👻',
      isInstalled: () => {
        const installed = window.solana !== undefined && window.solana.isPhantom === true;
        console.log(`[WalletConnect] Phantom钱包安装状态: ${installed}`);
        if (installed) {
          console.log(`[WalletConnect] Phantom钱包详情:`, window.solana);
        }
        return installed;
      },
      connect: async () => {
        try {
          // 检查Phantom钱包是否已安装
          if (!window.solana || !window.solana.isPhantom) {
            console.error('[WalletConnect] 未检测到Phantom钱包');
            toast({
              title: '未检测到Phantom钱包',
              description: '请安装Phantom钱包扩展',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return null;
          }

          console.log('[WalletConnect] 尝试连接Phantom钱包');
          
          // 连接到钱包
          try {
            await window.solana.connect();
            console.log('[WalletConnect] Phantom钱包连接成功');
          } catch (connectError) {
            console.error('[WalletConnect] Phantom钱包连接失败:', connectError);
            return null;
          }
          
          if (!window.solana.publicKey) {
            console.error('[WalletConnect] Phantom钱包连接成功但未获取到publicKey');
            return null;
          }
          
          const address = window.solana.publicKey.toString();
          console.log(`[WalletConnect] Phantom钱包地址: ${address.substring(0, 8)}...`);

          // 创建要签名的消息
          const message = `登录LiqPro: ${new Date().toISOString()}`;
          const encodedMessage = new TextEncoder().encode(message);
          console.log('[WalletConnect] 请求Phantom钱包签名');

          // 请求签名
          try {
            const signatureData = await window.solana.signMessage(encodedMessage, 'utf8');
            console.log('[WalletConnect] Phantom钱包签名成功');
            const signature = Buffer.from(signatureData.signature).toString('hex');
            return { address, signature };
          } catch (signError) {
            console.error('[WalletConnect] Phantom钱包签名失败:', signError);
            return null;
          }
        } catch (error) {
          console.error('[WalletConnect] Phantom钱包连接过程中发生错误:', error);
          return null;
        }
      },
    },
    {
      id: 'solflare',
      name: 'Solflare',
      icon: '🔆',
      isInstalled: () => window.solflare !== undefined,
      connect: async () => {
        try {
          // 检查Solflare钱包是否已安装
          if (!window.solflare) {
            toast({
              title: '未检测到Solflare钱包',
              description: '请安装Solflare钱包扩展',
              status: 'error',
              duration: 5000,
              isClosable: true,
            });
            return null;
          }

          // 连接到钱包
          await window.solflare.connect();
          const address = window.solflare.publicKey.toString();

          // 创建要签名的消息
          const message = `登录LiqPro: ${new Date().toISOString()}`;
          const encodedMessage = new TextEncoder().encode(message);

          // 请求签名
          const signatureData = await window.solflare.signMessage(encodedMessage, 'utf8');
          const signature = Buffer.from(signatureData.signature).toString('hex');

          return { address, signature };
        } catch (error) {
          console.error('Solflare钱包连接失败:', error);
          return null;
        }
      },
    },
    // 可以添加更多钱包支持
  ];

  // 连接钱包
  const connectWallet = async (wallet: Wallet) => {
    try {
      setConnecting(true);
      console.log(`[WalletConnect] 开始连接 ${wallet.name} 钱包`);

      // 检查钱包是否已安装
      if (!wallet.isInstalled()) {
        console.error(`[WalletConnect] ${wallet.name} 钱包未安装`);
        toast({
          title: `未检测到${wallet.name}钱包`,
          description: `请安装${wallet.name}钱包扩展`,
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      console.log(`[WalletConnect] ${wallet.name} 钱包已安装，尝试连接`);
      // 连接钱包并获取地址和签名
      const result = await wallet.connect();
      
      if (!result) {
        console.error(`[WalletConnect] ${wallet.name} 钱包连接失败，未返回结果`);
        toast({
          title: '钱包连接失败',
          description: '无法连接到钱包或用户拒绝了连接请求',
          status: 'error',
          duration: 5000,
          isClosable: true,
        });
        return;
      }

      const { address, signature } = result;
      console.log(`[WalletConnect] ${wallet.name} 钱包连接成功，地址: ${address.substring(0, 8)}...`);

      // 使用钱包地址和签名登录
      console.log(`[WalletConnect] 尝试使用钱包登录`);
      const loginSuccess = await loginWithWallet(address, signature);
      
      if (loginSuccess) {
        console.log(`[WalletConnect] 登录成功`);
        // 保存钱包地址到本地存储
        localStorage.setItem('wallet_address', address);
        setWalletAddress(address);
        setConnected(true);
        
        toast({
          title: '钱包已连接',
          description: `已成功连接到 ${wallet.name}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      } else {
        console.error(`[WalletConnect] 登录失败`);
      }
    } catch (error) {
      console.error(`[WalletConnect] ${wallet.name} 钱包连接失败:`, error);
      
      toast({
        title: '钱包连接失败',
        description: '发生错误，请稍后重试',
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setConnecting(false);
    }
  };

  // 断开钱包连接
  const disconnectWallet = () => {
    // 清除本地存储的钱包地址
    localStorage.removeItem('wallet_address');
    setWalletAddress(null);
    setConnected(false);
    
    // 尝试断开钱包连接
    try {
      if (window.solana && window.solana.disconnect) {
        window.solana.disconnect();
      }
      if (window.solflare && window.solflare.disconnect) {
        window.solflare.disconnect();
      }
    } catch (error) {
      console.error('断开钱包连接失败:', error);
    }
    
    toast({
      title: '钱包已断开',
      status: 'info',
      duration: 3000,
      isClosable: true,
    });
  };

  // 格式化钱包地址显示
  const formatAddress = (address: string): string => {
    if (!address) return '';
    return `${address.substring(0, 4)}...${address.substring(address.length - 4)}`;
  };

  return (
    <Menu>
      <MenuButton
        as={Button}
        rightIcon={<ButtonIcon icon={FiChevronDown} />}
        bg={buttonBg}
        borderWidth="1px"
        borderColor={buttonBorder}
        _hover={{ bg: useColorModeValue('gray.50', 'gray.700') }}
        _active={{ bg: useColorModeValue('gray.100', 'gray.600') }}
        isLoading={connecting}
        loadingText="连接中..."
        spinner={<Spinner size="sm" />}
      >
        {connected && walletAddress ? (
          <HStack>
            <IconWrapper icon={FiWifi} color="success.500" />
            <Text>{formatAddress(walletAddress)}</Text>
          </HStack>
        ) : (
          <HStack>
            <IconWrapper icon={FiWifiOff} color="gray.500" />
            <Text>连接钱包</Text>
          </HStack>
        )}
      </MenuButton>
      
      <MenuList>
        {connected ? (
          <>
            <MenuItem
              onClick={disconnectWallet}
              icon={<IconWrapper icon={FiWifiOff} color="gray.500" />}
            >
              断开连接
            </MenuItem>
          </>
        ) : (
          <>
            {wallets.map((wallet) => (
              <MenuItem
                key={wallet.id}
                onClick={() => connectWallet(wallet)}
                icon={<Text>{wallet.icon}</Text>}
                isDisabled={connecting}
              >
                {wallet.name}
              </MenuItem>
            ))}
          </>
        )}
      </MenuList>
    </Menu>
  );
};

// 为TypeScript添加全局钱包类型定义
declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      publicKey: { toString: () => string };
      on: (event: string, callback: (...args: any[]) => void) => void;
      off: (event: string, callback: (...args: any[]) => void) => void;
    };
    solflare?: {
      connect: () => Promise<{ publicKey: { toString: () => string } }>;
      disconnect: () => Promise<void>;
      signMessage: (message: Uint8Array, encoding: string) => Promise<{ signature: Uint8Array }>;
      publicKey: { toString: () => string };
      on: (event: string, callback: (...args: any[]) => void) => void;
      off: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

export default WalletConnect; 