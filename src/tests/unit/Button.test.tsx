import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Button from '../../components/ui/Button';

describe('Button Component', () => {
  test('renders button with default props', () => {
    render(<Button>Click me</Button>);
    const button = screen.getByRole('button', { name: /click me/i });
    
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass('bg-blue-500'); // primary variant
    expect(button).not.toHaveClass('w-full'); // not block
    expect(button).not.toBeDisabled();
  });

  test('renders button with custom variant', () => {
    render(<Button variant="success">Success</Button>);
    const button = screen.getByRole('button', { name: /success/i });
    
    expect(button).toHaveClass('bg-green-500');
  });

  test('renders outline button', () => {
    render(<Button variant="primary" outline>Outline</Button>);
    const button = screen.getByRole('button', { name: /outline/i });
    
    expect(button).toHaveClass('border-blue-500');
    expect(button).toHaveClass('text-blue-500');
    expect(button).not.toHaveClass('bg-blue-500');
  });

  test('renders button with different sizes', () => {
    const { rerender } = render(<Button size="small">Small</Button>);
    let button = screen.getByRole('button', { name: /small/i });
    expect(button).toHaveClass('py-1 px-3 text-xs');
    
    rerender(<Button size="medium">Medium</Button>);
    button = screen.getByRole('button', { name: /medium/i });
    expect(button).toHaveClass('py-2 px-4 text-sm');
    
    rerender(<Button size="large">Large</Button>);
    button = screen.getByRole('button', { name: /large/i });
    expect(button).toHaveClass('py-3 px-5 text-base');
  });

  test('renders block button', () => {
    render(<Button block>Block Button</Button>);
    const button = screen.getByRole('button', { name: /block button/i });
    
    expect(button).toHaveClass('w-full');
  });

  test('renders rounded button', () => {
    render(<Button rounded>Rounded</Button>);
    const button = screen.getByRole('button', { name: /rounded/i });
    
    expect(button).toHaveClass('rounded-full');
    expect(button).not.toHaveClass('rounded-md');
  });

  test('renders disabled button', () => {
    render(<Button disabled>Disabled</Button>);
    const button = screen.getByRole('button', { name: /disabled/i });
    
    expect(button).toBeDisabled();
    expect(button).toHaveClass('opacity-60');
    expect(button).toHaveClass('cursor-not-allowed');
  });

  test('renders loading button', () => {
    render(<Button loading>Loading</Button>);
    
    // Should show loading icon
    const svg = document.querySelector('svg.animate-spin');
    expect(svg).toBeInTheDocument();
    
    // Button should be disabled when loading
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  test('renders loading button with custom loading text', () => {
    render(<Button loading loadingText="Please wait...">Loading</Button>);
    
    expect(screen.getByText('Please wait...')).toBeInTheDocument();
    expect(screen.queryByText('Loading')).not.toBeInTheDocument();
  });

  test('calls onClick handler when clicked', () => {
    const handleClick = jest.fn();
    render(<Button onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  test('does not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<Button disabled onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button', { name: /click me/i }));
    expect(handleClick).not.toHaveBeenCalled();
  });

  test('does not call onClick when loading', () => {
    const handleClick = jest.fn();
    render(<Button loading onClick={handleClick}>Click me</Button>);
    
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).not.toHaveBeenCalled();
  });
}); 