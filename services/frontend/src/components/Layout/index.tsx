import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Flex } from '@chakra-ui/react';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';

const Layout: React.FC = () => {
  return (
    <Flex h="100vh" direction="column">
      <Navbar />
      <Flex flex="1" overflow="hidden">
        <Sidebar />
        <Box
          as="main"
          flex="1"
          p={4}
          overflowY="auto"
          bg="background.secondary"
        >
          <Outlet />
        </Box>
      </Flex>
    </Flex>
  );
};

export default Layout; 