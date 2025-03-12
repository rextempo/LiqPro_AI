import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  Icon,
  Text,
  useColorModeValue,
  Tooltip,
} from '@chakra-ui/react';
import { FiInfo, FiExternalLink, FiFilter } from 'react-icons/fi';

// 信号类型
type SignalType = 'buy' | 'sell' | 'add_liquidity' | 'remove_liquidity';

// 信号接口
interface Signal {
  id: string;
  timestamp: string;
  type: SignalType;
  pair: string;
  confidence: number;
  source: string;
  status: 'pending' | 'executed' | 'ignored';
}

// 模拟信号数据
const mockSignals: Signal[] = [
  {
    id: 'sig-001',
    timestamp: '2023-03-24 14:32:45',
    type: 'add_liquidity',
    pair: 'SOL/USDC',
    confidence: 0.87,
    source: 'AI Model Alpha',
    status: 'executed',
  },
  {
    id: 'sig-002',
    timestamp: '2023-03-24 13:15:22',
    type: 'buy',
    pair: 'SOL',
    confidence: 0.92,
    source: 'Price Action',
    status: 'executed',
  },
  {
    id: 'sig-003',
    timestamp: '2023-03-24 11:45:10',
    type: 'remove_liquidity',
    pair: 'SOL/USDT',
    confidence: 0.76,
    source: 'Volatility Model',
    status: 'ignored',
  },
  {
    id: 'sig-004',
    timestamp: '2023-03-24 10:22:33',
    type: 'sell',
    pair: 'SOL',
    confidence: 0.65,
    source: 'Technical Indicators',
    status: 'pending',
  },
  {
    id: 'sig-005',
    timestamp: '2023-03-24 09:05:17',
    type: 'add_liquidity',
    pair: 'SOL/BONK',
    confidence: 0.81,
    source: 'Sentiment Analysis',
    status: 'executed',
  },
];

const SignalsList: React.FC = () => {
  const [filter, setFilter] = useState<string>('all');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  
  // 获取信号类型的颜色和文本
  const getSignalTypeInfo = (type: SignalType) => {
    switch (type) {
      case 'buy':
        return { color: 'success', text: '买入' };
      case 'sell':
        return { color: 'danger', text: '卖出' };
      case 'add_liquidity':
        return { color: 'primary', text: '添加流动性' };
      case 'remove_liquidity':
        return { color: 'warning', text: '移除流动性' };
      default:
        return { color: 'gray', text: type };
    }
  };
  
  // 获取信号状态的颜色和文本
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'executed':
        return { color: 'success', text: '已执行' };
      case 'pending':
        return { color: 'warning', text: '待处理' };
      case 'ignored':
        return { color: 'gray', text: '已忽略' };
      default:
        return { color: 'gray', text: status };
    }
  };
  
  // 过滤信号
  const filteredSignals = filter === 'all' 
    ? mockSignals 
    : mockSignals.filter(signal => signal.type === filter);
  
  return (
    <Box 
      bg={bgColor} 
      borderRadius="lg" 
      borderWidth="1px" 
      borderColor={borderColor}
      boxShadow="sm"
      overflow="hidden"
      mb={6}
    >
      <Flex 
        justifyContent="space-between" 
        alignItems="center" 
        p={4} 
        borderBottomWidth="1px"
        borderColor={borderColor}
      >
        <Heading size="md">最新信号</Heading>
        <Flex>
          <Button 
            leftIcon={<FiFilter />} 
            variant="ghost" 
            size="sm"
            mr={2}
          >
            {filter === 'all' ? '全部' : getSignalTypeInfo(filter as SignalType).text}
          </Button>
          <Button 
            rightIcon={<FiExternalLink />} 
            variant="outline" 
            size="sm"
            colorScheme="primary"
          >
            查看全部
          </Button>
        </Flex>
      </Flex>
      
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg={headerBg}>
            <Tr>
              <Th>时间</Th>
              <Th>类型</Th>
              <Th>交易对</Th>
              <Th isNumeric>置信度</Th>
              <Th>来源</Th>
              <Th>状态</Th>
            </Tr>
          </Thead>
          <Tbody>
            {filteredSignals.map((signal) => {
              const typeInfo = getSignalTypeInfo(signal.type);
              const statusInfo = getStatusInfo(signal.status);
              
              return (
                <Tr key={signal.id}>
                  <Td whiteSpace="nowrap">{signal.timestamp}</Td>
                  <Td>
                    <Badge colorScheme={typeInfo.color}>{typeInfo.text}</Badge>
                  </Td>
                  <Td>{signal.pair}</Td>
                  <Td isNumeric>
                    <Flex justifyContent="flex-end" alignItems="center">
                      <Text mr={1}>{(signal.confidence * 100).toFixed(0)}%</Text>
                      <Tooltip label="置信度表示模型对该信号的确信程度">
                        <span><Icon as={FiInfo} boxSize={3} color="gray.500" /></span>
                      </Tooltip>
                    </Flex>
                  </Td>
                  <Td>{signal.source}</Td>
                  <Td>
                    <Badge colorScheme={statusInfo.color} variant="outline">
                      {statusInfo.text}
                    </Badge>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
    </Box>
  );
};

export default SignalsList; 