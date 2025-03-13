/**
 * Connection Pool Manager
 * Manages WebSocket connections for optimal resource utilization
 */
import { Socket } from 'socket.io';
import { logger } from '../utils/logger';

export interface ConnectionPoolOptions {
  maxConnections: number;     // Maximum number of connections
  maxConnectionsPerIP: number; // Maximum connections per IP
  connectionTimeout: number;  // Connection timeout in ms
  inactiveTimeout: number;    // Inactive timeout in ms
  debug?: boolean;            // Enable debug logging
}

export interface ConnectionStats {
  totalConnections: number;
  activeConnections: number;
  authenticatedConnections: number;
  connectionsByIP: Map<string, number>;
  avgConnectionAge: number;
  oldestConnection: number;
  newestConnection: number;
}

/**
 * Connection pool manager
 * Manages WebSocket connections and enforces limits
 */
export class ConnectionPool {
  private options: ConnectionPoolOptions;
  private connections: Map<string, Socket> = new Map();
  private connectionData: Map<string, {
    ip: string;
    connectedAt: number;
    lastActivity: number;
    authenticated: boolean;
    userAgent: string;
  }> = new Map();
  private connectionsByIP: Map<string, Set<string>> = new Map();
  private inactivityCheckInterval: NodeJS.Timeout | null = null;

  /**
   * Constructor
   * @param options Connection pool options
   */
  constructor(options: Partial<ConnectionPoolOptions> = {}) {
    this.options = {
      maxConnections: 1000,
      maxConnectionsPerIP: 10,
      connectionTimeout: 10000,
      inactiveTimeout: 120000,
      debug: false,
      ...options
    };
    
    this.startInactivityCheck();
    
    this.log('Connection pool initialized', {
      maxConnections: this.options.maxConnections,
      maxConnectionsPerIP: this.options.maxConnectionsPerIP,
      connectionTimeout: this.options.connectionTimeout,
      inactiveTimeout: this.options.inactiveTimeout
    });
  }

  /**
   * Add connection to pool
   * @param socket Socket to add
   * @param ip Client IP
   * @param userAgent Client user agent
   * @returns Whether connection was added
   */
  addConnection(socket: Socket, ip: string, userAgent: string = 'unknown'): boolean {
    const socketId = socket.id;
    
    // Check if pool is full
    if (this.connections.size >= this.options.maxConnections) {
      this.log('Connection pool full, rejecting connection', {
        socketId,
        ip,
        currentConnections: this.connections.size,
        maxConnections: this.options.maxConnections
      });
      return false;
    }
    
    // Check if IP has too many connections
    const ipConnections = this.connectionsByIP.get(ip) || new Set();
    if (ipConnections.size >= this.options.maxConnectionsPerIP) {
      this.log('Too many connections from IP, rejecting connection', {
        socketId,
        ip,
        currentIPConnections: ipConnections.size,
        maxConnectionsPerIP: this.options.maxConnectionsPerIP
      });
      return false;
    }
    
    // Add connection
    this.connections.set(socketId, socket);
    
    // Add connection data
    this.connectionData.set(socketId, {
      ip,
      connectedAt: Date.now(),
      lastActivity: Date.now(),
      authenticated: false,
      userAgent
    });
    
    // Add to IP connections
    ipConnections.add(socketId);
    this.connectionsByIP.set(ip, ipConnections);
    
    this.log('Connection added to pool', {
      socketId,
      ip,
      currentConnections: this.connections.size,
      currentIPConnections: ipConnections.size
    });
    
    return true;
  }

  /**
   * Remove connection from pool
   * @param socketId Socket ID to remove
   */
  removeConnection(socketId: string): void {
    // Get connection data
    const connectionData = this.connectionData.get(socketId);
    if (!connectionData) {
      return;
    }
    
    // Remove from IP connections
    const ipConnections = this.connectionsByIP.get(connectionData.ip);
    if (ipConnections) {
      ipConnections.delete(socketId);
      
      if (ipConnections.size === 0) {
        this.connectionsByIP.delete(connectionData.ip);
      } else {
        this.connectionsByIP.set(connectionData.ip, ipConnections);
      }
    }
    
    // Remove connection data
    this.connectionData.delete(socketId);
    
    // Remove connection
    this.connections.delete(socketId);
    
    this.log('Connection removed from pool', {
      socketId,
      ip: connectionData.ip,
      currentConnections: this.connections.size,
      currentIPConnections: ipConnections ? ipConnections.size : 0
    });
  }

  /**
   * Update connection activity
   * @param socketId Socket ID to update
   */
  updateActivity(socketId: string): void {
    const connectionData = this.connectionData.get(socketId);
    if (connectionData) {
      connectionData.lastActivity = Date.now();
      this.connectionData.set(socketId, connectionData);
    }
  }

