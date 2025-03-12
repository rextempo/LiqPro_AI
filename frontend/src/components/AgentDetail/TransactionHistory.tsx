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
  Text,
  HStack,
  Icon,
  Link,
  useColorModeValue,
  Select,
} from '@chakra-ui/react';
import { 
  FiExternalLink, 
  FiArrowUp, 
  FiArrowDown, 
  FiPlus, 
  FiMinus,
  FiFilter,
  FiDownload,
} from 'react-icons/fi';

// 交易类型
type TransactionType = 'buy' | 'sell' | 'add_liquidity' | 'remove_liquidity' | 'swap' | 'harvest';

// 交易接口
interface Transaction {
  id: string;
  timestamp: string;
  type: TransactionType;
  tokens: {
    symbol: string;
    amount: number;
    usdValue: number;
  }[];
  fee: number;
  status: 'confirmed' | 'pending' | 'failed';
  txHash: string;
}

// 模拟交易数据
const mockTransactions: Transaction[] = [
  {
    id: 'tx-001',
    timestamp: '2023-03-24 14:32:45',
    type: 'add_liquidity',
    tokens: [
      { symbol: 'SOL', amount: 2.5, usdValue: 357.18 },
      { symbol: 'USDC', amount: 350, usdValue: 350 },
    ],
    fee: 0.000005,
    status: 'confirmed',
    txHash: '5VERYm4JPQ9Yj9KG9DNv9n4oHMHKGcJWGLDzCNEiMTbKMG2',
  },
  {
    id: 'tx-002',
    timestamp: '2023-03-24 12:15:22',
    type: 'buy',
    tokens: [
      { symbol: 'SOL', amount: 1.2, usdValue: 171.44 },
    ],
    fee: 0.000005,
    status: 'confirmed',
    txHash: '3VERYm4JPQ9Yj9KG9DNv9n4oHMHKGcJWGLDzCNEiMTbKMG3',
  },
  {
    id: 'tx-003',
    timestamp: '2023-03-23 18:45:10',
    type: 'remove_liquidity',
    tokens: [
      { symbol: 'SOL', amount: 1.8, usdValue: 257.17 },
      { symbol: 'USDT', amount: 250, usdValue: 250 },
    ],
    fee: 0.000005,
    status: 'confirmed',
    txHash: '2VERYm4JPQ9Yj9KG9DNv9n4oHMHKGcJWGLDzCNEiMTbKMG4',
  },
  {
    id: 'tx-004',
    timestamp: '2023-03-23 10:22:33',
    type: 'sell',
    tokens: [
      { symbol: 'SOL', amount: 0.5, usdValue: 71.44 },
    ],
    fee: 0.000005,
    status: 'failed',
    txHash: '1VERYm4JPQ9Yj9KG9DNv9n4oHMHKGcJWGLDzCNEiMTbKMG5',
  },
  {
    id: 'tx-005',
    timestamp: '2023-03-22 09:05:17',
    type: 'swap',
    tokens: [
      { symbol: 'SOL', amount: 0.8, usdValue: 114.30 },
      { symbol: 'BONK', amount: 1250000, usdValue: 118.75 },
    ],
    fee: 0.000005,
    status: 'confirmed',
    txHash: '0VERYm4JPQ9Yj9KG9DNv9n4oHMHKGcJWGLDzCNEiMTbKMG6',
  },
  {
    id: 'tx-006',
    timestamp: '2023-03-21 16:33:42',
    type: 'harvest',
    tokens: [
      { symbol: 'USDC', amount: 12.5, usdValue: 12.5 },
    ],
    fee: 0.000005,
    status: 'confirmed',
    txHash: '9VERYm4JPQ9Yj9KG9DNv9n4oHMHKGcJWGLDzCNEiMTbKMG7',
  },
];

