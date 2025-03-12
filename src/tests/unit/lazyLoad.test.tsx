import React from 'react';
import { render, screen, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import { lazyLoad, preloadComponent, createPreloadTrigger, lazyLoadComponents } from '../../utils/lazyLoad';

// Mock components
const TestComponent = () => <div data-testid="test-component">Test Component</div>;
const AnotherComponent = () => <div data-testid="another-component">Another Component</div>;

// Mock dynamic imports
jest.mock('../../components/ui', () => ({
  LoadingState: () => <div data-testid="loading-state">Loading...</div>,
}));

describe('lazyLoad Utility', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders loading state while component is loading', async () => {
    // Create a promise that we can resolve manually
    let resolveImport: (value: { default: typeof TestComponent }) => void;
    const importPromise = new Promise<{ default: typeof TestComponent }>(resolve => {
      resolveImport = resolve;
    });
    
    // Create a mock factory function
    const mockFactory = jest.fn(() => importPromise);
    
    // Create lazy loaded component
    const LazyComponent = lazyLoad(mockFactory);
    
    // Render the component
    render(<LazyComponent />);
    
    // Loading state should be visible
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    
    // Resolve the import
    await act(async () => {
      resolveImport!({ default: TestComponent });
    });
    
    // Now the actual component should be visible
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.queryByTestId('loading-state')).not.toBeInTheDocument();
  });

  test('uses custom fallback component', async () => {
    // Create a promise that we can resolve manually
    let resolveImport: (value: { default: typeof TestComponent }) => void;
    const importPromise = new Promise<{ default: typeof TestComponent }>(resolve => {
      resolveImport = resolve;
    });
    
    // Create a mock factory function
    const mockFactory = jest.fn(() => importPromise);
    
    // Custom fallback
    const CustomFallback = () => <div data-testid="custom-fallback">Custom Loading...</div>;
    
    // Create lazy loaded component with custom fallback
    const LazyComponent = lazyLoad(mockFactory, { fallback: <CustomFallback /> });
    
    // Render the component
    render(<LazyComponent />);
    
    // Custom fallback should be visible
    expect(screen.getByTestId('custom-fallback')).toBeInTheDocument();
    
    // Resolve the import
    await act(async () => {
      resolveImport!({ default: TestComponent });
    });
    
    // Now the actual component should be visible
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.queryByTestId('custom-fallback')).not.toBeInTheDocument();
  });

  test('preloads component when preload option is true', () => {
    // Create a mock factory function
    const mockFactory = jest.fn(() => Promise.resolve({ default: TestComponent }));
    
    // Create lazy loaded component with preload option
    lazyLoad(mockFactory, { preload: true });
    
    // Factory should be called immediately
    expect(mockFactory).toHaveBeenCalledTimes(1);
  });

  test('preloadComponent function triggers component loading', () => {
    // Create a mock factory function
    const mockFactory = jest.fn(() => Promise.resolve({ default: TestComponent }));
    
    // Call preloadComponent
    preloadComponent(mockFactory);
    
    // Factory should be called
    expect(mockFactory).toHaveBeenCalledTimes(1);
  });

  test('createPreloadTrigger creates a function that preloads component once', () => {
    // Create a mock factory function
    const mockFactory = jest.fn(() => Promise.resolve({ default: TestComponent }));
    
    // Create preload trigger
    const triggerPreload = createPreloadTrigger(mockFactory);
    
    // Factory should not be called yet
    expect(mockFactory).not.toHaveBeenCalled();
    
    // Trigger preload
    triggerPreload();
    
    // Factory should be called
    expect(mockFactory).toHaveBeenCalledTimes(1);
    
    // Trigger again
    triggerPreload();
    
    // Factory should still be called only once
    expect(mockFactory).toHaveBeenCalledTimes(1);
  });

  test('lazyLoadComponents creates multiple lazy loaded components', async () => {
    // Create mock factory functions
    const mockFactories = {
      test: jest.fn(() => Promise.resolve({ default: TestComponent })),
      another: jest.fn(() => Promise.resolve({ default: AnotherComponent })),
    };
    
    // Create lazy loaded components
    const LazyComponents = lazyLoadComponents(mockFactories);
    
    // Render the first component
    render(<LazyComponents.test />);
    
    // Loading state should be visible
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    
    // Wait for component to load
    await screen.findByTestId('test-component');
    
    // Now the actual component should be visible
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    
    // Clean up
    document.body.innerHTML = '';
    
    // Render the second component
    render(<LazyComponents.another />);
    
    // Loading state should be visible
    expect(screen.getByTestId('loading-state')).toBeInTheDocument();
    
    // Wait for component to load
    await screen.findByTestId('another-component');
    
    // Now the actual component should be visible
    expect(screen.getByTestId('another-component')).toBeInTheDocument();
  });
}); 