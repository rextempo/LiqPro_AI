/**
 * Session Manager
 * Utility for managing WebSocket session state and recovery
 */
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

export interface SessionData {
  sessionId: string;
  clientId: string;
  subscriptions: {
    id: string;
    topic: string;
    options: any;
    createdAt: number;
  }[];
  authenticated: boolean;
  lastActive: number;
  createdAt: number;
  metadata?: Record<string, any>;
}

export interface SessionManagerOptions {
  sessionTTL: number;         // Session time-to-live in ms (default: 1 hour)
  cleanupInterval: number;    // Cleanup interval in ms (default: 5 minutes)
  maxSessionsPerClient: number; // Maximum sessions per client (default: 3)
  debug?: boolean;            // Enable debug logging
}

/**
 * Session manager for WebSocket connections
 * Manages session state and provides recovery functionality
 */
export class SessionManager {
  private sessions: Map<string, SessionData> = new Map();
  private clientSessions: Map<string, Set<string>> = new Map();
  private options: SessionManagerOptions;
  private cleanupTimer: NodeJS.Timeout | null = null;

  /**
   * Constructor
   * @param options Session manager options
   */
  constructor(options: Partial<SessionManagerOptions> = {}) {
    this.options = {
      sessionTTL: 3600000, // 1 hour
      cleanupInterval: 300000, // 5 minutes
      maxSessionsPerClient: 3,
      debug: false,
      ...options
    };

    this.startCleanup();
    
    this.log('Session manager initialized', {
      sessionTTL: this.options.sessionTTL,
      cleanupInterval: this.options.cleanupInterval,
      maxSessionsPerClient: this.options.maxSessionsPerClient
    });
  }

  /**
   * Create a new session
   * @param clientId Client ID
   * @param metadata Optional session metadata
   * @returns Session ID
   */
  createSession(clientId: string, metadata?: Record<string, any>): string {
    // Generate session ID
    const sessionId = uuidv4();
    
    // Create session data
    const sessionData: SessionData = {
      sessionId,
      clientId,
      subscriptions: [],
      authenticated: false,
      lastActive: Date.now(),
      createdAt: Date.now(),
      metadata
    };
    
    // Add session
    this.sessions.set(sessionId, sessionData);
    
    // Add to client sessions
    let clientSessions = this.clientSessions.get(clientId);
    if (!clientSessions) {
      clientSessions = new Set();
      this.clientSessions.set(clientId, clientSessions);
    }
    
    // Check if client has too many sessions
    if (clientSessions.size >= this.options.maxSessionsPerClient) {
      // Find oldest session
      let oldestSessionId: string | null = null;
      let oldestTime = Infinity;
      
      for (const sid of clientSessions) {
        const session = this.sessions.get(sid);
        if (session && session.lastActive < oldestTime) {
          oldestSessionId = sid;
          oldestTime = session.lastActive;
        }
      }
      
      // Remove oldest session
      if (oldestSessionId) {
        this.log('Removing oldest session for client', {
          clientId,
          sessionId: oldestSessionId
        });
        
        clientSessions.delete(oldestSessionId);
        this.sessions.delete(oldestSessionId);
      }
    }
    
    // Add new session
    clientSessions.add(sessionId);
    
    this.log('Session created', {
      clientId,
      sessionId,
      totalSessions: this.sessions.size,
      clientSessions: clientSessions.size
    });
    
    return sessionId;
  }

  /**
   * Get session data
   * @param sessionId Session ID
   * @returns Session data or null if not found
   */
  getSession(sessionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (session) {
      // Update last active time
      session.lastActive = Date.now();
      this.sessions.set(sessionId, session);
    }
    
    return session || null;
  }

  /**
   * Update session data
   * @param sessionId Session ID
   * @param updates Updates to apply
   * @returns Updated session data or null if not found
   */
  updateSession(sessionId: string, updates: Partial<SessionData>): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Apply updates
    const updatedSession = {
      ...session,
      ...updates,
      sessionId, // Ensure sessionId doesn't change
      clientId: session.clientId, // Ensure clientId doesn't change
      lastActive: Date.now() // Always update lastActive
    };
    
