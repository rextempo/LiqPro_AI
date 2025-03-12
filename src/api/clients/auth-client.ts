import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, AxiosResponse } from 'axios';
import config from '../../config/env';

/**
 * Authentication client
 * Used for handling user authentication related API requests
 */
export class AuthClient {
  private api: AxiosInstance;
  private baseUrl: string;
  private accessToken: string | null = null;
  private tokenRefresh: string | null = null;
  private tokenExpiresAt = 0;

  /**
   * Constructor
   * @param baseUrl API base URL
   */
  constructor(baseUrl: string = config.api.baseUrl) {
    this.baseUrl = baseUrl;
    
    // Create axios instance
    this.api = axios.create({
      baseURL: `${baseUrl}/auth`,
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    // Restore tokens from local storage
    this.loadTokensFromStorage();
    
    // Add request interceptor to automatically add auth headers
    this.api.interceptors.request.use(
      async (config: AxiosRequestConfig): Promise<AxiosRequestConfig> => {
        // If token is about to expire, try to refresh
        if (this.shouldRefreshToken()) {
          try {
            await this.refreshTokenSilently();
          } catch (error) {
            console.error('Failed to refresh token:', error);
            // Clear tokens
            this.clearTokens();
          }
        }
        
        // If we have an access token, add it to the request header
        if (this.accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${this.accessToken}`;
        }
        
        return config;
      },
      (error: AxiosError): Promise<AxiosError> => Promise.reject(error)
    );
    
    // Add response interceptor to handle auth errors
    this.api.interceptors.response.use(
      (response: AxiosResponse): AxiosResponse => response,
      async (error: AxiosError): Promise<AxiosResponse | AxiosError> => {
        const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };
        
        // If it's a 401 error and we haven't tried refreshing the token yet
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;
          
          try {
            // Try to refresh the token
            await this.refreshTokenSilently();
            
            // Update auth header
            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${this.accessToken}`;
            }
            
            // Retry the request
            return this.api(originalRequest);
          } catch (refreshError) {
            // Token refresh failed, clear tokens
            this.clearTokens();
            return Promise.reject(refreshError);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  /**
   * Login with wallet address and signature
   * @param walletAddress Wallet address
   * @param signature Signature
   */
  public async loginWithWallet(walletAddress: string, signature: string): Promise<void> {
    try {
      const response = await this.api.post('/login/wallet', {
        walletAddress,
        signature,
      });
      
      this.handleAuthResponse(response.data);
    } catch (error) {
      console.error('Wallet login error:', error);
      throw error;
    }
  }

  /**
   * Login with API key
   * @param apiKey API key
   * @param apiSecret API secret
   */
  public async loginWithApiKey(apiKey: string, apiSecret: string): Promise<void> {
    try {
      const response = await this.api.post('/login/api-key', {
        apiKey,
        apiSecret,
      });
      
      this.handleAuthResponse(response.data);
    } catch (error) {
      console.error('API key login error:', error);
      throw error;
    }
  }

  /**
   * Register a new user
   * @param walletAddress Wallet address
   * @param signature Signature
   * @param username Username
   * @param email Email
   */
  public async register(
    walletAddress: string,
    signature: string,
    username?: string,
    email?: string
  ): Promise<void> {
    try {
      const response = await this.api.post('/register', {
        walletAddress,
        signature,
        username,
        email,
      });
      
      this.handleAuthResponse(response.data);
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  }

  /**
   * Refresh the access token
   */
  public async refreshAccessToken(): Promise<void> {
    if (!this.tokenRefresh) {
      throw new Error('No refresh token available');
    }
    
    try {
      const response = await this.api.post('/refresh-token', {
        refreshToken: this.tokenRefresh,
      });
      
      this.handleAuthResponse(response.data);
    } catch (error) {
      console.error('Token refresh error:', error);
      this.clearTokens();
      throw error;
    }
  }

  /**
   * Logout
   */
  public async logout(): Promise<void> {
    if (!this.tokenRefresh) {
      this.clearTokens();
      return;
    }
    
    try {
      await this.api.post('/logout', {
        refreshToken: this.tokenRefresh,
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Get current user information
   */
  public async getCurrentUser(): Promise<any> {
    try {
      const response = await this.api.get('/me');
      return response.data;
    } catch (error) {
      console.error('Get current user error:', error);
      throw error;
    }
  }

  /**
   * Validate if the current session is valid
   */
  public async validateSession(): Promise<boolean> {
    // If no access token, session is invalid
    if (!this.accessToken) {
      return false;
    }
    
    // If token is expired and refresh fails, session is invalid
    if (this.isTokenExpired() && !await this.tryRefreshToken()) {
      return false;
    }
    
    try {
      // Validate session
      await this.api.get('/validate');
      return true;
    } catch (error) {
      console.error('Session validation error:', error);
      return false;
    }
  }

  /**
   * Handle authentication response
   * @param data Response data
   */
  private handleAuthResponse(data: any): void {
    if (data.accessToken) {
      this.accessToken = data.accessToken;
      this.tokenRefresh = data.refreshToken || this.tokenRefresh;
      
      // Calculate token expiration time
      if (data.expiresIn) {
        this.tokenExpiresAt = Date.now() + data.expiresIn * 1000;
      }
      
      // Save tokens to local storage
      this.saveTokensToStorage();
    }
  }

  /**
   * Save tokens to local storage
   */
  private saveTokensToStorage(): void {
    if (typeof localStorage !== 'undefined') {
      if (this.accessToken) {
        localStorage.setItem('accessToken', this.accessToken);
      }
      
      if (this.tokenRefresh) {
        localStorage.setItem('refreshToken', this.tokenRefresh);
      }
      
      if (this.tokenExpiresAt) {
        localStorage.setItem('tokenExpiresAt', this.tokenExpiresAt.toString());
      }
    }
  }

  /**
   * Load tokens from local storage
   */
  private loadTokensFromStorage(): void {
    if (typeof localStorage !== 'undefined') {
      this.accessToken = localStorage.getItem('accessToken');
      this.tokenRefresh = localStorage.getItem('refreshToken');
      
      const expiresAt = localStorage.getItem('tokenExpiresAt');
      if (expiresAt) {
        this.tokenExpiresAt = parseInt(expiresAt, 10);
      }
    }
  }

  /**
   * Clear tokens from memory and local storage
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.tokenRefresh = null;
    this.tokenExpiresAt = 0;
    
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      localStorage.removeItem('tokenExpiresAt');
    }
  }

  /**
   * Check if token is expired
   */
  private isTokenExpired(): boolean {
    return Date.now() >= this.tokenExpiresAt;
  }

  /**
   * Check if token should be refreshed
   * Refresh if less than 5 minutes until expiration
   */
  private shouldRefreshToken(): boolean {
    if (!this.accessToken || !this.tokenRefresh) {
      return false;
    }
    
    // Refresh if less than 5 minutes until expiration
    return Date.now() + config.security.tokenRefreshThreshold >= this.tokenExpiresAt;
  }

  /**
   * Try to refresh the token silently
   */
  private async refreshTokenSilently(): Promise<void> {
    if (!this.tokenRefresh) {
      throw new Error('No refresh token available');
    }
    
    const response = await this.api.post('/refresh-token', {
      refreshToken: this.tokenRefresh,
    }, {
      // Skip the request interceptor to avoid infinite loop
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    this.handleAuthResponse(response.data);
  }

  /**
   * Try to refresh the token and return success status
   */
  private async tryRefreshToken(): Promise<boolean> {
    try {
      await this.refreshTokenSilently();
      return true;
    } catch (error) {
      return false;
    }
  }
} 