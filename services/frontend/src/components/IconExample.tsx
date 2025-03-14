import React from 'react';
import { Box, Button, Flex, Heading, Text } from '@chakra-ui/react';
import { FiAlertTriangle, FiInfo, FiCheck } from 'react-icons/fi';
import IconWrapper from './IconWrapper';

const IconExample: React.FC = () => {
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
            <Button leftIcon={<IconWrapper icon={FiAlertTriangle} />} colorScheme="red">
              警告
            </Button>
            <Button leftIcon={<IconWrapper icon={FiInfo} />} colorScheme="blue">
              信息
            </Button>
            <Button rightIcon={<IconWrapper icon={FiCheck} />} colorScheme="green">
              确认
            </Button>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default IconExample; 