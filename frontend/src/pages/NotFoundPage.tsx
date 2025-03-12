import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiHome } from 'react-icons/fi';
import { ButtonIcon } from '../components/IconWrapper';

const NotFoundPage: React.FC = () => {
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  return (
    <Flex
      direction="column"
      align="center"
      justify="center"
      minH="100vh"
      bg={bgColor}
      p={8}
    >
      <VStack spacing={6} maxW="600px" textAlign="center">
        <Heading
          as="h1"
          size="4xl"
          fontWeight="bold"
          color="primary.500"
          lineHeight="1"
        >
          404
        </Heading>
        
        <Heading as="h2" size="xl" mb={2}>
          页面未找到
        </Heading>
        
        <Text fontSize="lg" color={textColor}>
          您访问的页面不存在或已被移除。请检查URL是否正确，或返回首页。
        </Text>
        
        <Button
          as={RouterLink}
          to="/dashboard"
          leftIcon={<ButtonIcon icon={FiHome} />}
          colorScheme="primary"
          size="lg"
          mt={4}
        >
          返回首页
        </Button>
      </VStack>
    </Flex>
  );
};

export default NotFoundPage; 