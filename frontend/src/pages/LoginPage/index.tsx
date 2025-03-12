import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Button,
  Container,
  Flex,
  Heading,
  Text,
  VStack,
  HStack,
  useColorModeValue,
  Tabs,
  TabList,
  TabPanels,
  Tab,
  TabPanel,
  FormControl,
  FormLabel,
  Input,
  InputGroup,
  InputRightElement,
  IconButton,
  Divider,
  useToast,
  Spinner,
} from '@chakra-ui/react';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import { ButtonIcon } from '../../components/IconWrapper';
import { useAuth } from '../../contexts/AuthContext';
import WalletConnect from '../../components/WalletConnect';

interface LocationState {
  from?: {
    pathname: string;
  };
}

const LoginPage: React.FC = () => {
  const { isAuthenticated, isLoading, loginWithApiKey } = useAuth();
  const [apiKey, setApiKey] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const bgColor = useColorModeValue('white', 'gray.800');
  const cardBg = useColorModeValue('white', 'gray.700');

  // 如果用户已认证，重定向到仪表盘或之前尝试访问的页面
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      const state = location.state as LocationState;
      const from = state?.from?.pathname || '/dashboard';
      navigate(from, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, location]);

  // 处理API密钥登录
  const handleApiKeyLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      toast({
        title: '请输入API密钥',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }
    
    try {
      setIsSubmitting(true);
      const success = await loginWithApiKey(apiKey);
      
      if (success) {
        // 登录成功，重定向由useEffect处理
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
    } finally {
      setIsSubmitting(false);
    }
  };

  // 切换API密钥可见性
  const toggleApiKeyVisibility = () => {
    setShowApiKey(!showApiKey);
  };

  // 如果正在检查认证状态，显示加载指示器
  if (isLoading) {
    return (
      <Flex justify="center" align="center" minH="100vh">
        <Spinner size="xl" color="primary.500" thickness="4px" />
      </Flex>
    );
  }

  return (
    <Box minH="100vh" bg="background.secondary">
      {/* 简单导航栏 */}
      <Flex
        as="nav"
        align="center"
        justify="space-between"
        wrap="wrap"
        padding="1.5rem"
        bg={bgColor}
        color="gray.800"
        boxShadow="sm"
      >
        <Flex align="center">
          <Heading as="h1" size="lg" color="primary.500">
            LiqPro
          </Heading>
        </Flex>
      </Flex>

      {/* 主要内容 */}
      <Container maxW="container.xl" py={10}>
        <Flex
          direction={{ base: 'column', md: 'row' }}
          align="center"
          justify="space-between"
          minH="70vh"
        >
          {/* 左侧：产品介绍 */}
          <VStack
            spacing={8}
            align={{ base: 'center', md: 'flex-start' }}
            maxW={{ base: '100%', md: '50%' }}
            textAlign={{ base: 'center', md: 'left' }}
            px={4}
            mb={{ base: 10, md: 0 }}
          >
            <Heading
              as="h1"
              size="2xl"
              fontWeight="bold"
              color="gray.800"
              lineHeight="1.2"
            >
              基于Solana区块链的AI驱动自动化LP投资平台
            </Heading>

            <Text fontSize="xl" color="gray.600">
              LiqPro帮助用户自动捕捉高质量LP投资机会并执行交易，创造被动收益。
            </Text>
          </VStack>

          {/* 右侧：登录表单 */}
          <Box
            bg={cardBg}
            p={8}
            borderRadius="lg"
            boxShadow="lg"
            width={{ base: '100%', md: '400px' }}
          >
            <VStack spacing={6} align="stretch">
              <Heading as="h2" size="lg" textAlign="center">
                登录
              </Heading>

              <Tabs isFitted variant="enclosed">
                <TabList mb="1em">
                  <Tab>钱包登录</Tab>
                  <Tab>API密钥</Tab>
                </TabList>
                <TabPanels>
                  {/* 钱包登录面板 */}
                  <TabPanel>
                    <VStack spacing={6}>
                      <Text>连接您的Solana钱包以登录或注册</Text>
                      <WalletConnect />
                      <Text fontSize="sm" color="gray.500">
                        首次连接将自动创建账户
                      </Text>
                    </VStack>
                  </TabPanel>

                  {/* API密钥登录面板 */}
                  <TabPanel>
                    <form onSubmit={handleApiKeyLogin}>
                      <VStack spacing={4}>
                        <FormControl id="apiKey" isRequired>
                          <FormLabel>API密钥</FormLabel>
                          <InputGroup>
                            <Input
                              type={showApiKey ? 'text' : 'password'}
                              value={apiKey}
                              onChange={(e) => setApiKey(e.target.value)}
                              placeholder="输入您的API密钥"
                            />
                            <InputRightElement>
                              <IconButton
                                aria-label={showApiKey ? '隐藏API密钥' : '显示API密钥'}
                                icon={showApiKey ? <ButtonIcon icon={FiEyeOff} /> : <ButtonIcon icon={FiEye} />}
                                variant="ghost"
                                onClick={toggleApiKeyVisibility}
                              />
                            </InputRightElement>
                          </InputGroup>
                        </FormControl>

                        <Button
                          type="submit"
                          colorScheme="primary"
                          width="full"
                          isLoading={isSubmitting}
                          loadingText="登录中..."
                        >
                          登录
                        </Button>
                      </VStack>
                    </form>
                  </TabPanel>
                </TabPanels>
              </Tabs>

              <Divider />

              <Text fontSize="sm" color="gray.500" textAlign="center">
                登录即表示您同意我们的服务条款和隐私政策
              </Text>
            </VStack>
          </Box>
        </Flex>
      </Container>
    </Box>
  );
};

export default LoginPage; 