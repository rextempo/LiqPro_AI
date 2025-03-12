import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import UserManagementSystem from '../../components/user/UserManagementSystem';
import UserManagement from '../../components/user/UserManagement';
import RoleManagement from '../../components/user/RoleManagement';
import PermissionManagement from '../../components/user/PermissionManagement';
import ApiKeyManagement from '../../components/user/ApiKeyManagement';
import SessionMonitoring from '../../components/user/SessionMonitoring';
import UserSettings from '../../components/user/UserSettings';

// Mock the child components
jest.mock('../../components/user/UserManagement', () => {
  return jest.fn(() => <div data-testid="user-management">User Management Content</div>);
});

jest.mock('../../components/user/RoleManagement', () => {
  return jest.fn(() => <div data-testid="role-management">Role Management Content</div>);
});

jest.mock('../../components/user/PermissionManagement', () => {
  return jest.fn(() => <div data-testid="permission-management">Permission Management Content</div>);
});

jest.mock('../../components/user/ApiKeyManagement', () => {
  return jest.fn(() => <div data-testid="api-key-management">API Key Management Content</div>);
});

jest.mock('../../components/user/SessionMonitoring', () => {
  return jest.fn(() => <div data-testid="session-monitoring">Session Monitoring Content</div>);
});

jest.mock('../../components/user/UserSettings', () => {
  return jest.fn(() => <div data-testid="user-settings">User Settings Content</div>);
});

// Mock the API hooks
jest.mock('../../hooks/useApi', () => ({
  useApi: jest.fn(() => ({
    loading: false,
    data: [],
    error: null,
    refresh: jest.fn(),
  })),
  useMutation: jest.fn(() => ({
    loading: false,
    data: null,
    error: null,
    mutate: jest.fn(),
  })),
}));

describe('UserManagementSystem Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderWithRouter = (initialRoute = '/user-management') => {
    return render(
      <MemoryRouter initialEntries={[initialRoute]}>
        <Routes>
          <Route path="/user-management" element={<UserManagementSystem />}>
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="permissions" element={<PermissionManagement />} />
            <Route path="api-keys" element={<ApiKeyManagement />} />
            <Route path="sessions" element={<SessionMonitoring />} />
            <Route path="settings" element={<UserSettings />} />
          </Route>
        </Routes>
      </MemoryRouter>
    );
  };

  test('renders UserManagementSystem with tabs', () => {
    renderWithRouter();
    
    // Check if all tabs are rendered
    expect(screen.getByText('用户管理')).toBeInTheDocument();
    expect(screen.getByText('角色管理')).toBeInTheDocument();
    expect(screen.getByText('权限管理')).toBeInTheDocument();
    expect(screen.getByText('API密钥')).toBeInTheDocument();
    expect(screen.getByText('会话监控')).toBeInTheDocument();
    expect(screen.getByText('个人设置')).toBeInTheDocument();
    
    // Default tab should be users
    expect(screen.getByTestId('user-management')).toBeInTheDocument();
  });

  test('navigates to roles tab when clicked', async () => {
    renderWithRouter();
    
    // Click on the roles tab
    fireEvent.click(screen.getByText('角色管理'));
    
    // Wait for navigation to complete
    await waitFor(() => {
      expect(screen.getByTestId('role-management')).toBeInTheDocument();
    });
  });

  test('navigates to permissions tab when clicked', async () => {
    renderWithRouter();
    
    // Click on the permissions tab
    fireEvent.click(screen.getByText('权限管理'));
    
    // Wait for navigation to complete
    await waitFor(() => {
      expect(screen.getByTestId('permission-management')).toBeInTheDocument();
    });
  });

  test('navigates to API keys tab when clicked', async () => {
    renderWithRouter();
    
    // Click on the API keys tab
    fireEvent.click(screen.getByText('API密钥'));
    
    // Wait for navigation to complete
    await waitFor(() => {
      expect(screen.getByTestId('api-key-management')).toBeInTheDocument();
    });
  });

  test('navigates to sessions tab when clicked', async () => {
    renderWithRouter();
    
    // Click on the sessions tab
    fireEvent.click(screen.getByText('会话监控'));
    
    // Wait for navigation to complete
    await waitFor(() => {
      expect(screen.getByTestId('session-monitoring')).toBeInTheDocument();
    });
  });

  test('navigates to settings tab when clicked', async () => {
    renderWithRouter();
    
    // Click on the settings tab
    fireEvent.click(screen.getByText('个人设置'));
    
    // Wait for navigation to complete
    await waitFor(() => {
      expect(screen.getByTestId('user-settings')).toBeInTheDocument();
    });
  });

  test('renders correct component based on route', () => {
    renderWithRouter('/user-management/roles');
    expect(screen.getByTestId('role-management')).toBeInTheDocument();
    
    renderWithRouter('/user-management/permissions');
    expect(screen.getByTestId('permission-management')).toBeInTheDocument();
    
    renderWithRouter('/user-management/api-keys');
    expect(screen.getByTestId('api-key-management')).toBeInTheDocument();
    
    renderWithRouter('/user-management/sessions');
    expect(screen.getByTestId('session-monitoring')).toBeInTheDocument();
    
    renderWithRouter('/user-management/settings');
    expect(screen.getByTestId('user-settings')).toBeInTheDocument();
  });

  test('active tab is highlighted based on current route', () => {
    renderWithRouter('/user-management/roles');
    
    // The roles tab should be active
    const rolesTab = screen.getByText('角色管理').closest('div[role="tab"]');
    expect(rolesTab).toHaveAttribute('aria-selected', 'true');
    
    // Other tabs should not be active
    const usersTab = screen.getByText('用户管理').closest('div[role="tab"]');
    expect(usersTab).toHaveAttribute('aria-selected', 'false');
  });
}); 