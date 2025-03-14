import React, { useState } from 'react';
import {
  Box,
  Button,
  Divider,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  SimpleGrid,
  Stack,
  Switch,
  Text,
  useColorModeValue,
  useToast,
} from '@chakra-ui/react';
import { FiSave, FiDownload } from 'react-icons/fi';
import { ButtonIcon } from '../../components/IconWrapper';

const SettingsPage: React.FC = () => {
  const [fundAmount, setFundAmount] = useState<string>('0');
  const [withdrawAmount, setWithdrawAmount] = useState<string>('0');
  const [riskLevel, setRiskLevel] = useState<number>(3);
  const [emailNotifications, setEmailNotifications] = useState<boolean>(true);
  const [pushNotifications, setPushNotifications] = useState<boolean>(true);
  
  const toast = useToast();
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const handleSaveSettings = () => {
    toast({
      title: '设置已保存',
      description: '您的设置已成功更新',
      status: 'success',
      duration: 5000,
      isClosable: true,
    });
  };

  return (
    <Box>
      <Heading as="h1" size="lg" mb={6}>
        设置
      </Heading>

      <SimpleGrid columns={{ base: 1, md: 2 }} spacing={6}>
        {/* 资金管理 */}
        <Box
          bg={cardBg}
          p={5}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Heading as="h2" size="md" mb={4}>
            资金管理
          </Heading>
          
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>充值金额 (SOL)</FormLabel>
              <NumberInput
                value={fundAmount}
                onChange={(valueString) => setFundAmount(valueString)}
                min={0}
                precision={3}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <Button
              colorScheme="primary"
              leftIcon={<ButtonIcon icon={FiSave} />}
              isDisabled={parseFloat(fundAmount) <= 0}
            >
              充值
            </Button>
            
            <Divider my={2} />
            
            <FormControl>
              <FormLabel>提取金额 (SOL)</FormLabel>
              <NumberInput
                value={withdrawAmount}
                onChange={(valueString) => setWithdrawAmount(valueString)}
                min={0}
                precision={3}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
            </FormControl>
            
            <Button
              colorScheme="primary"
              variant="outline"
              leftIcon={<ButtonIcon icon={FiDownload} />}
              isDisabled={parseFloat(withdrawAmount) <= 0}
            >
              提取
            </Button>
          </Stack>
        </Box>

        {/* 风险偏好 */}
        <Box
          bg={cardBg}
          p={5}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Heading as="h2" size="md" mb={4}>
            风险偏好
          </Heading>
          
          <Stack spacing={4}>
            <FormControl>
              <FormLabel>全局风险等级 (1-5)</FormLabel>
              <NumberInput
                value={riskLevel}
                onChange={(_, valueNumber) => setRiskLevel(valueNumber)}
                min={1}
                max={5}
                step={1}
              >
                <NumberInputField />
                <NumberInputStepper>
                  <NumberIncrementStepper />
                  <NumberDecrementStepper />
                </NumberInputStepper>
              </NumberInput>
              <Text fontSize="sm" color="gray.500" mt={1}>
                1 = 极低风险，5 = 高风险
              </Text>
            </FormControl>
            
            <Button
              colorScheme="primary"
              leftIcon={<ButtonIcon icon={FiSave} />}
              onClick={handleSaveSettings}
            >
              保存设置
            </Button>
          </Stack>
        </Box>

        {/* 通知设置 */}
        <Box
          bg={cardBg}
          p={5}
          borderRadius="lg"
          boxShadow="sm"
          borderWidth="1px"
          borderColor={borderColor}
        >
          <Heading as="h2" size="md" mb={4}>
            通知设置
          </Heading>
          
          <Stack spacing={4}>
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="email-alerts" mb="0">
                电子邮件通知
              </FormLabel>
              <Switch
                id="email-alerts"
                colorScheme="primary"
                isChecked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
              />
            </FormControl>
            
            <FormControl display="flex" alignItems="center">
              <FormLabel htmlFor="push-alerts" mb="0">
                推送通知
              </FormLabel>
              <Switch
                id="push-alerts"
                colorScheme="primary"
                isChecked={pushNotifications}
                onChange={(e) => setPushNotifications(e.target.checked)}
              />
            </FormControl>
            
            <Button
              colorScheme="primary"
              leftIcon={<ButtonIcon icon={FiSave} />}
              onClick={handleSaveSettings}
              mt={2}
            >
              保存设置
            </Button>
          </Stack>
        </Box>
      </SimpleGrid>
    </Box>
  );
};

export default SettingsPage; 