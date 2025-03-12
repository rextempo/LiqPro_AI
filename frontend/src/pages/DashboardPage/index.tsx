import React, { useState } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  Link,
  SimpleGrid,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  StatArrow,
  Tab,
  TabList,
  Tabs,
  Text,
  useColorModeValue,
  VStack,
  Badge,
} from '@chakra-ui/react';
import { FiPlus, FiPlay, FiPause } from 'react-icons/fi';

// 导入我们刚刚创建的组件
import {
  MarketOverview,
  SignalsList,
  PoolsOverview,
  AssetCard,
  ProfitCard,
  YieldCard,
  AgentCard
} from '../../components/Dashboard';

// Mock data
const mockAgents = [
  {
    id: '1',
    name: 'Agent Alpha',
    status: 'running',
    yield24h: 2.34,
    yieldTrend: 'up',
    assetValueSOL: 12.345,
    assetValueUSD: 1234.56,
  },
  {
    id: '2',
    name: 'Agent Beta',
    status: 'observing',
    yield24h: 1.12,
    yieldTrend: 'down',
    assetValueSOL: 8.765,
    assetValueUSD: 876.54,
  },
  {
    id: '3',
    name: 'Agent Gamma',
    status: 'stopped',
    yield24h: 0,
    yieldTrend: 'neutral',
    assetValueSOL: 5.432,
    assetValueUSD: 543.21,
  },
];

const DashboardPage: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('24h');
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  
  const filteredAgents = statusFilter === 'all' 
    ? mockAgents 
    : mockAgents.filter(agent => agent.status === statusFilter);

  return (
    <Box>
      <Flex justifyContent="space-between" alignItems="center" mb={6}>
        <Heading as="h1" size="lg">
          Dashboard
        </Heading>
        <Button
          leftIcon={<FiPlus />}
          colorScheme="primary"
          size="md"
          as={RouterLink}
          to="/agent/create"
        >
          创建新Agent
        </Button>
      </Flex>

      {/* Market Overview Section */}
      <MarketOverview />

      {/* Asset Overview Section */}
      <Heading as="h2" size="md" mb={4}>
        总资产和收益概览
      </Heading>
      <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4} mb={8}>
        <AssetCard 
          solAmount={26.542}
          usdAmount={2654.31}
          changePercent={1.23}
          changeDirection="increase"
        />
        <ProfitCard 
          solAmount={3.217}
          usdAmount={321.70}
          totalYieldPercent={12.1}
          changeDirection="increase"
        />
        <YieldCard 
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          yieldPercent={timeRange === '24h' ? 1.23 : timeRange === '7d' ? 5.67 : 12.1}
        />
      </SimpleGrid>

      {/* Agents Section */}
      <Flex justifyContent="space-between" alignItems="center" mb={4}>
        <Heading as="h2" size="md">
          Agent管理
        </Heading>
        <Tabs size="sm" variant="soft-rounded" colorScheme="primary" defaultValue="all">
          <TabList>
            <Tab onClick={() => setStatusFilter('all')}>全部</Tab>
            <Tab onClick={() => setStatusFilter('running')}>运行中</Tab>
            <Tab onClick={() => setStatusFilter('observing')}>观察中</Tab>
            <Tab onClick={() => setStatusFilter('stopped')}>已停止</Tab>
          </TabList>
        </Tabs>
      </Flex>

      <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={4} mb={8}>
        {filteredAgents.map((agent) => (
          <AgentCard
            key={agent.id}
            id={agent.id}
            name={agent.name}
            status={agent.status}
            yield24h={agent.yield24h}
            yieldTrend={agent.yieldTrend}
            assetValueSOL={agent.assetValueSOL}
            assetValueUSD={agent.assetValueUSD}
          />
        ))}
      </SimpleGrid>

      {/* Signals Section */}
      <SignalsList />

      {/* Pools Section */}
      <PoolsOverview />
    </Box>
  );
};

export default DashboardPage; 