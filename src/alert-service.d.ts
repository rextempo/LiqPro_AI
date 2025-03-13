export interface Alert {
    id: string;
    userId: string;
    alertType: 'price' | 'signal' | 'performance' | 'system';
    poolAddress?: string;
    conditions: Record<string, any>;
    status: 'active' | 'triggered' | 'dismissed';
    notificationChannels: ('email' | 'push' | 'webhook')[];
    createdAt: number;
    updatedAt: number;
    triggeredAt?: number;
    dismissedAt?: number;
}
export interface AlertFilter {
    userId?: string;
    poolAddress?: string;
    alertType?: string;
    status?: string;
    startTime?: number;
    endTime?: number;
    limit: number;
    offset: number;
}
export interface AlertSettings {
    userId: string;
    defaultChannels: ('email' | 'push' | 'webhook')[];
    emailSettings?: {
        email: string;
        verified: boolean;
        frequency: 'immediate' | 'hourly' | 'daily';
        digest: boolean;
    };
    pushSettings?: {
        deviceTokens: string[];
        enabled: boolean;
        quietHours?: {
            start: string;
            end: string;
            timezone: string;
        };
    };
    webhookSettings?: {
        urls: string[];
        secret?: string;
        format: 'json' | 'form';
    };
    createdAt: number;
    updatedAt: number;
}
export declare class AlertService {
    private baseUrl;
    constructor();
    /**
     * Get alerts with optional filtering
     */
    getAlerts(filter: AlertFilter): Promise<Alert[]>;
    /**
     * Get an alert by ID
     */
    getAlertById(id: string): Promise<Alert | null>;
    /**
     * Create a new alert
     */
    createAlert(alertData: Partial<Alert>): Promise<Alert>;
    /**
     * Update an existing alert
     */
    updateAlert(id: string, alertData: Partial<Alert>): Promise<Alert>;
    /**
     * Delete an alert
     */
    deleteAlert(id: string): Promise<void>;
    /**
     * Dismiss an alert
     */
    dismissAlert(id: string): Promise<Alert>;
    /**
     * Get alert settings for a user
     */
    getAlertSettings(userId: string): Promise<AlertSettings | null>;
    /**
     * Update alert settings for a user
     */
    updateAlertSettings(userId: string, settingsData: Partial<AlertSettings>): Promise<AlertSettings>;
}
