import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Icon,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Select,
  Switch,
  Text,
  Tooltip,
  VStack,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FiInfo, FiArrowRight } from 'react-icons/fi';
import { ButtonIcon, IconWrapper } from '../components/IconWrapper';

import { StrategySettings } from '../components/AgentDetail';

const CreateAgentPage: React.FC = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: '',
    initialInvestment: 10,
    strategy: 'balanced',
    autoRebalance: true,
  });

  const bgColor = useColorModeValue('gray.50', 'gray.900');
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleNextStep = () => {
    if (step === 1) {
      // Validate step 1
      if (!formData.name.trim()) {
        toast({
          title: '请输入Agent名称',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
      if (formData.initialInvestment <= 0) {
        toast({
          title: '初始投资必须大于0',
          status: 'error',
          duration: 3000,
          isClosable: true,
        });
        return;
      }
    }
    
    if (step < 3) {
      setStep(step + 1);
    } else {
      // Submit form
      handleSubmit();
    }
  };

  const handlePrevStep = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSubmit = () => {
    // In a real app, this would send data to the backend
    console.log('Submitting agent data:', formData);
    
    // Show success message
    toast({
      title: 'Agent创建成功',
      description: `${formData.name} 已成功创建并开始初始化`,
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
    
    // Navigate to dashboard
    navigate('/dashboard');
  };

  return (
    <Box p={4} bg={bgColor} minH="calc(100vh - 64px)">
      <Heading size="lg" mb={6}>创建新Agent</Heading>
      
      <Flex mb={8} justify="center">
        <Flex align="center" width="80%">
          <Box 
            borderRadius="full" 
            bg={step >= 1 ? 'primary.500' : 'gray.300'} 
            color="white" 
            width="40px" 
            height="40px" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            fontWeight="bold"
          >
            1
          </Box>
          <Divider 
            flex="1" 
            borderColor={step >= 2 ? 'primary.500' : 'gray.300'} 
            borderWidth="2px" 
          />
          <Box 
            borderRadius="full" 
            bg={step >= 2 ? 'primary.500' : 'gray.300'} 
            color="white" 
            width="40px" 
            height="40px" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            fontWeight="bold"
          >
            2
          </Box>
          <Divider 
            flex="1" 
            borderColor={step >= 3 ? 'primary.500' : 'gray.300'} 
            borderWidth="2px" 
          />
          <Box 
            borderRadius="full" 
            bg={step >= 3 ? 'primary.500' : 'gray.300'} 
            color="white" 
            width="40px" 
            height="40px" 
            display="flex" 
            alignItems="center" 
            justifyContent="center"
            fontWeight="bold"
          >
            3
          </Box>
        </Flex>
      </Flex>
      
      <Box 
        bg={cardBg} 
        p={6} 
        borderRadius="lg" 
        boxShadow="md" 
        borderWidth="1px" 
        borderColor={borderColor}
        maxW="800px"
        mx="auto"
      >
        {step === 1 && (
          <>
            <Heading size="md" mb={4}>基本信息</Heading>
            <VStack spacing={6} align="stretch">
              <FormControl isRequired>
                <FormLabel>Agent名称</FormLabel>
                <Input 
                  value={formData.name} 
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="例如: Meteora LP Agent #1"
                />
              </FormControl>
              
              <FormControl isRequired>
                <FormLabel>初始投资 (SOL)</FormLabel>
                <NumberInput 
                  value={formData.initialInvestment} 
                  onChange={(_, val) => handleInputChange('initialInvestment', val)}
                  min={0.1}
                  precision={2}
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
                  策略类型
                  <Tooltip label="选择预设的策略类型，影响风险偏好和收益目标" placement="top">
                    <IconWrapper icon={FiInfo} ml={1} fontSize="xs" />
                  </Tooltip>
                </FormLabel>
                <Select 
                  value={formData.strategy} 
                  onChange={(e) => handleInputChange('strategy', e.target.value)}
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
                  <Tooltip label="开启后，Agent将根据市场情况自动调整仓位" placement="top">
                    <IconWrapper icon={FiInfo} ml={1} fontSize="xs" />
                  </Tooltip>
                </FormLabel>
                <Switch 
                  id="autoRebalance" 
                  isChecked={formData.autoRebalance}
                  onChange={(e) => handleInputChange('autoRebalance', e.target.checked)}
                  colorScheme="primary"
                />
              </FormControl>
            </VStack>
          </>
        )}
        
        {step === 2 && (
          <>
            <Heading size="md" mb={4}>策略设置</Heading>
            <StrategySettings isEditable={true} />
          </>
        )}
        
        {step === 3 && (
          <>
            <Heading size="md" mb={4}>确认创建</Heading>
            <VStack spacing={4} align="stretch">
              <Box p={4} bg="gray.50" borderRadius="md">
                <Text fontWeight="bold">Agent名称:</Text>
                <Text mb={3}>{formData.name}</Text>
                
                <Text fontWeight="bold">初始投资:</Text>
                <Text mb={3}>{formData.initialInvestment} SOL</Text>
                
                <Text fontWeight="bold">策略类型:</Text>
                <Text mb={3}>
                  {formData.strategy === 'conservative' ? '保守型' : 
                   formData.strategy === 'balanced' ? '平衡型' : 
                   formData.strategy === 'aggressive' ? '激进型' : '自定义'}
                </Text>
                
                <Text fontWeight="bold">自动再平衡:</Text>
                <Text>{formData.autoRebalance ? '开启' : '关闭'}</Text>
              </Box>
              
              <Box p={4} borderRadius="md" borderWidth="1px" borderColor="yellow.300" bg="yellow.50">
                <Text fontWeight="bold" color="yellow.800">注意事项:</Text>
                <Text color="yellow.800">
                  创建Agent后，系统将从您的钱包中转移 {formData.initialInvestment} SOL 到Agent的智能合约中。
                  请确保您的钱包中有足够的SOL，并且已经授权此操作。
                </Text>
              </Box>
            </VStack>
          </>
        )}
        
        <Flex justifyContent="space-between" mt={8}>
          {step > 1 ? (
            <Button onClick={handlePrevStep} variant="outline">
              上一步
            </Button>
          ) : (
            <Box></Box>
          )}
          
          <Button 
            onClick={handleNextStep} 
            colorScheme="primary"
            rightIcon={step < 3 ? <ButtonIcon icon={FiArrowRight} /> : undefined}
          >
            {step < 3 ? '下一步' : '创建Agent'}
          </Button>
        </Flex>
      </Box>
    </Box>
  );
};

export default CreateAgentPage; 