    // Save updated session
    this.sessions.set(sessionId, updatedSession);
    
    this.log('Session updated', {
      sessionId,
      clientId: session.clientId
    });
    
    return updatedSession;
  }

  /**
   * Add subscription to session
   * @param sessionId Session ID
   * @param subscription Subscription data
   * @returns Updated session data or null if not found
   */
  addSubscription(sessionId: string, subscription: { id: string; topic: string; options: any }): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Add subscription
    session.subscriptions.push({
      ...subscription,
      createdAt: Date.now()
    });
    
    // Update last active time
    session.lastActive = Date.now();
    
    // Save updated session
    this.sessions.set(sessionId, session);
    
    this.log('Subscription added to session', {
      sessionId,
      clientId: session.clientId,
      subscriptionId: subscription.id,
      topic: subscription.topic
    });
    
    return session;
  }

  /**
   * Remove subscription from session
   * @param sessionId Session ID
   * @param subscriptionId Subscription ID
   * @returns Updated session data or null if not found
   */
  removeSubscription(sessionId: string, subscriptionId: string): SessionData | null {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return null;
    }
    
    // Remove subscription
    session.subscriptions = session.subscriptions.filter(sub => sub.id !== subscriptionId);
    
    // Update last active time
    session.lastActive = Date.now();
    
    // Save updated session
    this.sessions.set(sessionId, session);
    
    this.log('Subscription removed from session', {
      sessionId,
      clientId: session.clientId,
      subscriptionId
    });
    
    return session;
  }

  /**
   * Delete session
   * @param sessionId Session ID
   * @returns Whether session was deleted
   */
  deleteSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    
    if (!session) {
      return false;
    }
    
    // Remove from client sessions
    const clientSessions = this.clientSessions.get(session.clientId);
    if (clientSessions) {
      clientSessions.delete(sessionId);
      
      if (clientSessions.size === 0) {
        this.clientSessions.delete(session.clientId);
      }
    }
    
    // Remove session
    this.sessions.delete(sessionId);
    
    this.log('Session deleted', {
      sessionId,
      clientId: session.clientId
    });
    
    return true;
  }

  /**
   * Get client sessions
   * @param clientId Client ID
   * @returns Array of session data
   */
  getClientSessions(clientId: string): SessionData[] {
    const clientSessions = this.clientSessions.get(clientId);
    
    if (!clientSessions) {
      return [];
    }
    
    const sessions: SessionData[] = [];
    
    for (const sessionId of clientSessions) {
      const session = this.sessions.get(sessionId);
      if (session) {
        sessions.push(session);
      }
    }
    
    return sessions;
  }

  /**
   * Start cleanup timer
   */
  private startCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
    
    this.log('Cleanup timer started', {
      interval: this.options.cleanupInterval
    });
  }

  /**
   * Clean up expired sessions
   */
  private cleanup(): void {
    const now = Date.now();
    const expiredSessions: string[] = [];
    
    // Find expired sessions
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastActive > this.options.sessionTTL) {
        expiredSessions.push(sessionId);
      }
    }
    
    // Delete expired sessions
    for (const sessionId of expiredSessions) {
      this.deleteSession(sessionId);
    }
    
    if (expiredSessions.length > 0) {
      this.log('Cleaned up expired sessions', {
        count: expiredSessions.length,
        remaining: this.sessions.size
      });
    }
  }

  /**
   * Get session stats
   * @returns Session stats
   */
  getStats(): any {
    return {
      totalSessions: this.sessions.size,
      totalClients: this.clientSessions.size,
      sessionsByClient: Array.from(this.clientSessions.entries()).map(([clientId, sessions]) => ({
        clientId,
        sessionCount: sessions.size
      }))
    };
  }

  /**
   * Close session manager
   */
  close(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    
    this.sessions.clear();
    this.clientSessions.clear();
    
    this.log('Session manager closed');
  }

  /**
   * Log message if debug is enabled
   * @param message Message to log
   * @param data Additional data
   */
  private log(message: string, data?: any): void {
    if (this.options.debug) {
      logger.debug(`[SessionManager] ${message}`, data);
    }
  }
} 