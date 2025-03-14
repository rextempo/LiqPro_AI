import React from 'react';
import {
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Text,
  Box,
  Icon,
  VStack,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiAlertTriangle } from 'react-icons/fi';
import IconWrapper from '../IconWrapper';

interface EmergencyExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

const EmergencyExitModal: React.FC<EmergencyExitModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
}) => {
  const warningBg = useColorModeValue('red.50', 'red.900');
  const warningBorder = useColorModeValue('red.200', 'red.700');

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered>
      <ModalOverlay />
      <ModalContent>
        <ModalHeader color="danger.500">紧急清仓确认</ModalHeader>
        <ModalCloseButton />
        <ModalBody>
          <VStack spacing={4} align="stretch">
            <Box
              p={4}
              bg={warningBg}
              borderRadius="md"
              borderWidth="1px"
              borderColor={warningBorder}
              display="flex"
              alignItems="center"
            >
              <IconWrapper icon={FiAlertTriangle} color="danger.500" boxSize={6} mr={3} />
              <Text fontWeight="medium" color="danger.500">
                此操作将立即清算所有仓位，无论当前市场状况如何。
              </Text>
            </Box>
            
            <Text>
              紧急清仓会在当前市场条件下尽快将所有资产转换为SOL，这可能导致：
            </Text>
            
            <VStack align="start" spacing={2} pl={4}>
              <Text>• 高额滑点损失</Text>
              <Text>• 交易费用增加</Text>
              <Text>• 无法获得最佳价格</Text>
              <Text>• 可能的永久性资本损失</Text>
            </VStack>
            
            <Text fontWeight="bold">
              此操作不可撤销。您确定要继续吗？
            </Text>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="outline" mr={3} onClick={onClose}>
            取消
          </Button>
          <Button 
            colorScheme="danger" 
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            确认清仓
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
};

export default EmergencyExitModal; 