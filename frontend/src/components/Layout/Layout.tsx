import React, { ReactNode } from 'react';
import { Box } from '@chakra-ui/react';
import Navbar from '../Navbar';
import Sidebar from '../Sidebar';

interface LayoutProps {
  children: ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <Box minH="100vh" bg="gray.50">
      <Navbar />
      <Box display="flex">
        <Sidebar />
        <Box
          as="main"
          flex="1"
          ml={{ base: 0, md: '240px' }}
          transition="margin 0.3s"
        >
          {children}
        </Box>
      </Box>
    </Box>
  );
};

export default Layout; 