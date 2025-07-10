/**
 * Security monitoring and logging utilities
 * Tracks suspicious activities and security events
 */

export type SecurityEventType = 
  | 'payment_attempt'
  | 'payment_failed'
  | 'payment_success'
  | 'invalid_invoice'
  | 'rate_limit_exceeded'
  | 'invalid_input'
  | 'auth_failed'
  | 'auth_success'
  | 'auth_logout'
  | 'auth_timeout'
  | 'auth_role_switch'
  | 'permission_denied'
  | 'suspicious_activity'
  | 'data_encrypted'
  | 'data_decrypted'
  | 'encryption_failed'
  | 'decryption_failed'
  | 'secure_storage_write'
  | 'secure_storage_read'
  | 'secure_storage_remove'
  | 'secure_storage_clear'
  | 'secure_storage_cleanup'
  | 'secure_storage_error'
  | 'privacy_settings_updated'
  | 'data_access'
  | 'data_export'
  | 'data_deletion'
  | 'security_headers_applied'
  | 'security_headers_failed'
  | 'csp_violation'
  | 'blocked_request'
  | 'secure_request_success'
  | 'secure_request_failed'
  | 'missing_security_headers'
  | 'suspicious_content_type'
  | 'websocket_connected'
  | 'websocket_error'
  | 'suspicious_websocket_message'
  | 'relay_validated'
  | 'relay_validation_failed'
  | 'relay_rate_limit_exceeded'
  | 'api_rate_limit_exceeded'
  | 'invalid_api_key'
  | 'api_request_success'
  | 'api_request_failed'
  | 'security_audit_completed';

export interface SecurityEvent {
  type: SecurityEventType;
  timestamp: number;
  userId?: string;
  details: Record<string, unknown>;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

class SecurityMonitor {
  private events: SecurityEvent[] = [];
  private readonly maxEvents = 1000;
  private readonly storageKey = 'paper-crate-security-events';
  
  constructor() {
    // Load existing events from localStorage
    this.loadEvents();
    
    // Set up periodic cleanup
    setInterval(() => this.cleanup(), 3600000); // Every hour
  }
  
  private loadEvents(): void {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch (error) {
      console.error('Failed to load security events:', error);
      this.events = [];
    }
  }
  
  private saveEvents(): void {
    try {
      // Keep only recent events
      const recentEvents = this.events.slice(-this.maxEvents);
      localStorage.setItem(this.storageKey, JSON.stringify(recentEvents));
    } catch (error) {
      console.error('Failed to save security events:', error);
    }
  }
  
  logEvent(event: Omit<SecurityEvent, 'timestamp'>): void {
    const fullEvent: SecurityEvent = {
      ...event,
      timestamp: Date.now(),
    };
    
    this.events.push(fullEvent);
    this.saveEvents();
    
    // Log critical events to console in development
    if (event.severity === 'critical' && import.meta.env.DEV) {
      console.error('Critical security event:', event);
    }
    
    // Check for patterns
    this.checkForPatterns(fullEvent);
  }
  
  private checkForPatterns(newEvent: SecurityEvent): void {
    const recentWindow = 300000; // 5 minutes
    const now = Date.now();
    
    // Get recent events of the same type
    const recentSimilar = this.events.filter(
      e => e.type === newEvent.type && 
      e.userId === newEvent.userId &&
      now - e.timestamp < recentWindow
    );
    
    // Alert on suspicious patterns
    if (newEvent.type === 'payment_failed' && recentSimilar.length > 3) {
      this.logEvent({
        type: 'suspicious_activity',
        userId: newEvent.userId,
        details: {
          pattern: 'multiple_payment_failures',
          count: recentSimilar.length,
        },
        severity: 'high',
      });
    }
    
    if (newEvent.type === 'rate_limit_exceeded' && recentSimilar.length > 5) {
      this.logEvent({
        type: 'suspicious_activity',
        userId: newEvent.userId,
        details: {
          pattern: 'excessive_rate_limiting',
          count: recentSimilar.length,
        },
        severity: 'high',
      });
    }
  }
  
  getRecentEvents(
    type?: SecurityEventType,
    userId?: string,
    timeWindow = 3600000 // 1 hour
  ): SecurityEvent[] {
    const now = Date.now();
    
    return this.events.filter(event => {
      if (now - event.timestamp > timeWindow) return false;
      if (type && event.type !== type) return false;
      if (userId && event.userId !== userId) return false;
      return true;
    });
  }
  
  getSuspiciousUsers(): string[] {
    const suspiciousEvents = this.getRecentEvents('suspicious_activity');
    const userIds = new Set<string>();
    
    suspiciousEvents.forEach(event => {
      if (event.userId) {
        userIds.add(event.userId);
      }
    });
    
    return Array.from(userIds);
  }
  
  private cleanup(): void {
    const oneDayAgo = Date.now() - 86400000;
    
    // Remove events older than 24 hours
    this.events = this.events.filter(
      event => event.timestamp > oneDayAgo
    );
    
    this.saveEvents();
  }
  
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
  
  clearEvents(): void {
    this.events = [];
    this.saveEvents();
  }
}

// Export singleton instance
export const securityMonitor = new SecurityMonitor();

// Helper functions for common logging scenarios
export function logPaymentAttempt(
  userId: string,
  amount: number,
  campaignId: string
): void {
  securityMonitor.logEvent({
    type: 'payment_attempt',
    userId,
    details: { amount, campaignId },
    severity: 'low',
  });
}

export function logPaymentFailure(
  userId: string,
  amount: number,
  reason: string
): void {
  securityMonitor.logEvent({
    type: 'payment_failed',
    userId,
    details: { amount, reason },
    severity: 'medium',
  });
}

export function logInvalidInvoice(
  userId: string,
  expectedAmount: number,
  actualAmount?: number
): void {
  securityMonitor.logEvent({
    type: 'invalid_invoice',
    userId,
    details: { expectedAmount, actualAmount },
    severity: 'high',
  });
}

export function logRateLimitExceeded(
  userId: string,
  operation: string
): void {
  securityMonitor.logEvent({
    type: 'rate_limit_exceeded',
    userId,
    details: { operation },
    severity: 'medium',
  });
}

export function logAuthSuccess(
  userId: string,
  method: string
): void {
  securityMonitor.logEvent({
    type: 'auth_success',
    userId,
    details: { method },
    severity: 'low',
  });
}

export function logAuthFailure(
  userId: string | undefined,
  reason: string
): void {
  securityMonitor.logEvent({
    type: 'auth_failed',
    userId,
    details: { reason },
    severity: 'medium',
  });
}

export function logPermissionDenied(
  userId: string,
  permission: string,
  resource?: string
): void {
  securityMonitor.logEvent({
    type: 'permission_denied',
    userId,
    details: { permission, resource },
    severity: 'medium',
  });
}

export function logDataAccess(
  userId: string,
  dataType: string,
  operation: 'read' | 'write' | 'delete',
  resourceId?: string
): void {
  securityMonitor.logEvent({
    type: 'data_access',
    userId,
    details: { dataType, operation, resourceId },
    severity: 'low',
  });
}

export function logDataExport(
  userId: string,
  dataTypes: string[],
  format: string
): void {
  securityMonitor.logEvent({
    type: 'data_export',
    userId,
    details: { dataTypes, format, count: dataTypes.length },
    severity: 'medium',
  });
}

export function logDataDeletion(
  userId: string,
  dataType: string,
  count: number,
  permanent: boolean
): void {
  securityMonitor.logEvent({
    type: 'data_deletion',
    userId,
    details: { dataType, count, permanent },
    severity: permanent ? 'high' : 'medium',
  });
}