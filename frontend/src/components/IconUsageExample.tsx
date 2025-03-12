import React from 'react';
import { Box, Button, Flex, Heading, Text, Icon } from '@chakra-ui/react';
import { FiAlertTriangle, FiInfo, FiCheck, FiArrowRight } from 'react-icons/fi';
import IconWrapper, { ButtonIcon } from './IconWrapper';

/**
 * 这个组件展示了如何在应用程序中使用IconWrapper
 * 
 * 在整个应用程序中，我们应该使用以下模式来使用React-Icons：
 * 
 * 1. 在Chakra UI的Icon组件中：
 *    <IconWrapper icon={FiAlertTriangle} color="red.500" />
 * 
 * 2. 在Button组件的leftIcon或rightIcon属性中：
 *    <Button leftIcon={<ButtonIcon icon={FiCheck} />} />
 * 
 * 3. 直接使用React-Icons（不推荐，应该使用上面的方法）：
 *    <FiAlertTriangle />
 */
const IconUsageExample: React.FC = () => {
  return (
    <Box p={4}>
      <Heading size="md" mb={4}>Icon Wrapper 使用示例</Heading>
      
      <Flex direction="column" gap={4}>
        <Box>
          <Text mb={2}>在Chakra UI的Icon组件中使用:</Text>
          <Flex gap={4}>
            <IconWrapper icon={FiAlertTriangle} color="red.500" boxSize={6} />
            <IconWrapper icon={FiInfo} color="blue.500" boxSize={6} />
            <IconWrapper icon={FiCheck} color="green.500" boxSize={6} />
          </Flex>
        </Box>
        
        <Box>
          <Text mb={2}>在Button组件中使用:</Text>
          <Flex gap={4}>
            <Button leftIcon={<ButtonIcon icon={FiAlertTriangle} />} colorScheme="red">
              警告
            </Button>
            <Button leftIcon={<ButtonIcon icon={FiInfo} />} colorScheme="blue">
              信息
            </Button>
            <Button rightIcon={<ButtonIcon icon={FiArrowRight} />} colorScheme="green">
              下一步
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default IconUsageExample; 