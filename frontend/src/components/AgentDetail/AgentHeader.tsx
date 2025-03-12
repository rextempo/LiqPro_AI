import React from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  HStack,
  Tag,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiPause, FiPlay, FiAlertTriangle } from 'react-icons/fi';
import { ButtonIcon } from '../IconWrapper';

interface AgentHeaderProps {
  name: string;
  status: string;
  runningTime: string;
  onPause: () => void;
  onResume: () => void;
  onEmergencyExit: () => void;
}

const AgentHeader: React.FC<AgentHeaderProps> = ({
  name,
  status,
  runningTime,
  onPause,
  onResume,
  onEmergencyExit,
}) => {
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Status color mapping
  const statusColorScheme = {
    running: 'success',
    observing: 'warning',
    stopped: 'gray',
  }[status] || 'gray';

  // Status text mapping
  const statusText = {
    running: '运行中',
    observing: '观察中',
    stopped: '已停止',
  }[status] || '未知状态';

  return (
    <Box mb={6} pb={4} borderBottom="1px" borderColor={borderColor}>
      <Flex
        direction={{ base: 'column', md: 'row' }}
        justifyContent="space-between"
        alignItems={{ base: 'flex-start', md: 'center' }}
        mb={4}
      >
        <Box mb={{ base: 4, md: 0 }}>
          <Heading as="h1" size="lg" mb={2}>
            {name}
          </Heading>
          <HStack spacing={4}>
            <Tag colorScheme={statusColorScheme} size="md">
              {statusText}
            </Tag>
            <Text fontSize="sm" color="gray.600">
              已运行{runningTime}
            </Text>
          </HStack>
        </Box>

        <HStack spacing={3}>
          {status === 'running' ? (
            <Button
              leftIcon={<ButtonIcon icon={FiPause} />}
              colorScheme="gray"
              variant="outline"
              onClick={onPause}
            >
              暂停
            </Button>
          ) : (
            <Button
              leftIcon={<ButtonIcon icon={FiPlay} />}
              colorScheme="primary"
              onClick={onResume}
            >
              {status === 'stopped' ? '启动' : '恢复'}
            </Button>
          )}
          <Button
            leftIcon={<ButtonIcon icon={FiAlertTriangle} />}
            colorScheme="danger"
            variant="solid"
            onClick={onEmergencyExit}
          >
            紧急清仓
          </Button>
        </HStack>
      </Flex>
    </Box>
  );
};

export default AgentHeader; 