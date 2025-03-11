/**
 * Connection Pool Tests
 */
import { ConnectionPool } from '../connection-pool';
import { Socket } from 'socket.io';

// Mock Socket class
class MockSocket {
  id: string;
  disconnected: boolean = false;

  constructor(id: string) {
    this.id = id;
  }

  disconnect(close?: boolean): void {
    this.disconnected = true;
  }
}

describe('ConnectionPool', () => {
  it('should add connections to pool', () => {
    const pool = new ConnectionPool({
      maxConnections: 10,
      maxConnectionsPerIP: 3,
      connectionTimeout: 1000,
      inactiveTimeout: 5000
    });
    
    // Add connections
    const socket1 = new MockSocket('socket1') as unknown as Socket;
    const socket2 = new MockSocket('socket2') as unknown as Socket;
    const socket3 = new MockSocket('socket3') as unknown as Socket;
    
    expect(pool.addConnection(socket1, '127.0.0.1')).toBe(true);
    expect(pool.addConnection(socket2, '127.0.0.1')).toBe(true);
    expect(pool.addConnection(socket3, '127.0.0.1')).toBe(true);
    
    // Check stats
    const stats = pool.getStats();
    expect(stats.totalConnections).toBe(3);
    expect(stats.activeConnections).toBe(3);
    expect(stats.authenticatedConnections).toBe(0);
    expect(stats.connectionsByIP.get('127.0.0.1')).toBe(3);
  });

  it('should enforce max connections per IP', () => {
    const pool = new ConnectionPool({
      maxConnections: 10,
      maxConnectionsPerIP: 2,
      connectionTimeout: 1000,
      inactiveTimeout: 5000
    });
    
    // Add connections
    const socket1 = new MockSocket('socket1') as unknown as Socket;
    const socket2 = new MockSocket('socket2') as unknown as Socket;
    const socket3 = new MockSocket('socket3') as unknown as Socket;
    
    expect(pool.addConnection(socket1, '127.0.0.1')).toBe(true);
    expect(pool.addConnection(socket2, '127.0.0.1')).toBe(true);
    expect(pool.addConnection(socket3, '127.0.0.1')).toBe(false); // Should be rejected
    
    // Check stats
    const stats = pool.getStats();
    expect(stats.totalConnections).toBe(2);
    expect(stats.connectionsByIP.get('127.0.0.1')).toBe(2);
  });

  it('should enforce max total connections', () => {
    const pool = new ConnectionPool({
      maxConnections: 2,
      maxConnectionsPerIP: 10,
      connectionTimeout: 1000,
      inactiveTimeout: 5000
    });
    
    // Add connections
    const socket1 = new MockSocket('socket1') as unknown as Socket;
    const socket2 = new MockSocket('socket2') as unknown as Socket;
    const socket3 = new MockSocket('socket3') as unknown as Socket;
    
    expect(pool.addConnection(socket1, '127.0.0.1')).toBe(true);
    expect(pool.addConnection(socket2, '192.168.1.1')).toBe(true);
    expect(pool.addConnection(socket3, '10.0.0.1')).toBe(false); // Should be rejected
    
    // Check stats
    const stats = pool.getStats();
    expect(stats.totalConnections).toBe(2);
  });

  it('should remove connections from pool', () => {
    const pool = new ConnectionPool({
      maxConnections: 10,
      maxConnectionsPerIP: 5,
      connectionTimeout: 1000,
      inactiveTimeout: 5000
    });
    
    // Add connections
    const socket1 = new MockSocket('socket1') as unknown as Socket;
    const socket2 = new MockSocket('socket2') as unknown as Socket;
    
    pool.addConnection(socket1, '127.0.0.1');
    pool.addConnection(socket2, '127.0.0.1');
    
    // Remove connection
    pool.removeConnection('socket1');
    
    // Check stats
    const stats = pool.getStats();
    expect(stats.totalConnections).toBe(1);
    expect(stats.connectionsByIP.get('127.0.0.1')).toBe(1);
    
    // Check if connection is removed
    expect(pool.getConnection('socket1')).toBeNull();
    expect(pool.getConnection('socket2')).not.toBeNull();
  });

  it('should track authenticated connections', () => {
    const pool = new ConnectionPool({
      maxConnections: 10,
      maxConnectionsPerIP: 5,
      connectionTimeout: 1000,
      inactiveTimeout: 5000
    });
    
    // Add connections
    const socket1 = new MockSocket('socket1') as unknown as Socket;
    const socket2 = new MockSocket('socket2') as unknown as Socket;
    
    pool.addConnection(socket1, '127.0.0.1');
    pool.addConnection(socket2, '127.0.0.1');
    
    // Authenticate one connection
    pool.setAuthenticated('socket1');
    
    // Check stats
    const stats = pool.getStats();
    expect(stats.authenticatedConnections).toBe(1);
    
    // Check authenticated connections
    const authenticatedConnections = pool.getAuthenticatedConnections();
    expect(authenticatedConnections.size).toBe(1);
    expect(authenticatedConnections.has('socket1')).toBe(true);
  });

  it('should update connection activity', () => {
    const pool = new ConnectionPool({
      maxConnections: 10,
      maxConnectionsPerIP: 5,
      connectionTimeout: 1000,
      inactiveTimeout: 5000
    });
    
    // Add connection
    const socket = new MockSocket('socket1') as unknown as Socket;
    pool.addConnection(socket, '127.0.0.1');
    
    // Get initial connection data
    const initialData = pool.getConnectionData('socket1');
    const initialActivity = initialData.lastActivity;
    
    // Wait a bit
    jest.advanceTimersByTime(100);
    
    // Update activity
    pool.updateActivity('socket1');
    
    // Get updated connection data
    const updatedData = pool.getConnectionData('socket1');
    const updatedActivity = updatedData.lastActivity;
    
    // Check if activity was updated
    expect(updatedActivity).toBeGreaterThan(initialActivity);
  });

  it('should close all connections', () => {
    const pool = new ConnectionPool({
      maxConnections: 10,
      maxConnectionsPerIP: 5,
      connectionTimeout: 1000,
      inactiveTimeout: 5000
    });
    
    // Add connections
    const socket1 = new MockSocket('socket1') as unknown as Socket;
    const socket2 = new MockSocket('socket2') as unknown as Socket;
    
    pool.addConnection(socket1, '127.0.0.1');
    pool.addConnection(socket2, '127.0.0.1');
    
    // Close pool
    pool.close();
    
    // Check if sockets were disconnected
    expect((socket1 as any).disconnected).toBe(true);
    expect((socket2 as any).disconnected).toBe(true);
    
    // Check stats
    const stats = pool.getStats();
    expect(stats.totalConnections).toBe(0);
  });
}); 