import React from 'react';
import {
  Box,
  Button,
  Flex,
  HStack,
  Image,
  SimpleGrid,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiX } from 'react-icons/fi';

interface PoolPosition {
  id: string;
  name: string;
  icons: string[];
  valueSOL: number;
  valueUSD: number;
  yield24h: number;
  healthScore: number;
}

interface PoolPositionsProps {
  positions: PoolPosition[];
  mb?: number | string;
}

const PoolPositions: React.FC<PoolPositionsProps> = ({ positions, mb }) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Get health color based on score
  const getHealthColor = (score: number) => {
    if (score >= 4.5) return 'success.500';
    if (score >= 3.5) return 'green.400';
    if (score >= 2.5) return 'yellow.400';
    if (score >= 1.5) return 'orange.400';
    return 'danger.500';
  };

  // Mock token icons (in a real app, these would be imported properly)
  const getTokenIcon = (token: string) => {
    const tokenIcons: Record<string, string> = {
      sol: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png',
      usdc: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png',
      usdt: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB/logo.png',
      bonk: 'https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263/logo.png',
    };
    
    return tokenIcons[token.toLowerCase()] || '';
  };

  return (
    <Box mb={mb}>
      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4}>
        {positions.map((position) => (
          <Box
            key={position.id}
            bg={cardBg}
            p={4}
            borderRadius="lg"
            boxShadow="sm"
            borderWidth="1px"
            borderColor={borderColor}
          >
            <Flex justifyContent="space-between" alignItems="center" mb={3}>
              <HStack spacing={2}>
                <HStack spacing={-2}>
                  {position.icons.map((icon, index) => (
                    <Box
                      key={index}
                      borderRadius="full"
                      borderWidth="2px"
                      borderColor={cardBg}
                      overflow="hidden"
                      boxSize="32px"
                    >
                      <Image src={getTokenIcon(icon)} alt={icon} boxSize="100%" />
                    </Box>
                  ))}
                </HStack>
                <Text fontWeight="medium">{position.name}</Text>
              </HStack>
              <Box
                w="12px"
                h="12px"
                borderRadius="full"
                bg={getHealthColor(position.healthScore)}
                title={`健康度: ${position.healthScore.toFixed(1)}/5.0`}
              />
            </Flex>

            <Flex justifyContent="space-between" mb={3}>
              <Box>
                <Text fontSize="sm" color="gray.500">
                  当前价值
                </Text>
                <Text fontWeight="medium">{position.valueSOL.toFixed(3)} SOL</Text>
                <Text fontSize="xs" color="gray.500">
                  ${position.valueUSD.toFixed(2)}
                </Text>
              </Box>
              <Box textAlign="right">
                <Text fontSize="sm" color="gray.500">
                  24h收益率
                </Text>
                <Text
                  fontWeight="medium"
                  color={position.yield24h >= 0 ? 'success.500' : 'danger.500'}
                >
                  {position.yield24h.toFixed(2)}%
                </Text>
              </Box>
            </Flex>

            <Button
              size="sm"
              width="full"
              leftIcon={<FiX />}
              variant="outline"
              colorScheme="gray"
            >
              退出仓位
            </Button>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
};

export default PoolPositions; 