import React from 'react';
import {
  Box,
  ButtonGroup,
  Button,
  Flex,
  Heading,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';

type TimeRangeType = '24h' | '7d' | '30d' | 'all';

interface AssetSummaryProps {
  assetValueSOL: number;
  assetValueUSD: number;
  totalProfitSOL: number;
  totalProfitUSD: number;
  totalProfitPercent: number;
  timeRange: TimeRangeType;
  onTimeRangeChange: (range: TimeRangeType) => void;
  apr: number;
  feeIncome: number;
  tokenValueChange: number;
}

const AssetSummary: React.FC<AssetSummaryProps> = ({
  assetValueSOL,
  assetValueUSD,
  totalProfitSOL,
  totalProfitUSD,
  totalProfitPercent,
  timeRange,
  onTimeRangeChange,
  apr,
  feeIncome,
  tokenValueChange,
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      bg={cardBg}
      p={5}
      borderRadius="lg"
      boxShadow="sm"
      borderWidth="1px"
      borderColor={borderColor}
    >
      <Heading as="h3" size="md" mb={4}>
        资产概况
      </Heading>

      <Flex direction="column" gap={4}>
        {/* 当前资产价值 */}
        <Stat>
          <StatLabel fontSize="sm">当前资产价值</StatLabel>
          <Flex alignItems="baseline">
            <StatNumber fontSize="xl">{assetValueSOL.toFixed(3)}</StatNumber>
            <Text ml={1} fontSize="md" color="gray.500">
              SOL
            </Text>
          </Flex>
          <Text fontSize="sm" color="gray.500">
            ${assetValueUSD.toFixed(2)} USD
          </Text>
        </Stat>

        {/* 总收益 */}
        <Stat>
          <StatLabel fontSize="sm">总收益</StatLabel>
          <Flex alignItems="baseline">
            <StatNumber fontSize="xl" color={totalProfitSOL >= 0 ? 'success.500' : 'danger.500'}>
              {totalProfitSOL.toFixed(3)}
            </StatNumber>
            <Text ml={1} fontSize="md" color="gray.500">
              SOL
            </Text>
          </Flex>
          <HStack spacing={2}>
            <Text fontSize="sm" color="gray.500">
              ${totalProfitUSD.toFixed(2)} USD
            </Text>
            <Text
              fontSize="sm"
              fontWeight="medium"
              color={totalProfitPercent >= 0 ? 'success.500' : 'danger.500'}
            >
              ({totalProfitPercent.toFixed(2)}%)
            </Text>
          </HStack>
        </Stat>

        {/* 收益图表 */}
        <Box>
          <Flex justifyContent="space-between" alignItems="center" mb={2}>
            <Text fontSize="sm" fontWeight="medium">
              收益趋势
            </Text>
            <ButtonGroup size="xs" isAttached variant="outline">
              <Button
                onClick={() => onTimeRangeChange('24h')}
                colorScheme={timeRange === '24h' ? 'primary' : 'gray'}
                fontWeight={timeRange === '24h' ? 'medium' : 'normal'}
              >
                24h
              </Button>
              <Button
                onClick={() => onTimeRangeChange('7d')}
                colorScheme={timeRange === '7d' ? 'primary' : 'gray'}
                fontWeight={timeRange === '7d' ? 'medium' : 'normal'}
              >
                7d
              </Button>
              <Button
                onClick={() => onTimeRangeChange('30d')}
                colorScheme={timeRange === '30d' ? 'primary' : 'gray'}
                fontWeight={timeRange === '30d' ? 'medium' : 'normal'}
              >
                30d
              </Button>
            </ButtonGroup>
          </Flex>
          
          {/* 图表占位符 */}
          <Box
            h="120px"
            bg="gray.50"
            borderRadius="md"
            mb={3}
            display="flex"
            alignItems="center"
            justifyContent="center"
          >
            <Text color="gray.400" fontSize="sm">
              收益趋势图 ({timeRange})
            </Text>
          </Box>
        </Box>

        {/* 预计年化收益 */}
        <Stat>
          <StatLabel fontSize="sm">预计年化收益 (APR)</StatLabel>
          <StatNumber fontSize="xl" color="success.500">
            {apr.toFixed(1)}%
          </StatNumber>
        </Stat>

        {/* 收益构成 */}
        <Box>
          <Text fontSize="sm" fontWeight="medium" mb={2}>
            收益构成
          </Text>
          <Flex h="24px" w="100%" borderRadius="full" overflow="hidden" bg="gray.100">
            <Box
              h="100%"
              w={`${feeIncome}%`}
              bg="primary.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="xs" color="white" fontWeight="medium">
                {feeIncome}%
              </Text>
            </Box>
            <Box
              h="100%"
              w={`${tokenValueChange}%`}
              bg="secondary.500"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              <Text fontSize="xs" color="white" fontWeight="medium">
                {tokenValueChange}%
              </Text>
            </Box>
          </Flex>
          <Flex justifyContent="space-between" mt={1}>
            <Text fontSize="xs" color="gray.500">
              费用收入: {feeIncome}%
            </Text>
            <Text fontSize="xs" color="gray.500">
              代币价值变化: {tokenValueChange}%
            </Text>
          </Flex>
        </Box>
      </Flex>
    </Box>
  );
};

export default AssetSummary; 