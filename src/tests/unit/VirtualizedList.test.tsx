import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import VirtualizedList from '../../components/ui/VirtualizedList';

describe('VirtualizedList Component', () => {
  // Create a large dataset for testing
  const createItems = (count: number) => {
    return Array.from({ length: count }, (_, i) => ({
      id: i,
      name: `Item ${i}`,
    }));
  };

  test('renders visible items only', () => {
    const items = createItems(1000);
    const itemHeight = 50;
    const containerHeight = 300; // This should fit 6 items (300/50)
    
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.name}</div>}
        itemHeight={itemHeight}
        height={containerHeight}
        overscan={0} // No overscan for this test
      />
    );
    
    // With container height 300 and item height 50, we should see 6 items (0-5)
    // Check that items 0-5 are rendered
    for (let i = 0; i <= 5; i++) {
      expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
    }
    
    // Check that item 6 is not rendered
    expect(screen.queryByTestId('item-6')).not.toBeInTheDocument();
  });

  test('renders additional items with overscan', () => {
    const items = createItems(1000);
    const itemHeight = 50;
    const containerHeight = 300; // This should fit 6 items (300/50)
    const overscan = 2; // Render 2 extra items above and below
    
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.name}</div>}
        itemHeight={itemHeight}
        height={containerHeight}
        overscan={overscan}
      />
    );
    
    // With overscan 2, we should see items 0-7 (6 visible + 2 below)
    // Items above would be -2 and -1, which don't exist
    for (let i = 0; i <= 7; i++) {
      expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
    }
    
    // Check that item 8 is not rendered
    expect(screen.queryByTestId('item-8')).not.toBeInTheDocument();
  });

  test('updates rendered items on scroll', () => {
    const items = createItems(1000);
    const itemHeight = 50;
    const containerHeight = 300;
    
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.name}</div>}
        itemHeight={itemHeight}
        height={containerHeight}
        overscan={0}
      />
    );
    
    // Get the container
    const container = document.querySelector('.virtualized-list-container');
    expect(container).toBeInTheDocument();
    
    if (container) {
      // Simulate scrolling down 200px (4 items)
      Object.defineProperty(container, 'scrollTop', { value: 200, configurable: true });
      fireEvent.scroll(container);
      
      // Now items 4-9 should be visible
      // Items 0-3 should no longer be in the document
      expect(screen.queryByTestId('item-0')).not.toBeInTheDocument();
      expect(screen.queryByTestId('item-3')).not.toBeInTheDocument();
      
      // Items 4-9 should be in the document
      for (let i = 4; i <= 9; i++) {
        expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
      }
      
      // Item 10 should not be in the document
      expect(screen.queryByTestId('item-10')).not.toBeInTheDocument();
    }
  });

  test('renders all items when list is smaller than container', () => {
    const items = createItems(5); // Only 5 items
    const itemHeight = 50;
    const containerHeight = 300; // Can fit 6 items
    
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div data-testid={`item-${item.id}`}>{item.name}</div>}
        itemHeight={itemHeight}
        height={containerHeight}
      />
    );
    
    // All 5 items should be rendered
    for (let i = 0; i < 5; i++) {
      expect(screen.getByTestId(`item-${i}`)).toBeInTheDocument();
    }
  });

  test('uses custom getItemKey function', () => {
    const items = createItems(10);
    const itemHeight = 50;
    const containerHeight = 300;
    
    const getItemKey = (item: { id: number; name: string }) => `custom-${item.id}`;
    
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        itemHeight={itemHeight}
        height={containerHeight}
        getItemKey={getItemKey}
      />
    );
    
    // Check that the custom keys are used
    const listItems = document.querySelectorAll('.virtualized-list-item');
    expect(listItems.length).toBeGreaterThan(0);
    
    // We can't directly test React keys, but we can verify the component rendered correctly
    expect(listItems.length).toBe(Math.min(10, Math.ceil(containerHeight / itemHeight) + 3)); // visible + overscan
  });

  test('applies custom className', () => {
    const items = createItems(10);
    const customClass = 'custom-list-class';
    
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        itemHeight={50}
        height={300}
        className={customClass}
      />
    );
    
    const container = document.querySelector('.virtualized-list-container');
    expect(container).toHaveClass(customClass);
  });

  test('renders with custom width', () => {
    const items = createItems(10);
    const customWidth = '80%';
    
    render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        itemHeight={50}
        height={300}
        width={customWidth}
      />
    );
    
    const container = document.querySelector('.virtualized-list-container');
    expect(container).toHaveStyle(`width: ${customWidth}`);
  });

  // Performance test - this is more of a smoke test
  test('handles large datasets efficiently', () => {
    const items = createItems(10000); // 10,000 items
    const itemHeight = 50;
    const containerHeight = 300;
    
    const { container } = render(
      <VirtualizedList
        items={items}
        renderItem={(item) => <div>{item.name}</div>}
        itemHeight={itemHeight}
        height={containerHeight}
      />
    );
    
    // The inner container should have the full height of all items
    const innerContainer = container.querySelector('.virtualized-list-inner');
    expect(innerContainer).toHaveStyle(`height: ${items.length * itemHeight}px`);
    
    // But we should only render a small subset of items
    const renderedItems = container.querySelectorAll('.virtualized-list-item');
    expect(renderedItems.length).toBeLessThan(20); // Much less than 10,000
  });
}); 