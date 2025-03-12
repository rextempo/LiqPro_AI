import { extendTheme } from '@chakra-ui/react';

const theme = extendTheme({
  colors: {
    primary: {
      50: '#e6f7fa',
      100: '#c0e9f2',
      200: '#9adbe9',
      300: '#74cde0',
      400: '#4ebfd7',
      500: '#36B9CC', // Main primary color
      600: '#2e9dae',
      700: '#267f8d',
      800: '#1e616c',
      900: '#16444b',
    },
    secondary: {
      50: '#eaeffc',
      100: '#c8d5f7',
      200: '#a6bbf1',
      300: '#84a1ec',
      400: '#6287e6',
      500: '#4E73DF', // Main secondary color
      600: '#3a5fc0',
      700: '#2c4b9c',
      800: '#1e3778',
      900: '#102354',
    },
    success: {
      500: '#1CC88A', // Success color
    },
    warning: {
      500: '#F6C23E', // Warning color
    },
    danger: {
      500: '#E74A3B', // Error color
    },
    neutral: {
      500: '#858796', // Neutral color
    },
    background: {
      primary: '#FFFFFF',
      secondary: '#F8F9FC',
    },
  },
  fonts: {
    heading: `'Inter', -apple-system, sans-serif`,
    body: `'Inter', -apple-system, sans-serif`,
  },
  fontSizes: {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '24px',
  },
  fontWeights: {
    normal: 400,
    medium: 500,
    bold: 600,
  },
  components: {
    Button: {
      baseStyle: {
        fontWeight: 'medium',
        borderRadius: '8px',
      },
      variants: {
        solid: {
          bg: 'primary.500',
          color: 'white',
          _hover: {
            bg: 'primary.600',
          },
        },
        outline: {
          borderColor: 'primary.500',
          color: 'primary.500',
          _hover: {
            bg: 'primary.50',
          },
        },
        danger: {
          bg: 'danger.500',
          color: 'white',
          _hover: {
            bg: 'red.600',
          },
        },
      },
    },
    Card: {
      baseStyle: {
        p: 4,
        borderRadius: '8px',
        boxShadow: 'sm',
        bg: 'white',
      },
    },
  },
  styles: {
    global: {
      body: {
        bg: 'background.secondary',
        color: 'gray.800',
      },
    },
  },
});

export default theme; 