import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  ButtonGroup,
  Button,
  useColorModeValue,
  Select,
} from '@chakra-ui/react';

// 注意：在实际项目中，我们会使用图表库如 recharts 或 chart.js
// 这里我们创建一个模拟的图表组件

interface PerformanceChartProps {
  agentId: string;
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ agentId }) => {
  const [timeRange, setTimeRange] = useState<string>('1w');
  const [chartType, setChartType] = useState<string>('value');
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const chartBg = useColorModeValue('gray.50', 'gray.700');
  
  // 模拟图表数据
  const generateMockChartData = () => {
    // 在实际应用中，这里会根据 agentId, timeRange 和 chartType 从 API 获取数据
    return {
      labels: ['1月', '2月', '3月', '4月', '5月', '6月', '7月'],
      datasets: [
        {
          label: 'Agent 价值',
          data: [10, 12, 11.5, 13.2, 14.8, 14.2, 15.5],
          borderColor: '#36B9CC',
          backgroundColor: 'rgba(54, 185, 204, 0.1)',
        },
        {
          label: 'SOL 价格',
          data: [100, 120, 110, 140, 160, 150, 170],
          borderColor: '#4E73DF',
          backgroundColor: 'rgba(78, 115, 223, 0.1)',
        },
      ],
    };
  };
  
  // 模拟性能指标
  const performanceMetrics = {
    totalReturn: '+55.0%',
    annualizedReturn: '+32.4%',
    sharpeRatio: '1.8',
    maxDrawdown: '-12.3%',
    winRate: '68%',
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
        flexWrap="wrap"
        gap={2}
      >
        <Heading size="md">性能分析</Heading>
        
        <Flex gap={2}>
          <ButtonGroup size="sm" isAttached variant="outline">
            <Button 
              isActive={timeRange === '1d'} 
              onClick={() => setTimeRange('1d')}
            >
              1天
            </Button>
            <Button 
              isActive={timeRange === '1w'} 
              onClick={() => setTimeRange('1w')}
            >
              1周
            </Button>
            <Button 
              isActive={timeRange === '1m'} 
              onClick={() => setTimeRange('1m')}
            >
              1月
            </Button>
            <Button 
              isActive={timeRange === '3m'} 
              onClick={() => setTimeRange('3m')}
            >
              3月
            </Button>
            <Button 
              isActive={timeRange === 'all'} 
              onClick={() => setTimeRange('all')}
            >
              全部
            </Button>
          </ButtonGroup>
          
          <Select 
            value={chartType} 
            onChange={(e) => setChartType(e.target.value)}
            size="sm"
            width="120px"
          >
            <option value="value">资产价值</option>
            <option value="profit">收益</option>
            <option value="comparison">对比基准</option>
          </Select>
        </Flex>
      </Flex>
      
      <Box p={4}>
        {/* 性能指标 */}
        <Flex 
          mb={4} 
          justifyContent="space-between" 
          flexWrap="wrap"
          gap={2}
        >
          <Box>
            <Text fontSize="sm" color="gray.500">总收益</Text>
            <Text fontSize="xl" fontWeight="bold" color="success.500">
              {performanceMetrics.totalReturn}
            </Text>
          </Box>
          
          <Box>
            <Text fontSize="sm" color="gray.500">年化收益</Text>
            <Text fontSize="xl" fontWeight="bold" color="success.500">
              {performanceMetrics.annualizedReturn}
            </Text>
          </Box>
          
          <Box>
            <Text fontSize="sm" color="gray.500">夏普比率</Text>
            <Text fontSize="xl" fontWeight="bold">
              {performanceMetrics.sharpeRatio}
            </Text>
          </Box>
          
          <Box>
            <Text fontSize="sm" color="gray.500">最大回撤</Text>
            <Text fontSize="xl" fontWeight="bold" color="danger.500">
              {performanceMetrics.maxDrawdown}
            </Text>
          </Box>
          
          <Box>
            <Text fontSize="sm" color="gray.500">胜率</Text>
            <Text fontSize="xl" fontWeight="bold">
              {performanceMetrics.winRate}
            </Text>
          </Box>
        </Flex>
        
        {/* 图表占位符 */}
        <Box 
          height="300px" 
          bg={chartBg} 
          borderRadius="md" 
          p={4}
          display="flex"
          alignItems="center"
          justifyContent="center"
        >
          <Text color="gray.500">
            这里将显示 {chartType === 'value' ? '资产价值' : 
                      chartType === 'profit' ? '收益' : '对比基准'} 图表
            ({timeRange === '1d' ? '1天' : 
              timeRange === '1w' ? '1周' : 
              timeRange === '1m' ? '1月' : 
              timeRange === '3m' ? '3月' : '全部'})
          </Text>
        </Box>
        
        <Text fontSize="xs" color="gray.500" mt={2} textAlign="center">
          注：图表数据仅供参考，过往表现不代表未来收益。
        </Text>
      </Box>
    </Box>
  );
};

export default PerformanceChart; 