import React from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Flex,
  HStack,
  IconButton,
  Link,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
  Text,
  Avatar,
  useColorModeValue,
} from '@chakra-ui/react';
import { FiSettings, FiUser } from 'react-icons/fi';
import { IconWrapper, ButtonIcon } from '../IconWrapper';
import WalletConnect from '../WalletConnect';
import NotificationCenter from '../NotificationCenter';

const Navbar: React.FC = () => {
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  return (
    <Box
      as="nav"
      position="sticky"
      top="0"
      zIndex="sticky"
      bg={bgColor}
      borderBottom="1px"
      borderColor={borderColor}
      px={4}
      py={2}
      boxShadow="sm"
    >
      <Flex h={16} alignItems="center" justifyContent="space-between">
        <Link as={RouterLink} to="/dashboard" _hover={{ textDecoration: 'none' }}>
          <Text fontSize="xl" fontWeight="bold" color="primary.500">
            LiqPro
          </Text>
        </Link>

        <HStack spacing={4}>
          <WalletConnect />
          
          <NotificationCenter />
          
          <IconButton
            as={RouterLink}
            to="/settings"
            aria-label="Settings"
            icon={<ButtonIcon icon={FiSettings} />}
            variant="ghost"
            colorScheme="gray"
            fontSize="20px"
          />
          
          <Menu>
            <MenuButton>
              <Avatar size="sm" name="User" bg="primary.500" />
            </MenuButton>
            <MenuList>
              <MenuItem icon={<ButtonIcon icon={FiUser} />}>Profile</MenuItem>
              <MenuItem>Logout</MenuItem>
            </MenuList>
          </Menu>
        </HStack>
      </Flex>
    </Box>
  );
};

export default Navbar; 