import React from 'react';
import {
  Box,
  Flex,
  Text,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  useColorModeValue,
} from '@chakra-ui/react';

interface ProfitCardProps {
  solAmount: number;
  usdAmount: number;
  totalYieldPercent: number;
  changeDirection: 'increase' | 'decrease';
}

const ProfitCard: React.FC<ProfitCardProps> = ({
  solAmount,
  usdAmount,
  totalYieldPercent,
  changeDirection,
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
        <StatLabel fontSize="sm" color="gray.500">总收益</StatLabel>
        <Flex justifyContent="space-between" alignItems="baseline">
          <StatNumber fontSize="2xl">{solAmount.toFixed(3)} SOL</StatNumber>
          <Text color="gray.500">${usdAmount.toFixed(2)}</Text>
        </Flex>
        <StatHelpText>
          <StatArrow type={changeDirection} />
          总收益率 {totalYieldPercent}%
        </StatHelpText>
      </Stat>
    </Box>
  );
};

export default ProfitCard; 