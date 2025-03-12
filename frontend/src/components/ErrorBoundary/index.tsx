import React, { Component, ErrorInfo, ReactNode } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  Code,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiAlertTriangle, FiRefreshCw } from 'react-icons/fi';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    // 更新 state，下次渲染时显示降级 UI
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // 可以在这里记录错误信息
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  public render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // 默认的错误 UI
      return (
        <Flex
          direction="column"
          align="center"
          justify="center"
          minH="100vh"
          p={8}
          bg={useColorModeValue('gray.50', 'gray.900')}
        >
          <VStack spacing={6} maxW="800px" textAlign="center">
            <Box
              fontSize="6xl"
              color={useColorModeValue('danger.500', 'danger.300')}
            >
              <FiAlertTriangle />
            </Box>
            
            <Heading size="xl" color={useColorModeValue('danger.500', 'danger.300')}>
              出现了一些问题
            </Heading>
            
            <Text fontSize="lg">
              应用程序遇到了意外错误。您可以尝试刷新页面或返回首页。
            </Text>
            
            <Button
              leftIcon={<FiRefreshCw />}
              colorScheme="primary"
              onClick={this.handleReset}
              size="lg"
              mt={4}
            >
              重试
            </Button>
            
            {/* 开发环境下显示错误详情 */}
            {process.env.NODE_ENV === 'development' && (
              <Box
                mt={8}
                p={4}
                bg={useColorModeValue('gray.100', 'gray.700')}
                borderRadius="md"
                width="100%"
                textAlign="left"
                overflowX="auto"
              >
                <Heading size="md" mb={2}>错误详情：</Heading>
                <Code colorScheme="red" whiteSpace="pre-wrap">
                  {this.state.error?.toString()}
                </Code>
                
                {this.state.errorInfo && (
                  <>
                    <Heading size="sm" mt={4} mb={2}>组件堆栈：</Heading>
                    <Code colorScheme="gray" whiteSpace="pre-wrap" fontSize="xs">
                      {this.state.errorInfo.componentStack}
                    </Code>
                  </>
                )}
              </Box>
            )}
          </VStack>
        </Flex>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 