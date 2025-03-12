import React, { useState } from 'react';
import {
  Box,
  Flex,
  Heading,
  Text,
  SimpleGrid,
  FormControl,
  FormLabel,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Switch,
  Slider,
  SliderTrack,
  SliderFilledTrack,
  SliderThumb,
  Button,
  Tooltip,
  Icon,
  useColorModeValue,
  Divider,
} from '@chakra-ui/react';
import { FiInfo, FiSave, FiRefreshCw } from 'react-icons/fi';

interface StrategySettingsProps {
  isEditable?: boolean;
  onSave?: (settings: any) => void;
}

const StrategySettings: React.FC<StrategySettingsProps> = ({ 
  isEditable = false,
  onSave,
}) => {
  // 模拟策略设置数据
  const [settings, setSettings] = useState({
    // 基本设置
    strategyType: 'balanced',
    autoRebalance: true,
    rebalanceThreshold: 5,
    maxSlippage: 1.0,
    
    // 风险管理
    maxDrawdown: 15,
    stopLoss: 10,
    takeProfit: 30,
    
    // 资金分配
    maxAllocation: 40,
    minLiquidity: 20,
    targetAPR: 25,
    
    // 高级设置
    signalConfidenceThreshold: 75,
    minPoolTVL: 1000000,
    maxPoolRisk: 'medium',
    prioritizeStablePairs: true,
  });
  
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');
  const sectionBg = useColorModeValue('gray.50', 'gray.700');
  
  // 处理设置变更
  const handleSettingChange = (field: string, value: any) => {
    if (!isEditable) return;
    
    setSettings(prev => ({
      ...prev,
      [field]: value,
    }));
  };
  
  // 处理保存
  const handleSave = () => {
    if (onSave) {
      onSave(settings);
    }
  };
  
  // 重置为默认设置
  const handleReset = () => {
    setSettings({
      strategyType: 'balanced',
      autoRebalance: true,
      rebalanceThreshold: 5,
      maxSlippage: 1.0,
      maxDrawdown: 15,
      stopLoss: 10,
      takeProfit: 30,
      maxAllocation: 40,
      minLiquidity: 20,
      targetAPR: 25,
      signalConfidenceThreshold: 75,
      minPoolTVL: 1000000,
      maxPoolRisk: 'medium',
      prioritizeStablePairs: true,
    });
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
      >
        <Heading size="md">策略设置</Heading>
        
        {isEditable && (
          <Flex gap={2}>
            <Button 
              leftIcon={<FiRefreshCw />} 
              variant="outline" 
              size="sm"
              onClick={handleReset}
            >
              重置
            </Button>
            <Button 
              leftIcon={<FiSave />} 
              colorScheme="primary" 
              size="sm"
              onClick={handleSave}
            >
              保存设置
            </Button>
          </Flex>
        )}
      </Flex>
      
      <Box p={4}>
        {/* 基本设置 */}
        <Box 
          p={4} 
          bg={sectionBg} 
          borderRadius="md" 
          mb={4}
        >
          <Heading size="sm" mb={3}>基本设置</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>
                策略类型
                <Tooltip label="选择预设的策略类型，影响风险偏好和收益目标">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <Select 
                value={settings.strategyType} 
                onChange={(e) => handleSettingChange('strategyType', e.target.value)}
                isDisabled={!isEditable}
              >
                <option value="conservative">保守型 (低风险，稳定收益)</option>
                <option value="balanced">平衡型 (中等风险，中等收益)</option>
                <option value="aggressive">激进型 (高风险，高收益)</option>
                <option value="custom">自定义</option>
              </Select>
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="autoRebalance" mb="0">
                自动再平衡
                <Tooltip label="开启后，Agent将根据市场情况自动调整仓位">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <Switch 
                id="autoRebalance" 
                isChecked={settings.autoRebalance}
                onChange={(e) => handleSettingChange('autoRebalance', e.target.checked)}
                colorScheme="primary"
                isDisabled={!isEditable}
              />
            </FormControl>
            
            <FormControl>
              <FormLabel>
                再平衡阈值 (%)
                <Tooltip label="当资产配置偏离目标配置超过此百分比时触发再平衡">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.rebalanceThreshold} 
                onChange={(_, val) => handleSettingChange('rebalanceThreshold', val)}
                min={1}
                max={20}
                isDisabled={!isEditable || !settings.autoRebalance}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>
                最大滑点 (%)
                <Tooltip label="交易执行时允许的最大价格滑点百分比">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.maxSlippage} 
                onChange={(_, val) => handleSettingChange('maxSlippage', val)}
                min={0.1}
                max={5}
                step={0.1}
                precision={1}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </SimpleGrid>
        </Box>
        
        {/* 风险管理 */}
        <Box 
          p={4} 
          bg={sectionBg} 
          borderRadius="md" 
          mb={4}
        >
          <Heading size="sm" mb={3}>风险管理</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl>
              <FormLabel>
                最大回撤 (%)
                <Tooltip label="允许的最大回撤百分比，超过此值将触发风险控制机制">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.maxDrawdown} 
                onChange={(_, val) => handleSettingChange('maxDrawdown', val)}
                min={5}
                max={50}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>
                止损 (%)
                <Tooltip label="单个仓位的止损百分比，达到此值将自动平仓">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.stopLoss} 
                onChange={(_, val) => handleSettingChange('stopLoss', val)}
                min={5}
                max={30}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>
                止盈 (%)
                <Tooltip label="单个仓位的止盈百分比，达到此值将自动平仓">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.takeProfit} 
                onChange={(_, val) => handleSettingChange('takeProfit', val)}
                min={10}
                max={100}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </SimpleGrid>
        </Box>
        
        {/* 资金分配 */}
        <Box 
          p={4} 
          bg={sectionBg} 
          borderRadius="md" 
          mb={4}
        >
          <Heading size="sm" mb={3}>资金分配</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 3 }} spacing={4}>
            <FormControl>
              <FormLabel>
                最大单池分配 (%)
                <Tooltip label="单个池子的最大资金分配百分比">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.maxAllocation} 
                onChange={(_, val) => handleSettingChange('maxAllocation', val)}
                min={10}
                max={80}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>
                最小流动性保留 (%)
                <Tooltip label="保留为流动性（未投资）的资金百分比">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.minLiquidity} 
                onChange={(_, val) => handleSettingChange('minLiquidity', val)}
                min={5}
                max={50}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>
                目标年化收益率 (%)
                <Tooltip label="策略的目标年化收益率，影响风险偏好">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.targetAPR} 
                onChange={(_, val) => handleSettingChange('targetAPR', val)}
                min={5}
                max={100}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
          </SimpleGrid>
        </Box>
        
        {/* 高级设置 */}
        <Box 
          p={4} 
          bg={sectionBg} 
          borderRadius="md"
        >
          <Heading size="sm" mb={3}>高级设置</Heading>
          
          <SimpleGrid columns={{ base: 1, md: 2 }} spacing={4}>
            <FormControl>
              <FormLabel>
                信号置信度阈值
                <Tooltip label="执行交易所需的最小信号置信度百分比">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <Flex>
                <Slider 
                  flex="1" 
                  value={settings.signalConfidenceThreshold}
                  onChange={(val) => handleSettingChange('signalConfidenceThreshold', val)}
                  min={50}
                  max={95}
                  step={5}
                  colorScheme="primary"
                  isDisabled={!isEditable}
                >
                  <SliderTrack>
                    <SliderFilledTrack />
                  </SliderTrack>
                  <SliderThumb boxSize={6} />
                </Slider>
                <Text ml={4} minW="40px" textAlign="right">
                  {settings.signalConfidenceThreshold}%
                </Text>
              </Flex>
            </FormControl>
            
            <FormControl>
              <FormLabel>
                最小池子TVL ($)
                <Tooltip label="考虑投资的池子的最小总锁仓价值">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <NumberInput 
                value={settings.minPoolTVL} 
                onChange={(_, val) => handleSettingChange('minPoolTVL', val)}
                min={100000}
                max={10000000}
                step={100000}
                isDisabled={!isEditable}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <FormControl>
              <FormLabel>
                最大池子风险
                <Tooltip label="允许投资的池子的最大风险等级">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <Select 
                value={settings.maxPoolRisk} 
                onChange={(e) => handleSettingChange('maxPoolRisk', e.target.value)}
                isDisabled={!isEditable}
              >
                <option value="low">低风险</option>
                <option value="medium">中等风险</option>
                <option value="high">高风险</option>
              </Select>
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="prioritizeStablePairs" mb="0">
                优先稳定币交易对
                <Tooltip label="开启后，优先考虑包含稳定币的交易对">
                  <Icon as={FiInfo} ml={1} fontSize="xs" />
                </Tooltip>
              </FormLabel>
              <Switch 
                id="prioritizeStablePairs" 
                isChecked={settings.prioritizeStablePairs}
                onChange={(e) => handleSettingChange('prioritizeStablePairs', e.target.checked)}
                colorScheme="primary"
                isDisabled={!isEditable}
              />
            </FormControl>
          </SimpleGrid>
        </Box>
      </Box>
    </Box>
  );
};

export default StrategySettings; 