import React from 'react';
import ReactDOM from 'react-dom/client';
import { ChakraProvider } from '@chakra-ui/react';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import theme from './theme';
import ErrorBoundary from './components/ErrorBoundary';
import { AuthProvider } from './contexts/AuthContext';
import { WebSocketProvider } from './contexts/WebSocketContext';
import './index.css';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ChakraProvider theme={theme}>
          <AuthProvider>
            <WebSocketProvider>
              <App />
            </WebSocketProvider>
          </AuthProvider>
        </ChakraProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
); 