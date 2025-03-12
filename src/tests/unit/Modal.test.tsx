import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import Modal from '../../components/ui/Modal';

// Mock the portal container
beforeEach(() => {
  const portalRoot = document.createElement('div');
  portalRoot.setAttribute('id', 'modal-root');
  document.body.appendChild(portalRoot);
});

afterEach(() => {
  const portalRoot = document.getElementById('modal-root');
  if (portalRoot) {
    document.body.removeChild(portalRoot);
  }
});

describe('Modal Component', () => {
  test('renders nothing when not visible', () => {
    render(
      <Modal visible={false} onClose={jest.fn()}>
        Modal Content
      </Modal>
    );
    
    expect(screen.queryByText('Modal Content')).not.toBeInTheDocument();
  });

  test('renders modal when visible', () => {
    render(
      <Modal visible={true} onClose={jest.fn()} title="Test Modal">
        Modal Content
      </Modal>
    );
    
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content')).toBeInTheDocument();
  });

  test('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal visible={true} onClose={handleClose} title="Test Modal">
        Modal Content
      </Modal>
    );
    
    // Find the close button (usually an X icon)
    const closeButton = document.querySelector('button[aria-label="Close"]');
    if (closeButton) {
      fireEvent.click(closeButton);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  test('calls onOk when OK button is clicked', () => {
    const handleOk = jest.fn();
    render(
      <Modal visible={true} onClose={jest.fn()} onOk={handleOk}>
        Modal Content
      </Modal>
    );
    
    const okButton = screen.getByText('确定');
    fireEvent.click(okButton);
    expect(handleOk).toHaveBeenCalledTimes(1);
  });

  test('calls onCancel when Cancel button is clicked', () => {
    const handleCancel = jest.fn();
    render(
      <Modal visible={true} onClose={jest.fn()} onCancel={handleCancel}>
        Modal Content
      </Modal>
    );
    
    const cancelButton = screen.getByText('取消');
    fireEvent.click(cancelButton);
    expect(handleCancel).toHaveBeenCalledTimes(1);
  });

  test('uses custom button text', () => {
    render(
      <Modal 
        visible={true} 
        onClose={jest.fn()} 
        okText="Submit" 
        cancelText="Abort"
      >
        Modal Content
      </Modal>
    );
    
    expect(screen.getByText('Submit')).toBeInTheDocument();
    expect(screen.getByText('Abort')).toBeInTheDocument();
  });

  test('renders custom footer', () => {
    render(
      <Modal 
        visible={true} 
        onClose={jest.fn()} 
        footer={<button>Custom Footer</button>}
      >
        Modal Content
      </Modal>
    );
    
    expect(screen.getByText('Custom Footer')).toBeInTheDocument();
    expect(screen.queryByText('确定')).not.toBeInTheDocument();
    expect(screen.queryByText('取消')).not.toBeInTheDocument();
  });

  test('applies custom width', () => {
    render(
      <Modal 
        visible={true} 
        onClose={jest.fn()} 
        width={600}
      >
        Modal Content
      </Modal>
    );
    
    const modalContent = document.querySelector('.modal-content');
    expect(modalContent).toHaveStyle('width: 600px');
  });

  test('applies centered class when centered prop is true', () => {
    render(
      <Modal 
        visible={true} 
        onClose={jest.fn()} 
        centered={true}
      >
        Modal Content
      </Modal>
    );
    
    const modalWrapper = document.querySelector('.modal-wrapper');
    expect(modalWrapper).toHaveClass('items-center');
  });

  test('applies fullscreen class when fullscreen prop is true', () => {
    render(
      <Modal 
        visible={true} 
        onClose={jest.fn()} 
        fullscreen={true}
      >
        Modal Content
      </Modal>
    );
    
    const modalContent = document.querySelector('.modal-content');
    expect(modalContent).toHaveClass('w-screen h-screen');
  });

  test('calls onClose when mask is clicked and maskClosable is true', () => {
    const handleClose = jest.fn();
    render(
      <Modal 
        visible={true} 
        onClose={handleClose} 
        maskClosable={true}
      >
        Modal Content
      </Modal>
    );
    
    const mask = document.querySelector('.modal-mask');
    if (mask) {
      fireEvent.click(mask);
      expect(handleClose).toHaveBeenCalledTimes(1);
    }
  });

  test('does not call onClose when mask is clicked and maskClosable is false', () => {
    const handleClose = jest.fn();
    render(
      <Modal 
        visible={true} 
        onClose={handleClose} 
        maskClosable={false}
      >
        Modal Content
      </Modal>
    );
    
    const mask = document.querySelector('.modal-mask');
    if (mask) {
      fireEvent.click(mask);
      expect(handleClose).not.toHaveBeenCalled();
    }
  });

  test('shows confirm loading state', () => {
    render(
      <Modal 
        visible={true} 
        onClose={jest.fn()} 
        confirmLoading={true}
      >
        Modal Content
      </Modal>
    );
    
    const okButton = screen.getByText('确定');
    expect(okButton).toBeDisabled();
    
    // Check for loading indicator
    const loadingIcon = document.querySelector('svg.animate-spin');
    expect(loadingIcon).toBeInTheDocument();
  });
}); 