interface TransactionHistoryProps {
  agentId: string;
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({ agentId }) => {
  const [filter, setFilter] = useState<string>('all');
  const [page, setPage] = useState<number>(1);
  const pageSize = 5;
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  const hashColor = useColorModeValue('primary.500', 'primary.300');
  
  // 获取交易类型的图标、颜色和文本
  const getTransactionTypeInfo = (type: TransactionType) => {
    switch (type) {
      case 'buy':
        return { icon: FiArrowDown, color: 'success', text: '买入' };
      case 'sell':
        return { icon: FiArrowUp, color: 'danger', text: '卖出' };
      case 'add_liquidity':
        return { icon: FiPlus, color: 'primary', text: '添加流动性' };
      case 'remove_liquidity':
        return { icon: FiMinus, color: 'warning', text: '移除流动性' };
      case 'swap':
        return { icon: FiArrowUp, color: 'secondary', text: '兑换' };
      case 'harvest':
        return { icon: FiArrowDown, color: 'success', text: '收获收益' };
      default:
        return { icon: FiArrowUp, color: 'gray', text: type };
    }
  };
  
  // 获取交易状态的颜色和文本
  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'confirmed':
        return { color: 'success', text: '已确认' };
      case 'pending':
        return { color: 'warning', text: '处理中' };
      case 'failed':
        return { color: 'danger', text: '失败' };
      default:
        return { color: 'gray', text: status };
    }
  };
  
  // 过滤交易
  const filteredTransactions = filter === 'all' 
    ? mockTransactions 
    : mockTransactions.filter(tx => tx.type === filter);
  
  // 分页
  const paginatedTransactions = filteredTransactions.slice(
    (page - 1) * pageSize,
    page * pageSize
  );
  
  const totalPages = Math.ceil(filteredTransactions.length / pageSize);
  
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
        flexWrap="wrap"
        gap={2}
      >
        <Heading size="md">交易历史</Heading>
        
        <Flex gap={2}>
          <Select 
            value={filter} 
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(1); // 重置页码
            }}
            size="sm"
            width="150px"
            icon={<FiFilter />}
          >
            <option value="all">全部交易</option>
            <option value="buy">买入</option>
            <option value="sell">卖出</option>
            <option value="add_liquidity">添加流动性</option>
            <option value="remove_liquidity">移除流动性</option>
            <option value="swap">兑换</option>
            <option value="harvest">收获收益</option>
          </Select>
          
          <Button 
            leftIcon={<FiDownload />} 
            variant="outline" 
            size="sm"
            colorScheme="primary"
          >
            导出CSV
          </Button>
        </Flex>
      </Flex>
      
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg={headerBg}>
            <Tr>
              <Th>时间</Th>
              <Th>类型</Th>
              <Th>代币</Th>
              <Th isNumeric>金额</Th>
              <Th isNumeric>费用</Th>
              <Th>状态</Th>
              <Th>交易哈希</Th>
            </Tr>
          </Thead>
          <Tbody>
            {paginatedTransactions.map((tx) => {
              const typeInfo = getTransactionTypeInfo(tx.type);
              const statusInfo = getStatusInfo(tx.status);
              
              return (
                <Tr key={tx.id}>
                  <Td whiteSpace="nowrap">{tx.timestamp}</Td>
                  <Td>
                    <HStack>
                      <Icon as={typeInfo.icon} color={`${typeInfo.color}.500`} />
                      <Badge colorScheme={typeInfo.color}>{typeInfo.text}</Badge>
                    </HStack>
                  </Td>
                  <Td>
                    {tx.tokens.map((token, idx) => (
                      <Text key={idx}>
                        {token.symbol}
                        {idx < tx.tokens.length - 1 && ' → '}
                      </Text>
                    ))}
                  </Td>
                  <Td isNumeric>
                    {tx.tokens.map((token, idx) => (
                      <Text key={idx}>
                        {token.amount.toLocaleString()} {token.symbol}
                        <Text as="span" fontSize="xs" color="gray.500" ml={1}>
                          (${token.usdValue.toLocaleString()})
                        </Text>
                        {idx < tx.tokens.length - 1 && <br />}
                      </Text>
                    ))}
                  </Td>
                  <Td isNumeric>{tx.fee} SOL</Td>
                  <Td>
                    <Badge colorScheme={statusInfo.color} variant="outline">
                      {statusInfo.text}
                    </Badge>
                  </Td>
                  <Td>
                    <Link 
                      href={`https://solscan.io/tx/${tx.txHash}`} 
                      isExternal
                      color={hashColor}
                      fontSize="sm"
                    >
                      {tx.txHash.substring(0, 6)}...{tx.txHash.substring(tx.txHash.length - 4)}
                      <Icon as={FiExternalLink} mx="2px" />
                    </Link>
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
      
      {/* 分页 */}
      {totalPages > 1 && (
        <Flex justifyContent="center" p={4}>
          <HStack>
            <Button 
              size="sm" 
              onClick={() => setPage(Math.max(1, page - 1))}
              isDisabled={page === 1}
            >
              上一页
            </Button>
            <Text>
              {page} / {totalPages}
            </Text>
            <Button 
              size="sm" 
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              isDisabled={page === totalPages}
            >
              下一页
            </Button>
          </HStack>
        </Flex>
      )}
    </Box>
  );
};

export default TransactionHistory; 