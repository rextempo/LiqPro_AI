import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Select,
  useColorModeValue,
  Icon,
} from '@chakra-ui/react';
import { FiTrendingUp, FiTrendingDown, FiDollarSign, FiActivity } from 'react-icons/fi';
import { IconType } from 'react-icons';
import { IconWrapper } from '../IconWrapper';

// 模拟市场数据
const marketData = {
  solPrice: 142.87,
  solChange: 3.2,
  totalValueLocked: 1.28, // 单位：十亿美元
  tvlChange: -1.5,
  volume24h: 428.6, // 单位：百万美元
  volumeChange: 12.4,
  meteoraVolume: 86.3, // 单位：百万美元
  meteoraVolumeChange: 8.7,
};

interface MarketStatProps {
  label: string;
  value: string | number;
  change?: number;
  icon: IconType;
  format?: (value: number) => string;
}

const MarketStat: React.FC<MarketStatProps> = ({ 
  label, 
  value, 
  change, 
  icon,
  format = (val) => val.toString()
}) => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  return (
    <Box
      p={4}
      bg={bgColor}
      borderRadius="lg"
      borderWidth="1px"
      borderColor={borderColor}
      boxShadow="sm"
    >
      <Flex alignItems="center" mb={2}>
        <IconWrapper icon={icon} boxSize={5} color="primary.500" mr={2} />
        <Text fontWeight="medium" color="gray.500">{label}</Text>
      </Flex>
      <Stat>
        <StatNumber fontSize="2xl">{typeof value === 'number' ? format(value) : value}</StatNumber>
        {change !== undefined && (
          <StatHelpText>
            <StatArrow type={change >= 0 ? 'increase' : 'decrease'} />
            {Math.abs(change).toFixed(1)}%
          </StatHelpText>
        )}
      </Stat>
    </Box>
  );
};

const MarketOverview: React.FC = () => {
  const [timeRange, setTimeRange] = useState<string>('24h');
  
  // 格式化函数
  const formatUSD = (value: number) => `$${value.toLocaleString()}`;
  const formatBillion = (value: number) => `$${value.toFixed(2)}B`;
  const formatMillion = (value: number) => `$${value.toFixed(1)}M`;
  
  return (
    <Box mb={6}>
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading size="md">市场概览</Heading>
        <Select 
          value={timeRange} 
          onChange={(e) => setTimeRange(e.target.value)}
          width="120px"
          size="sm"
        >
          <option value="24h">24小时</option>
          <option value="7d">7天</option>
          <option value="30d">30天</option>
        </Select>
      </Flex>
      
      <SimpleGrid columns={{ base: 1, md: 2, lg: 4 }} spacing={4}>
        <MarketStat 
          label="SOL价格" 
          value={marketData.solPrice} 
          change={marketData.solChange} 
          icon={FiDollarSign}
          format={formatUSD}
        />
        <MarketStat 
          label="总锁仓量 (TVL)" 
          value={marketData.totalValueLocked} 
          change={marketData.tvlChange} 
          icon={FiTrendingUp}
          format={formatBillion}
        />
        <MarketStat 
          label="24小时交易量" 
          value={marketData.volume24h} 
          change={marketData.volumeChange} 
          icon={FiActivity}
          format={formatMillion}
        />
        <MarketStat 
          label="Meteora交易量" 
          value={marketData.meteoraVolume} 
          change={marketData.meteoraVolumeChange} 
          icon={FiTrendingDown}
          format={formatMillion}
        />
      </SimpleGrid>
    </Box>
  );
};

export default MarketOverview; 