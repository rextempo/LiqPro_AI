import React, { useState } from 'react';
import {
  Box,
  Button,
  Flex,
  Heading,
  IconButton,
  Popover,
  PopoverArrow,
  PopoverBody,
  PopoverCloseButton,
  PopoverContent,
  PopoverHeader,
  PopoverTrigger,
  Text,
  VStack,
  Badge,
  Icon,
  useColorModeValue,
} from '@chakra-ui/react';
import { 
  FiBell, 
  FiInfo, 
  FiAlertCircle, 
  FiCheckCircle, 
  FiXCircle,
  FiTrash2,
  FiAlertTriangle
} from 'react-icons/fi';
import { IconWrapper, ButtonIcon } from '../IconWrapper';

// 通知类型
type NotificationType = 'info' | 'success' | 'warning' | 'error';

// 通知接口
interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  time: string;
  read: boolean;
}

const NotificationCenter: React.FC = () => {
  // 模拟通知数据
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'info',
      title: '系统更新',
      message: 'LiqPro系统已更新到最新版本',
      time: '10分钟前',
      read: false,
    },
    {
      id: '2',
      type: 'success',
      title: 'Agent Alpha收益增加',
      message: 'Agent Alpha在过去24小时内收益率达到2.3%',
      time: '1小时前',
      read: false,
    },
    {
      id: '3',
      type: 'warning',
      title: '市场波动提醒',
      message: 'SOL价格在过去1小时内波动超过5%',
      time: '2小时前',
      read: true,
    },
    {
      id: '4',
      type: 'error',
      title: '交易失败',
      message: 'Agent Beta尝试添加LP失败，请检查',
      time: '3小时前',
      read: true,
    },
  ]);

  const bgColor = useColorModeValue('white', 'gray.800');
  const hoverBg = useColorModeValue('gray.50', 'gray.700');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  // 获取未读通知数量
  const unreadCount = notifications.filter(n => !n.read).length;

  // 标记所有通知为已读
  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  // 清除所有通知
  const clearAllNotifications = () => {
    setNotifications([]);
  };

  // 获取通知图标
  const getNotificationIcon = (type: NotificationType) => {
    switch (type) {
      case 'info':
        return FiInfo;
      case 'success':
        return FiCheckCircle;
      case 'warning':
        return FiAlertCircle;
      case 'error':
        return FiXCircle;
      default:
        return FiInfo;
    }
  };

  // 获取通知颜色
  const getNotificationColor = (type: NotificationType) => {
    switch (type) {
      case 'info':
        return 'primary.500';
      case 'success':
        return 'success.500';
      case 'warning':
        return 'warning.500';
      case 'error':
        return 'danger.500';
      default:
        return 'primary.500';
    }
  };

  return (
    <Popover placement="bottom-end">
      <PopoverTrigger>
        <Box position="relative">
          <IconButton
            aria-label="Notifications"
            icon={<ButtonIcon icon={FiBell} />}
            variant="ghost"
            colorScheme="gray"
            fontSize="20px"
          />
          {unreadCount > 0 && (
            <Badge
              position="absolute"
              top="-2px"
              right="-2px"
              colorScheme="danger"
              borderRadius="full"
              fontSize="xs"
              minW="18px"
              h="18px"
              display="flex"
              alignItems="center"
              justifyContent="center"
            >
              {unreadCount}
            </Badge>
          )}
        </Box>
      </PopoverTrigger>
      <PopoverContent width="350px" maxH="500px">
        <PopoverArrow />
        <PopoverCloseButton />
        <PopoverHeader borderBottomWidth="1px">
          <Flex justifyContent="space-between" alignItems="center">
            <Heading size="sm">通知</Heading>
            <Flex>
              {unreadCount > 0 && (
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={markAllAsRead}
                  mr={2}
                >
                  全部标为已读
                </Button>
              )}
              {notifications.length > 0 && (
                <IconButton
                  aria-label="Clear all"
                  icon={<ButtonIcon icon={FiTrash2} />}
                  size="xs"
                  variant="ghost"
                  onClick={clearAllNotifications}
                />
              )}
            </Flex>
          </Flex>
        </PopoverHeader>
        <PopoverBody p={0} overflowY="auto" maxH="400px">
          {notifications.length === 0 ? (
            <Box p={4} textAlign="center">
              <Text color="gray.500">暂无通知</Text>
            </Box>
          ) : (
            <VStack spacing={0} align="stretch">
              {notifications.map((notification) => (
                <Box
                  key={notification.id}
                  p={3}
                  borderBottomWidth="1px"
                  borderColor={borderColor}
                  bg={notification.read ? 'transparent' : 'gray.50'}
                  _hover={{ bg: hoverBg }}
                  transition="background-color 0.2s"
                >
                  <Flex>
                    <Box mr={3}>
                      <IconWrapper
                        icon={getNotificationIcon(notification.type)}
                        color={getNotificationColor(notification.type)}
                        boxSize={5}
                      />
                    </Box>
                    <Box flex="1">
                      <Flex justifyContent="space-between" alignItems="center" mb={1}>
                        <Text fontWeight="medium">{notification.title}</Text>
                        <Text fontSize="xs" color="gray.500">
                          {notification.time}
                        </Text>
                      </Flex>
                      <Text fontSize="sm" color="gray.600">
                        {notification.message}
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              ))}
            </VStack>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationCenter; 