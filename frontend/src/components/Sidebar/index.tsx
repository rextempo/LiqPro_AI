import React from 'react';
import { Link as RouterLink, useLocation } from 'react-router-dom';
import {
  Box,
  Flex,
  VStack,
  Link,
  Text,
  Icon,
  Divider,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiHome,
  FiTrendingUp,
  FiDollarSign,
  FiSettings,
  FiPlusCircle,
} from 'react-icons/fi';

interface NavItemProps {
  icon: React.ElementType;
  to: string;
  children: React.ReactNode;
  isActive?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, to, children, isActive }) => {
  const activeBg = useColorModeValue('primary.50', 'primary.900');
  const activeColor = useColorModeValue('primary.700', 'primary.200');
  const hoverBg = useColorModeValue('gray.100', 'gray.700');

  return (
    <Link
      as={RouterLink}
      to={to}
      style={{ textDecoration: 'none' }}
      _focus={{ boxShadow: 'none' }}
    >
      <Flex
        align="center"
        p="3"
        mx="2"
        borderRadius="lg"
        role="group"
        cursor="pointer"
        bg={isActive ? activeBg : 'transparent'}
        color={isActive ? activeColor : 'inherit'}
        _hover={{
          bg: isActive ? activeBg : hoverBg,
        }}
        fontWeight={isActive ? 'medium' : 'normal'}
      >
        <Icon
          mr="3"
          fontSize="18"
          as={icon}
          color={isActive ? 'primary.500' : 'gray.500'}
          _groupHover={{
            color: isActive ? 'primary.500' : 'primary.400',
          }}
        />
        {children}
      </Flex>
    </Link>
  );
};

const Sidebar: React.FC = () => {
  const location = useLocation();
  const bgColor = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.700');

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <Box
      as="aside"
      w="240px"
      h="full"
      bg={bgColor}
      borderRight="1px"
      borderColor={borderColor}
      overflowY="auto"
    >
      <VStack spacing={1} align="stretch" py={4}>
        <Box px={4} mb={2}>
          <Text fontSize="sm" fontWeight="medium" color="gray.500">
            MAIN
          </Text>
        </Box>
        
        <NavItem icon={FiHome} to="/dashboard" isActive={isActive('/dashboard')}>
          Dashboard
        </NavItem>
        
        <NavItem icon={FiTrendingUp} to="/signals" isActive={isActive('/signals')}>
          Signals
        </NavItem>
        
        <NavItem icon={FiDollarSign} to="/pools" isActive={isActive('/pools')}>
          Pools
        </NavItem>
        
        <Divider my={3} />
        
        <Box px={4} mb={2}>
          <Text fontSize="sm" fontWeight="medium" color="gray.500">
            AGENTS
          </Text>
        </Box>
        
        <NavItem icon={FiPlusCircle} to="/agent/create" isActive={isActive('/agent/create')}>
          Create Agent
        </NavItem>
        
        <Divider my={3} />
        
        <Box px={4} mb={2}>
          <Text fontSize="sm" fontWeight="medium" color="gray.500">
            SETTINGS
          </Text>
        </Box>
        
        <NavItem icon={FiSettings} to="/settings" isActive={isActive('/settings')}>
          Settings
        </NavItem>
      </VStack>
    </Box>
  );
};

export default Sidebar; 