  /**
   * Set connection as authenticated
   * @param socketId Socket ID to update
   */
  setAuthenticated(socketId: string): void {
    const connectionData = this.connectionData.get(socketId);
    if (connectionData) {
      connectionData.authenticated = true;
      this.connectionData.set(socketId, connectionData);
      
      this.log('Connection authenticated', {
        socketId,
        ip: connectionData.ip
      });
    }
  }

  /**
   * Get connection by socket ID
   * @param socketId Socket ID
   * @returns Socket or null if not found
   */
  getConnection(socketId: string): Socket | null {
    return this.connections.get(socketId) || null;
  }

  /**
   * Get connection data by socket ID
   * @param socketId Socket ID
   * @returns Connection data or null if not found
   */
  getConnectionData(socketId: string): any | null {
    return this.connectionData.get(socketId) || null;
  }

  /**
   * Get all connections
   * @returns Map of socket ID to socket
   */
  getAllConnections(): Map<string, Socket> {
    return new Map(this.connections);
  }

  /**
   * Get authenticated connections
   * @returns Map of socket ID to socket
   */
  getAuthenticatedConnections(): Map<string, Socket> {
    const authenticatedConnections = new Map<string, Socket>();
    
    for (const [socketId, connectionData] of this.connectionData.entries()) {
      if (connectionData.authenticated) {
        const socket = this.connections.get(socketId);
        if (socket) {
          authenticatedConnections.set(socketId, socket);
        }
      }
    }
    
    return authenticatedConnections;
  }

  /**
   * Get connections by IP
   * @param ip IP address
   * @returns Array of sockets
   */
  getConnectionsByIP(ip: string): Socket[] {
    const ipConnections = this.connectionsByIP.get(ip);
    if (!ipConnections) {
      return [];
    }
    
    const sockets: Socket[] = [];
    
    for (const socketId of ipConnections) {
      const socket = this.connections.get(socketId);
      if (socket) {
        sockets.push(socket);
      }
    }
    
    return sockets;
  }

  /**
   * Get connection stats
   * @returns Connection stats
   */
  getStats(): ConnectionStats {
    const now = Date.now();
    let totalAge = 0;
    let oldestConnection = now;
    let newestConnection = 0;
    let authenticatedCount = 0;
    
    for (const connectionData of this.connectionData.values()) {
      const age = now - connectionData.connectedAt;
      totalAge += age;
      
      if (connectionData.connectedAt < oldestConnection) {
        oldestConnection = connectionData.connectedAt;
      }
      
      if (connectionData.connectedAt > newestConnection) {
        newestConnection = connectionData.connectedAt;
      }
      
      if (connectionData.authenticated) {
        authenticatedCount++;
      }
    }
    
    const avgConnectionAge = this.connectionData.size > 0
      ? totalAge / this.connectionData.size
      : 0;
    
    return {
      totalConnections: this.connections.size,
      activeConnections: this.connections.size,
      authenticatedConnections: authenticatedCount,
      connectionsByIP: new Map(
        Array.from(this.connectionsByIP.entries())
          .map(([ip, connections]) => [ip, connections.size])
      ),
      avgConnectionAge,
      oldestConnection: now - oldestConnection,
      newestConnection: now - newestConnection
    };
  }

  /**
   * Start inactivity check interval
   */
  private startInactivityCheck(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
    }
    
    this.inactivityCheckInterval = setInterval(() => {
      this.checkInactiveConnections();
    }, 30000); // Check every 30 seconds
    
    this.log('Inactivity check started', {
      interval: 30000
    });
  }

  /**
   * Check for inactive connections
   */
  private checkInactiveConnections(): void {
    const now = Date.now();
    const inactiveSocketIds: string[] = [];
    
    for (const [socketId, connectionData] of this.connectionData.entries()) {
      const inactiveTime = now - connectionData.lastActivity;
      
      if (inactiveTime > this.options.inactiveTimeout) {
        inactiveSocketIds.push(socketId);
      }
    }
    
    if (inactiveSocketIds.length > 0) {
      this.log('Disconnecting inactive connections', {
        count: inactiveSocketIds.length,
        inactiveTimeout: this.options.inactiveTimeout
      });
      
      for (const socketId of inactiveSocketIds) {
        const socket = this.connections.get(socketId);
        if (socket) {
          socket.disconnect(true);
        }
        
        this.removeConnection(socketId);
      }
    }
  }

  /**
   * Close connection pool
   */
  close(): void {
    if (this.inactivityCheckInterval) {
      clearInterval(this.inactivityCheckInterval);
      this.inactivityCheckInterval = null;
    }
    
    // Disconnect all connections
    for (const socket of this.connections.values()) {
      socket.disconnect(true);
    }
    
    // Clear all data
    this.connections.clear();
    this.connectionData.clear();
    this.connectionsByIP.clear();
    
    this.log('Connection pool closed');
  }

  /**
   * Log message if debug is enabled
   * @param message Message to log
   * @param data Additional data
   */
  private log(message: string, data?: any): void {
    if (this.options.debug) {
      logger.debug(`[ConnectionPool] ${message}`, data);
    }
  }
} 