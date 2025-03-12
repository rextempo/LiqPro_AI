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
  HStack,
  Text,
  Image,
  Progress,
  useColorModeValue,
  Tooltip,
  Icon,
} from '@chakra-ui/react';
import { FiExternalLink, FiInfo, FiTrendingUp, FiTrendingDown } from 'react-icons/fi';
import { IconWrapper, ButtonIcon } from '../IconWrapper';

// 池子接口
interface Pool {
  id: string;
  name: string;
  token0: {
    symbol: string;
    icon: string;
  };
  token1: {
    symbol: string;
    icon: string;
  };
  tvl: number; // 单位：美元
  apr: number; // 年化收益率
  volume24h: number; // 24小时交易量
  volumeChange: number; // 交易量变化百分比
  risk: 'low' | 'medium' | 'high';
  recommended: boolean;
}

// 模拟池子数据
const mockPools: Pool[] = [
  {
    id: 'pool-001',
    name: 'SOL-USDC',
    token0: {
      symbol: 'SOL',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    },
    token1: {
      symbol: 'USDC',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
    },
    tvl: 12450000,
    apr: 24.5,
    volume24h: 3250000,
    volumeChange: 12.3,
    risk: 'low',
    recommended: true,
  },
  {
    id: 'pool-002',
    name: 'SOL-BONK',
    token0: {
      symbol: 'SOL',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    },
    token1: {
      symbol: 'BONK',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
    },
    tvl: 5680000,
    apr: 42.8,
    volume24h: 1850000,
    volumeChange: 28.7,
    risk: 'high',
    recommended: false,
  },
  {
    id: 'pool-003',
    name: 'SOL-USDT',
    token0: {
      symbol: 'SOL',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    },
    token1: {
      symbol: 'USDT',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
    },
    tvl: 8920000,
    apr: 18.2,
    volume24h: 2450000,
    volumeChange: -5.4,
    risk: 'low',
    recommended: true,
  },
  {
    id: 'pool-004',
    name: 'SOL-JitoSOL',
    token0: {
      symbol: 'SOL',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    },
    token1: {
      symbol: 'JitoSOL',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/J1toso1uCk3RLmjorhTtrVwY9HJ7X8V9yYac6Y7kGCPn/logo.png',
    },
    tvl: 6750000,
    apr: 15.6,
    volume24h: 1250000,
    volumeChange: 3.2,
    risk: 'medium',
    recommended: true,
  },
  {
    id: 'pool-005',
    name: 'SOL-mSOL',
    token0: {
      symbol: 'SOL',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
    },
    token1: {
      symbol: 'mSOL',
      icon: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So/logo.png',
    },
    tvl: 7820000,
    apr: 16.8,
    volume24h: 1680000,
    volumeChange: -2.1,
    risk: 'medium',
    recommended: true,
  },
];

const PoolsOverview: React.FC = () => {
  const [sortField, setSortField] = useState<string>('tvl');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const headerBg = useColorModeValue('gray.50', 'gray.700');
  
  // 获取风险等级的颜色和文本
  const getRiskInfo = (risk: string) => {
    switch (risk) {
      case 'low':
        return { color: 'success', text: '低' };
      case 'medium':
        return { color: 'warning', text: '中' };
      case 'high':
        return { color: 'danger', text: '高' };
      default:
        return { color: 'gray', text: risk };
    }
  };
  
  // 格式化数字
  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return `$${(num / 1000000).toFixed(1)}M`;
    } else if (num >= 1000) {
      return `$${(num / 1000).toFixed(1)}K`;
    }
    return `$${num.toFixed(0)}`;
  };
  
  // 排序池子
  const sortedPools = [...mockPools].sort((a, b) => {
    let aValue: any = a[sortField as keyof Pool];
    let bValue: any = b[sortField as keyof Pool];
    
    // 处理嵌套属性
    if (sortField === 'name') {
      aValue = a.name;
      bValue = b.name;
    }
    
    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });
  
  // 处理排序
  const handleSort = (field: string) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };
  
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
        <Heading size="md">热门池子</Heading>
        <Button 
          rightIcon={<ButtonIcon icon={FiExternalLink} />} 
          variant="outline" 
          size="sm"
          colorScheme="primary"
        >
          查看全部
        </Button>
      </Flex>
      
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg={headerBg}>
            <Tr>
              <Th 
                cursor="pointer" 
                onClick={() => handleSort('name')}
              >
                池子
              </Th>
              <Th 
                cursor="pointer" 
                onClick={() => handleSort('tvl')}
                isNumeric
              >
                TVL
              </Th>
              <Th 
                cursor="pointer" 
                onClick={() => handleSort('apr')}
                isNumeric
              >
                APR
              </Th>
              <Th 
                cursor="pointer" 
                onClick={() => handleSort('volume24h')}
                isNumeric
              >
                24h交易量
              </Th>
              <Th 
                cursor="pointer" 
                onClick={() => handleSort('risk')}
              >
                风险等级
              </Th>
              <Th></Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedPools.map((pool) => {
              const riskInfo = getRiskInfo(pool.risk);
              
              return (
                <Tr key={pool.id}>
                  <Td>
                    <HStack spacing={2}>
                      <HStack spacing={-1}>
                        <Image 
                          src={pool.token0.icon} 
                          alt={pool.token0.symbol} 
                          boxSize="24px" 
                          borderRadius="full"
                        />
                        <Image 
                          src={pool.token1.icon} 
                          alt={pool.token1.symbol} 
                          boxSize="24px" 
                          borderRadius="full"
                          ml="-12px"
                        />
                      </HStack>
                      <Text fontWeight="medium">{pool.name}</Text>
                      {pool.recommended && (
                        <Tooltip label="AI推荐">
                          <Badge colorScheme="primary" variant="subtle">推荐</Badge>
                        </Tooltip>
                      )}
                    </HStack>
                  </Td>
                  <Td isNumeric>{formatNumber(pool.tvl)}</Td>
                  <Td isNumeric>
                    <Text color="success.500" fontWeight="medium">
                      {pool.apr.toFixed(1)}%
                    </Text>
                  </Td>
                  <Td isNumeric>
                    <Flex justifyContent="flex-end" alignItems="center">
                      <Text mr={1}>{formatNumber(pool.volume24h)}</Text>
                      <IconWrapper 
                        icon={pool.volumeChange >= 0 ? FiTrendingUp : FiTrendingDown} 
                        color={pool.volumeChange >= 0 ? 'success.500' : 'danger.500'}
                        boxSize={4}
                      />
                    </Flex>
                  </Td>
                  <Td>
                    <Badge colorScheme={riskInfo.color}>
                      {riskInfo.text}
                    </Badge>
                  </Td>
                  <Td>
                    <Button size="xs" colorScheme="primary" variant="outline">
                      添加流动性
                    </Button>
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

export default PoolsOverview; 