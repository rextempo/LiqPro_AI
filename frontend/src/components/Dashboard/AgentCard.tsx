import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Heading,
  Link,
  SimpleGrid,
  Text,
  Badge,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiPlay, FiPause } from 'react-icons/fi';
import { ButtonIcon } from '../IconWrapper';

interface AgentCardProps {
  id: string;
  name: string;
  status: 'running' | 'observing' | 'stopped';
  yield24h: number;
  yieldTrend: 'up' | 'down' | 'neutral';
  assetValueSOL: number;
  assetValueUSD: number;
}

const AgentCard: React.FC<AgentCardProps> = ({
  id,
  name,
  status,
  yield24h,
  yieldTrend,
  assetValueSOL,
  assetValueUSD,
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  return (
    <Box 
      p={4} 
      bg={bgColor} 
      borderRadius="lg" 
      boxShadow="sm" 
      borderWidth="1px" 
      borderColor={borderColor}
    >
      <Flex justifyContent="space-between" alignItems="center" mb={3}>
        <Heading as="h3" size="md">
          <Link as={RouterLink} to={`/agent/${id}`} color="primary.500">
            {name}
          </Link>
        </Heading>
        <Badge colorScheme={status === 'running' ? 'success' : status === 'observing' ? 'warning' : 'gray'}>
          {status === 'running' ? '运行中' : status === 'observing' ? '观察中' : '已停止'}
        </Badge>
      </Flex>
      
      <SimpleGrid columns={2} spacing={4} mb={3}>
        <Box>
          <Text fontSize="sm" color="gray.500">24h收益</Text>
          <Text 
            fontSize="lg" 
            fontWeight="bold" 
            color={yield24h > 0 ? 'success.500' : yield24h < 0 ? 'danger.500' : 'gray.500'}
          >
            {yield24h > 0 ? '+' : ''}{yield24h}%
          </Text>
        </Box>
        <Box>
          <Text fontSize="sm" color="gray.500">资产价值</Text>
          <Text fontSize="lg" fontWeight="bold">{assetValueSOL.toFixed(3)} SOL</Text>
          <Text fontSize="xs" color="gray.500">${assetValueUSD.toFixed(2)}</Text>
        </Box>
      </SimpleGrid>
      
      <Flex justifyContent="space-between">
        <Button
          size="sm"
          colorScheme={status === 'running' ? 'red' : 'green'}
          variant="outline"
          leftIcon={
            status === 'running' ? (
              <ButtonIcon icon={FiPause} />
            ) : (
              <ButtonIcon icon={FiPlay} />
            )
          }
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            // 这里应该调用启动/暂停Agent的API
            console.log(`${status === 'running' ? '暂停' : '启动'} Agent ${id}`);
          }}
        >
          {status === 'running' ? '暂停' : '启动'}
        </Button>
        <Button 
          size="sm" 
          as={RouterLink} 
          to={`/agent/${id}`} 
          colorScheme="primary" 
          variant="outline"
        >
          详情
        </Button>
      </Flex>
    </Box>
  );
};

export default AgentCard; 