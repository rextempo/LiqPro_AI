import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  GridItem,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  useColorModeValue,
} from '@chakra-ui/react';

import Layout from '../components/Layout/Layout';
import AgentHeader from '../components/AgentDetail/AgentHeader';
import AssetSummary from '../components/AgentDetail/AssetSummary';
import HealthDashboard from '../components/AgentDetail/HealthDashboard';
import PerformanceChart from '../components/AgentDetail/PerformanceChart';
import PoolPositions from '../components/AgentDetail/PoolPositions';
import TransactionHistory from '../components/AgentDetail/TransactionHistory';
import AgentLog from '../components/AgentDetail/AgentLog';
import StrategySettings from '../components/AgentDetail/StrategySettings';

// Mock data for the agent
const mockAgent = {
  id: '1',
  name: 'Meteora LP Agent #1',
  status: 'running', // 'running', 'paused', 'stopped'
  runningTime: '3d 5h 12m',
  assetValue: {
    sol: 125.45,
    usd: 12545.00,
  },
  profit: {
    sol: 12.45,
    usd: 1245.00,
    percentage: 11.2,
  },
  expectedAPR: 32.5,
  healthScore: 4.2,
  healthStatus: 'Healthy',
};

// Mock data for pool positions
const mockPoolPositions = [
  {
    id: '1',
    name: 'SOL-USDC',
    icons: ['sol', 'usdc'],
    value: {
      sol: 50.25,
      usd: 5025.00,
    },
    yield24h: 0.35,
    healthScore: 4.5,
  },
  {
    id: '2',
    name: 'SOL-BONK',
    icons: ['sol', 'bonk'],
    value: {
      sol: 35.75,
      usd: 3575.00,
    },
    yield24h: 1.25,
    healthScore: 3.8,
  },
  {
    id: '3',
    name: 'USDC-USDT',
    icons: ['usdc', 'usdt'],
    value: {
      sol: 39.45,
      usd: 3945.00,
    },
    yield24h: 0.15,
    healthScore: 4.9,
  },
];

// Mock data for transactions
const mockTransactions = [
  {
    id: '1',
    time: '2023-06-15 14:32:45',
    type: 'add_lp',
    amount: '25.5 SOL to SOL-USDC',
    impact: '+0.00%',
    txHash: '5xG...7Uh',
  },
  {
    id: '2',
    time: '2023-06-14 09:15:22',
    type: 'swap',
    amount: '10 SOL to USDC',
    impact: '+0.12%',
    txHash: '3pF...9Kj',
  },
  {
    id: '3',
    time: '2023-06-13 18:45:11',
    type: 'add_lp',
    amount: '1000 USDC to USDC-USDT',
    impact: '+0.05%',
    txHash: '7tR...2Lm',
  },
  {
    id: '4',
    time: '2023-06-12 11:22:33',
    type: 'remove_lp',
    amount: '5 SOL from SOL-BONK',
    impact: '-0.08%',
    txHash: '9yH...4Pq',
  },
  {
    id: '5',
    time: '2023-06-11 16:05:19',
    type: 'add_lp',
    amount: '15 SOL to SOL-BONK',
    impact: '+0.22%',
    txHash: '2kL...8Vb',
  },
];

const AgentDetailPage: React.FC = () => {
  const { agentId } = useParams<{ agentId: string }>();
  const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
  
  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // Handlers for agent actions
  const handlePauseAgent = () => {
    console.log('Pause agent:', agentId);
  };

  const handleResumeAgent = () => {
    console.log('Resume agent:', agentId);
  };

  const handleEmergencyExit = () => {
    console.log('Emergency exit for agent:', agentId);
  };

  const handleTimeRangeChange = (range: '24h' | '7d' | '30d' | 'all') => {
    setTimeRange(range);
  };

  return (
    <Layout>
      <Box p={4} bg={bgColor} minH="calc(100vh - 64px)">
        <AgentHeader
          name={mockAgent.name}
          status={mockAgent.status}
          runningTime={mockAgent.runningTime}
          onPause={handlePauseAgent}
          onResume={handleResumeAgent}
          onEmergencyExit={handleEmergencyExit}
        />

        <Grid
          templateColumns={{ base: "1fr", md: "repeat(3, 1fr)" }}
          gap={4}
          mt={4}
        >
          <GridItem colSpan={{ base: 1, md: 2 }}>
            <AssetSummary
              currentValueSol={mockAgent.assetValue.sol}
              currentValueUsd={mockAgent.assetValue.usd}
              profitSol={mockAgent.profit.sol}
              profitUsd={mockAgent.profit.usd}
              profitPercentage={mockAgent.profit.percentage}
              expectedAPR={mockAgent.expectedAPR}
              selectedTimeRange={timeRange}
              onTimeRangeChange={handleTimeRangeChange}
            />
          </GridItem>
          
          <GridItem colSpan={1}>
            <HealthDashboard
              healthScore={mockAgent.healthScore}
              healthStatus={mockAgent.healthStatus}
            />
          </GridItem>
        </Grid>

        <Tabs mt={6} colorScheme="primary" variant="enclosed">
          <TabList>
            <Tab>仓位</Tab>
            <Tab>表现</Tab>
            <Tab>交易</Tab>
            <Tab>日志</Tab>
            <Tab>设置</Tab>
          </TabList>

          <TabPanels
            borderWidth="1px"
            borderColor={borderColor}
            borderBottomRadius="md"
            bg={useColorModeValue('white', 'gray.800')}
          >
            <TabPanel>
              <PoolPositions positions={mockPoolPositions} />
            </TabPanel>
            
            <TabPanel>
              <PerformanceChart title="历史收益" />
            </TabPanel>
            
            <TabPanel>
              <TransactionHistory transactions={mockTransactions} />
            </TabPanel>
            
            <TabPanel>
              <AgentLog />
            </TabPanel>
            
            <TabPanel>
              <StrategySettings />
            </TabPanel>
          </TabPanels>
        </Tabs>
      </Box>
    </Layout>
  );
};

export default AgentDetailPage; 