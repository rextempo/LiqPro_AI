import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { ButtonIcon } from '../IconWrapper';

interface AgentLogProps {
  mb?: number | string;
}

const AgentLog: React.FC<AgentLogProps> = ({ mb }) => {
  const [expanded, setExpanded] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const logBg = useColorModeValue('gray.900', 'gray.900');

  // Mock log data
  const mockLogs = [
    { type: 'analysis', content: '我正在分析SOL-USDC池子的最新数据...' },
    { type: 'analysis', content: '检测到价格波动率在过去24小时内降低了12%' },
    { type: 'decision', content: '决定增加SOL-USDC池子的仓位，因为波动率降低且流动性稳定' },
    { type: 'execution', content: '执行交易: 添加2.5 SOL到SOL-USDC池子' },
    { type: 'analysis', content: '监控BONK-SOL池子的大户活动...' },
    { type: 'warning', content: '注意: 检测到BONK-SOL池子中有大额提款操作' },
    { type: 'decision', content: '决定暂时观察BONK-SOL池子，不进行新的仓位调整' },
    { type: 'analysis', content: '分析USDC-USDT池子的收益率...' },
    { type: 'analysis', content: '当前USDC-USDT池子的24小时收益率为1.12%' },
    { type: 'decision', content: '维持USDC-USDT池子的当前仓位，收益率符合预期' },
  ];

  // Auto-scroll to bottom when new logs appear
  useEffect(() => {
    if (logContainerRef.current && !expanded) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [mockLogs, expanded]);

  // Get log type color
  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'analysis':
        return 'blue.400';
      case 'decision':
        return 'purple.400';
      case 'execution':
        return 'green.400';
      case 'warning':
        return 'orange.400';
      default:
        return 'gray.400';
    }
  };

  // Get log type prefix
  const getLogTypePrefix = (type: string) => {
    switch (type) {
      case 'analysis':
        return '分析';
      case 'decision':
        return '决策';
      case 'execution':
        return '执行';
      case 'warning':
        return '警告';
      default:
        return '信息';
    }
  };

  return (
    <Box
      bg={cardBg}
      borderRadius="lg"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
      mb={mb}
    >
      <Flex
        justifyContent="space-between"
        alignItems="center"
        p={4}
        borderBottomWidth="1px"
        borderBottomColor={borderColor}
      >
        <Heading as="h3" size="md">
          Agent思考过程
        </Heading>
        <Button
          size="sm"
          variant="ghost"
          rightIcon={expanded ? <ButtonIcon icon={FiChevronUp} /> : <ButtonIcon icon={FiChevronDown} />}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? '收起' : '展开'}
        </Button>
      </Flex>

      <Box
        ref={logContainerRef}
        bg={logBg}
        color="gray.100"
        p={4}
        borderRadius="0 0 lg lg"
        height={expanded ? '400px' : '200px'}
        overflowY="auto"
        transition="height 0.2s"
        fontFamily="monospace"
        fontSize="sm"
        css={{
          '&::-webkit-scrollbar': {
            width: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'rgba(0, 0, 0, 0.1)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'rgba(255, 255, 255, 0.2)',
            borderRadius: '4px',
          },
        }}
      >
        {mockLogs.map((log, index) => (
          <Box key={index} mb={3}>
            <Text>
              <Text as="span" color="gray.500">
                {`[${new Date().toLocaleTimeString()}] `}
              </Text>
              <Text as="span" color={getLogTypeColor(log.type)} fontWeight="bold">
                {`[${getLogTypePrefix(log.type)}] `}
              </Text>
              {log.content}
            </Text>
          </Box>
        ))}
      </Box>
    </Box>
  );
};

export default AgentLog; 