import React from 'react';
import {
  Box,
  Center,
  CircularProgress,
  CircularProgressLabel,
  Flex,
  Heading,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';

interface HealthDashboardProps {
  healthScore: number;
  healthStatus: string;
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({
  healthScore,
  healthStatus,
}) => {
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Calculate color based on health score (1-5)
  const getHealthColor = (score: number) => {
    if (score >= 4.5) return 'success.500';
    if (score >= 3.5) return 'green.400';
    if (score >= 2.5) return 'yellow.400';
    if (score >= 1.5) return 'orange.400';
    return 'danger.500';
  };

  const healthColor = getHealthColor(healthScore);
  const healthPercentage = (healthScore / 5) * 100;

  // Mock data for radar chart
  const riskFactors = [
    { name: '价格风险', value: 4.2 },
    { name: '流动性风险', value: 3.8 },
    { name: '大户行为风险', value: 4.5 },
    { name: '单边LP风险', value: 3.9 },
  ];

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
        健康仪表盘
      </Heading>

      <Flex direction="column" alignItems="center" mb={6}>
        <CircularProgress
          value={healthPercentage}
          color={healthColor}
          size="8cm"
          thickness="4px"
          mb={2}
        >
          <CircularProgressLabel>
            <Text fontSize="4xl" fontWeight="bold">
              {healthScore.toFixed(1)}
            </Text>
            <Text fontSize="sm" color="gray.500">
              / 5.0
            </Text>
          </CircularProgressLabel>
        </CircularProgress>
        <Text fontSize="lg" fontWeight="medium" color={healthColor}>
          {healthStatus}
        </Text>
      </Flex>

      <Box>
        <Text fontSize="sm" fontWeight="medium" mb={3}>
          健康因素分析
        </Text>
        
        {/* 简化的雷达图实现 */}
        <Box position="relative" h="200px" mb={4}>
          {/* 背景圆环 */}
          {[1, 2, 3, 4, 5].map((level) => (
            <Box
              key={level}
              position="absolute"
              top="50%"
              left="50%"
              transform="translate(-50%, -50%)"
              w={`${level * 20}%`}
              h={`${level * 20}%`}
              borderRadius="full"
              border="1px"
              borderColor="gray.200"
              opacity={0.5}
            />
          ))}

          {/* 风险因素轴线 */}
          {riskFactors.map((factor, index) => {
            const angle = (Math.PI * 2 * index) / riskFactors.length;
            const x = Math.sin(angle);
            const y = -Math.cos(angle);
            
            return (
              <React.Fragment key={factor.name}>
                {/* 轴线 */}
                <Box
                  position="absolute"
                  top="50%"
                  left="50%"
                  w="1px"
                  h="50%"
                  bg="gray.200"
                  transform={`translate(-50%, 0) rotate(${angle * (180 / Math.PI)}deg)`}
                  transformOrigin="top"
                />
                
                {/* 轴标签 */}
                <Text
                  position="absolute"
                  top={`${50 + y * 55}%`}
                  left={`${50 + x * 55}%`}
                  transform="translate(-50%, -50%)"
                  fontSize="xs"
                  fontWeight="medium"
                  textAlign="center"
                  w="60px"
                >
                  {factor.name}
                </Text>
                
                {/* 数据点 */}
                <Box
                  position="absolute"
                  top={`${50 + y * (factor.value / 5) * 50}%`}
                  left={`${50 + x * (factor.value / 5) * 50}%`}
                  w="8px"
                  h="8px"
                  borderRadius="full"
                  bg={getHealthColor(factor.value)}
                  transform="translate(-50%, -50%)"
                />
              </React.Fragment>
            );
          })}
          
          {/* 连接数据点的多边形 */}
          <Box
            position="absolute"
            top="0"
            left="0"
            w="100%"
            h="100%"
            opacity={0.2}
            pointerEvents="none"
          >
            <svg width="100%" height="100%" viewBox="0 0 100 100">
              <polygon
                points={riskFactors
                  .map((factor, index) => {
                    const angle = (Math.PI * 2 * index) / riskFactors.length;
                    const x = 50 + Math.sin(angle) * (factor.value / 5) * 50;
                    const y = 50 - Math.cos(angle) * (factor.value / 5) * 50;
                    return `${x},${y}`;
                  })
                  .join(' ')}
                fill={healthColor}
                stroke={healthColor}
                strokeWidth="1"
              />
            </svg>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default HealthDashboard; 