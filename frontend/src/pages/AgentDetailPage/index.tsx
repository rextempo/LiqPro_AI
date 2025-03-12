import React, { useState } from 'react';
import { useParams } from 'react-router-dom';
import {
  Box,
  Button,
  Flex,
  Grid,
  Heading,
  HStack,
  SimpleGrid,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Text,
  useColorModeValue,
  useDisclosure,
} from '@chakra-ui/react';
import { FiPlay, FiPause, FiAlertTriangle } from 'react-icons/fi';
import AgentHeader from '../../components/AgentDetail/AgentHeader';
import AssetSummary from '../../components/AgentDetail/AssetSummary';
import HealthDashboard from '../../components/AgentDetail/HealthDashboard';
import AgentLog from '../../components/AgentDetail/AgentLog';
import PoolPositions from '../../components/AgentDetail/PoolPositions';
import TransactionHistory from '../../components/AgentDetail/TransactionHistory';
import EmergencyExitModal from '../../components/AgentDetail/EmergencyExitModal';

// Mock data
const mockAgentData = {
  id: '1',
  name: 'Agent Alpha',
  status: 'running',
  runningTime: '3天12小时',
  assetValueSOL: 12.345,
  assetValueUSD: 1234.56,
  totalProfitSOL: 1.234,
  totalProfitUSD: 123.45,
  totalProfitPercent: 10.5,
  apr: 42.3,
  healthScore: 4.2,
  healthStatus: '良好',
  feeIncome: 65,
  tokenValueChange: 35,
};

const mockPoolPositions = [
  {
    id: '1',
    name: 'SOL-USDC',
    icons: ['sol', 'usdc'],
    valueSOL: 5.123,
    valueUSD: 512.30,
    yield24h: 2.34,
    healthScore: 4.5,
  },
  {
    id: '2',
    name: 'SOL-BONK',
    icons: ['sol', 'bonk'],
    valueSOL: 3.456,
    valueUSD: 345.60,
    yield24h: 3.21,
    healthScore: 3.8,
  },
  {
    id: '3',
    name: 'USDC-USDT',
    icons: ['usdc', 'usdt'],
    valueSOL: 3.766,
    valueUSD: 376.60,
    yield24h: 1.12,
    healthScore: 4.7,
  },
];

const mockTransactions = [
  {
    id: '1',
    time: '2023-03-22 14:32:45',
    type: 'add_lp',
    amount: '2.5 SOL',
    impact: '+0.12%',
    txHash: '5xG...7Hj',
  },
  {
    id: '2',
    time: '2023-03-21 09:15:22',
    type: 'remove_lp',
    amount: '1.2 SOL',
    impact: '-0.05%',
    txHash: '8pL...2Kf',
  },
  {
    id: '3',
    time: '2023-03-20 18:45:11',
    type: 'swap',
    amount: '50 USDC',
    impact: '+0.08%',
    txHash: '3mN...9Qr',
  },
];

const AgentDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [timeRange, setTimeRange] = useState<string>('7d');
  const { isOpen, onOpen, onClose } = useDisclosure();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box>
      <AgentHeader
        name={mockAgentData.name}
        status={mockAgentData.status}
        runningTime={mockAgentData.runningTime}
        onPause={() => console.log('Pause agent')}
        onResume={() => console.log('Resume agent')}
        onEmergencyExit={onOpen}
      />

      <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6} mb={6}>
        <AssetSummary
          assetValueSOL={mockAgentData.assetValueSOL}
          assetValueUSD={mockAgentData.assetValueUSD}
          totalProfitSOL={mockAgentData.totalProfitSOL}
          totalProfitUSD={mockAgentData.totalProfitUSD}
          totalProfitPercent={mockAgentData.totalProfitPercent}
          timeRange={timeRange}
          onTimeRangeChange={setTimeRange}
          apr={mockAgentData.apr}
          feeIncome={mockAgentData.feeIncome}
          tokenValueChange={mockAgentData.tokenValueChange}
        />
        
        <HealthDashboard
          healthScore={mockAgentData.healthScore}
          healthStatus={mockAgentData.healthStatus}
        />
      </SimpleGrid>

      <AgentLog mb={6} />

      <Heading as="h3" size="md" mb={4}>
        当前LP仓位 ({mockPoolPositions.length}/5个活跃仓位)
      </Heading>
      <PoolPositions positions={mockPoolPositions} mb={6} />

      <Heading as="h3" size="md" mb={4}>
        最近交易
      </Heading>
      <TransactionHistory transactions={mockTransactions} />

      <EmergencyExitModal
        isOpen={isOpen}
        onClose={onClose}
        onConfirm={() => {
          console.log('Emergency exit confirmed');
          onClose();
        }}
      />
    </Box>
  );
};

export default AgentDetailPage; 