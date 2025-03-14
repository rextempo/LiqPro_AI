import React from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  useColorModeValue,
} from '@chakra-ui/react';

interface YieldCardProps {
  timeRange: string;
  onTimeRangeChange: (range: string) => void;
  yieldPercent: number;
}

const YieldCard: React.FC<YieldCardProps> = ({
  timeRange,
  onTimeRangeChange,
  yieldPercent,
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
      <Stat>
        <StatLabel fontSize="sm" color="gray.500">收益率</StatLabel>
        <Flex justifyContent="space-between" alignItems="center">
          <StatNumber fontSize="2xl" color={yieldPercent >= 0 ? 'success.500' : 'danger.500'}>
            {yieldPercent >= 0 ? '+' : ''}{yieldPercent}%
          </StatNumber>
          <HStack>
            <Button 
              size="xs" 
              variant={timeRange === '24h' ? 'solid' : 'outline'} 
              colorScheme="primary" 
              onClick={() => onTimeRangeChange('24h')}
            >
              24h
            </Button>
            <Button 
              size="xs" 
              variant={timeRange === '7d' ? 'solid' : 'outline'} 
              colorScheme="primary" 
              onClick={() => onTimeRangeChange('7d')}
            >
              7d
            </Button>
            <Button 
              size="xs" 
              variant={timeRange === '30d' ? 'solid' : 'outline'} 
              colorScheme="primary" 
              onClick={() => onTimeRangeChange('30d')}
            >
              30d
            </Button>
          </HStack>
        </Flex>
      </Stat>
      <Text fontSize="sm" color="gray.500" mt={2}>
        {timeRange === '24h' ? '过去24小时' : timeRange === '7d' ? '过去7天' : '过去30天'}收益率
      </Text>
    </Box>
  );
};

export default YieldCard; 