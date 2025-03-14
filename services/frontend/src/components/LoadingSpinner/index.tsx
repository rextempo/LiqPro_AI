import React from 'react';
import {
  Box,
  Flex,
  Spinner,
  Text,
  useColorModeValue,
} from '@chakra-ui/react';

interface LoadingSpinnerProps {
  text?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  fullPage?: boolean;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  text = '加载中...',
  size = 'lg',
  fullPage = false,
}) => {
  const spinnerColor = useColorModeValue('primary.500', 'primary.300');
  const textColor = useColorModeValue('gray.600', 'gray.400');

  const content = (
    <Flex direction="column" alignItems="center" justifyContent="center">
      <Spinner
        thickness="4px"
        speed="0.65s"
        emptyColor="gray.200"
        color={spinnerColor}
        size={size}
        mb={text ? 4 : 0}
      />
      {text && (
        <Text color={textColor} fontSize="sm" fontWeight="medium">
          {text}
        </Text>
      )}
    </Flex>
  );

  if (fullPage) {
    return (
      <Flex
        position="fixed"
        top="0"
        left="0"
        right="0"
        bottom="0"
        bg={useColorModeValue('white', 'gray.800')}
        zIndex="overlay"
        alignItems="center"
        justifyContent="center"
      >
        {content}
      </Flex>
    );
  }

  return content;
};

export default LoadingSpinner; 