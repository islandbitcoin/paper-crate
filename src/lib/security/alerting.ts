/**
 * Security alerting and notification system
 */
import { securityMonitor, type SecurityEvent } from './monitoring';
import { type SecurityIncident } from './incident-response';

export type AlertChannel = 'console' | 'browser' | 'toast' | 'modal' | 'email' | 'webhook';
export type AlertPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  eventTypes: string[];
  severityThreshold: 'low' | 'medium' | 'high' | 'critical';
  channels: AlertChannel[];
  priority: AlertPriority;
  throttle?: number; // milliseconds to throttle duplicate alerts
  conditions?: AlertCondition[];
  enabled: boolean;
}

export interface AlertCondition {
  field: string; // field path in event details
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'regex';
  value: unknown;
}

export interface SecurityAlert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  priority: AlertPriority;
  channels: AlertChannel[];
  event?: SecurityEvent;
  incident?: SecurityIncident;
  timestamp: number;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: number;
  dismissed: boolean;
  dismissedBy?: string;
  dismissedAt?: number;
}

/**
 * Default alert rules
 */
export const DEFAULT_ALERT_RULES: AlertRule[] = [
  {
    id: 'critical-events',
    name: 'Critical Security Events',
    description: 'Alert on all critical security events',
    eventTypes: ['*'], // All event types
    severityThreshold: 'critical',
    channels: ['console', 'browser', 'toast'],
    priority: 'urgent',
    enabled: true,
  },
  {
    id: 'payment-fraud',
    name: 'Payment Fraud Detection',
    description: 'Alert on suspicious payment patterns',
    eventTypes: ['payment_failed', 'invalid_invoice'],
    severityThreshold: 'medium',
    channels: ['console', 'toast'],
    priority: 'high',
    throttle: 300000, // 5 minutes
    enabled: true,
  },
  {
    id: 'auth-anomalies',
    name: 'Authentication Anomalies',
    description: 'Alert on authentication-related security events',
    eventTypes: ['auth_failed', 'suspicious_activity'],
    severityThreshold: 'medium',
    channels: ['console', 'toast'],
    priority: 'normal',
    throttle: 180000, // 3 minutes
    enabled: true,
  },
  {
    id: 'csp-violations',
    name: 'CSP Violations',
    description: 'Alert on Content Security Policy violations',
    eventTypes: ['csp_violation'],
    severityThreshold: 'low',
    channels: ['console'],
    priority: 'normal',
    throttle: 60000, // 1 minute
    enabled: true,
  },
  {
    id: 'data-breaches',
    name: 'Data Breach Indicators',
    description: 'Alert on potential data breach indicators',
    eventTypes: ['data_export', 'data_access', 'encryption_failed'],
    severityThreshold: 'high',
    channels: ['console', 'browser', 'toast'],
    priority: 'urgent',
    enabled: true,
  },
  {
    id: 'system-health',
    name: 'System Health Warnings',
    description: 'Alert on system health and security warnings',
    eventTypes: ['system_health_warning', 'vulnerability_found'],
    severityThreshold: 'medium',
    channels: ['console', 'toast'],
    priority: 'normal',
    throttle: 600000, // 10 minutes
    enabled: true,
  }
];

/**
 * Alert Manager
 */
export class AlertManager {
  private alerts = new Map<string, SecurityAlert>();
  private rules: AlertRule[];
  private throttleCache = new Map<string, number>();
  private toastCallback?: (alert: SecurityAlert) => void;
  private modalCallback?: (alert: SecurityAlert) => void;

  constructor(customRules?: AlertRule[]) {
    this.rules = customRules || DEFAULT_ALERT_RULES;
    this.loadState();
    
    // Request notification permission if supported
    this.requestNotificationPermission();
  }

  /**
   * Set callback for toast notifications
   */
  setToastCallback(callback: (alert: SecurityAlert) => void): void {
    this.toastCallback = callback;
  }

  /**
   * Set callback for modal alerts
   */
  setModalCallback(callback: (alert: SecurityAlert) => void): void {
    this.modalCallback = callback;
  }

  /**
   * Process security event and check for alert triggers
   */
  processSecurityEvent(event: SecurityEvent): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.shouldTriggerAlert(rule, event)) {
        this.createAlert(rule, event);
      }
    }
  }

  /**
   * Process security incident and create alert
   */
  processSecurityIncident(incident: SecurityIncident): void {
    const alertId = `incident-alert-${incident.id}`;
    
    const alert: SecurityAlert = {
      id: alertId,
      ruleId: 'incident-alert',
      title: `Security Incident: ${incident.title}`,
      message: `${incident.description} (Severity: ${incident.severity})`,
      priority: this.mapSeverityToPriority(incident.severity),
      channels: this.getChannelsForSeverity(incident.severity),
      incident,
      timestamp: Date.now(),
      acknowledged: false,
      dismissed: false,
    };

    this.alerts.set(alertId, alert);
    this.deliverAlert(alert);

    securityMonitor.logEvent({
      type: 'alert_triggered',
      details: {
        alertId,
        incidentId: incident.id,
        priority: alert.priority,
      },
      severity: 'medium',
    });

    this.saveState();
  }

  /**
   * Check if rule should trigger alert for event
   */
  private shouldTriggerAlert(rule: AlertRule, event: SecurityEvent): boolean {
    // Check event type
    if (!rule.eventTypes.includes('*') && !rule.eventTypes.includes(event.type)) {
      return false;
    }

    // Check severity threshold
    const severityLevels = { low: 1, medium: 2, high: 3, critical: 4 };
    if (severityLevels[event.severity] < severityLevels[rule.severityThreshold]) {
      return false;
    }

    // Check conditions
    if (rule.conditions) {
      for (const condition of rule.conditions) {
        if (!this.evaluateCondition(condition, event)) {
          return false;
        }
      }
    }

    // Check throttling
    if (rule.throttle) {
      const throttleKey = `${rule.id}-${event.type}-${event.userId || 'anonymous'}`;
      const lastAlert = this.throttleCache.get(throttleKey);
      
      if (lastAlert && Date.now() - lastAlert < rule.throttle) {
        return false;
      }
      
      this.throttleCache.set(throttleKey, Date.now());
    }

    return true;
  }

  /**
   * Evaluate alert condition
   */
  private evaluateCondition(condition: AlertCondition, event: SecurityEvent): boolean {
    const value = this.getNestedValue(event.details, condition.field);

    switch (condition.operator) {
      case 'equals':
        return value === condition.value;
      
      case 'contains':
        return typeof value === 'string' && 
               typeof condition.value === 'string' && 
               value.includes(condition.value);
      
      case 'greaterThan':
        return typeof value === 'number' && 
               typeof condition.value === 'number' && 
               value > condition.value;
      
      case 'lessThan':
        return typeof value === 'number' && 
               typeof condition.value === 'number' && 
               value < condition.value;
      
      case 'regex':
        return typeof value === 'string' && 
               typeof condition.value === 'string' && 
               new RegExp(condition.value).test(value);
      
      default:
        return false;
    }
  }

  /**
   * Get nested value from object
   */
  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((current, key) => {
      return current && typeof current === 'object' ? (current as Record<string, unknown>)[key] : undefined;
    }, obj);
  }

  /**
   * Create alert from rule and event
   */
  private createAlert(rule: AlertRule, event: SecurityEvent): void {
    const alertId = `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: SecurityAlert = {
      id: alertId,
      ruleId: rule.id,
      title: rule.name,
      message: this.generateAlertMessage(rule, event),
      priority: rule.priority,
      channels: rule.channels,
      event,
      timestamp: Date.now(),
      acknowledged: false,
      dismissed: false,
    };

    this.alerts.set(alertId, alert);
    this.deliverAlert(alert);

    securityMonitor.logEvent({
      type: 'alert_triggered',
      details: {
        alertId,
        ruleId: rule.id,
        eventType: event.type,
        priority: rule.priority,
      },
      severity: 'low',
    });

    this.saveState();
  }

  /**
   * Generate alert message from rule and event
   */
  private generateAlertMessage(rule: AlertRule, event: SecurityEvent): string {
    const eventDetails = Object.entries(event.details)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ');

    return `${rule.description}\n\nEvent: ${event.type}\nSeverity: ${event.severity}\nTime: ${new Date(event.timestamp).toLocaleString()}\nDetails: ${eventDetails}`;
  }

  /**
   * Deliver alert through specified channels
   */
  private deliverAlert(alert: SecurityAlert): void {
    for (const channel of alert.channels) {
      try {
        this.deliverToChannel(alert, channel);
      } catch (error) {
        console.error(`Failed to deliver alert to channel ${channel}:`, error);
      }
    }
  }

  /**
   * Deliver alert to specific channel
   */
  private deliverToChannel(alert: SecurityAlert, channel: AlertChannel): void {
    switch (channel) {
      case 'console':
        this.deliverToConsole(alert);
        break;
      
      case 'browser':
        this.deliverToBrowser(alert);
        break;
      
      case 'toast':
        this.deliverToToast(alert);
        break;
      
      case 'modal':
        this.deliverToModal(alert);
        break;
      
      case 'email':
        // Email notifications would be implemented here
        console.info('[EMAIL ALERT]', alert);
        break;
      
      case 'webhook':
        // Webhook notifications would be implemented here
        console.info('[WEBHOOK ALERT]', alert);
        break;
    }
  }

  /**
   * Deliver alert to console
   */
  private deliverToConsole(alert: SecurityAlert): void {
    const logMethod = alert.priority === 'urgent' ? 'error' : 
                     alert.priority === 'high' ? 'warn' : 'info';
    
    console[logMethod](`[SECURITY ALERT] ${alert.title}`, {
      message: alert.message,
      priority: alert.priority,
      timestamp: new Date(alert.timestamp).toISOString(),
      event: alert.event,
      incident: alert.incident,
    });
  }

  /**
   * Deliver alert via browser notification
   */
  private deliverToBrowser(alert: SecurityAlert): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      const notification = new Notification(`🚨 ${alert.title}`, {
        body: alert.message.slice(0, 100) + (alert.message.length > 100 ? '...' : ''),
        icon: '/favicon.ico',
        tag: alert.id,
        requireInteraction: alert.priority === 'urgent',
      });

      // Auto-close non-urgent notifications
      if (alert.priority !== 'urgent') {
        setTimeout(() => notification.close(), 5000);
      }
    }
  }

  /**
   * Deliver alert via toast notification
   */
  private deliverToToast(alert: SecurityAlert): void {
    if (this.toastCallback) {
      this.toastCallback(alert);
    }
  }

  /**
   * Deliver alert via modal
   */
  private deliverToModal(alert: SecurityAlert): void {
    if (this.modalCallback) {
      this.modalCallback(alert);
    }
  }

  /**
   * Map incident severity to alert priority
   */
  private mapSeverityToPriority(severity: string): AlertPriority {
    switch (severity) {
      case 'critical': return 'urgent';
      case 'high': return 'high';
      case 'medium': return 'normal';
      default: return 'low';
    }
  }

  /**
   * Get appropriate channels for severity level
   */
  private getChannelsForSeverity(severity: string): AlertChannel[] {
    switch (severity) {
      case 'critical':
        return ['console', 'browser', 'toast', 'modal'];
      case 'high':
        return ['console', 'browser', 'toast'];
      case 'medium':
        return ['console', 'toast'];
      default:
        return ['console'];
    }
  }

  /**
   * Request browser notification permission
   */
  private requestNotificationPermission(): void {
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(error => {
        console.warn('Failed to request notification permission:', error);
      });
    }
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, userId?: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.acknowledged) {
      alert.acknowledged = true;
      alert.acknowledgedBy = userId;
      alert.acknowledgedAt = Date.now();

      securityMonitor.logEvent({
        type: 'alert_acknowledged',
        userId,
        details: {
          alertId,
          acknowledgedAt: alert.acknowledgedAt,
        },
        severity: 'low',
      });

      this.saveState();
    }
  }

  /**
   * Dismiss alert
   */
  dismissAlert(alertId: string, userId?: string): void {
    const alert = this.alerts.get(alertId);
    if (alert && !alert.dismissed) {
      alert.dismissed = true;
      alert.dismissedBy = userId;
      alert.dismissedAt = Date.now();
      this.saveState();
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values()).filter(
      alert => !alert.dismissed && !alert.acknowledged
    );
  }

  /**
   * Get alerts by priority
   */
  getAlertsByPriority(priority: AlertPriority): SecurityAlert[] {
    return Array.from(this.alerts.values()).filter(
      alert => alert.priority === priority && !alert.dismissed
    );
  }

  /**
   * Get recent alerts
   */
  getRecentAlerts(timeWindow = 3600000): SecurityAlert[] {
    const now = Date.now();
    return Array.from(this.alerts.values()).filter(
      alert => now - alert.timestamp < timeWindow
    );
  }

  /**
   * Clear old alerts
   */
  clearOldAlerts(maxAge = 86400000): void { // 24 hours default
    const cutoff = Date.now() - maxAge;
    const alertsToRemove: string[] = [];

    for (const [id, alert] of this.alerts) {
      if (alert.timestamp < cutoff && (alert.acknowledged || alert.dismissed)) {
        alertsToRemove.push(id);
      }
    }

    alertsToRemove.forEach(id => this.alerts.delete(id));
    this.saveState();
  }

  /**
   * Load state from storage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem('paper-crate-alerts');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.alerts) {
          data.alerts.forEach((alert: SecurityAlert) => {
            this.alerts.set(alert.id, alert);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load alert state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    try {
      const data = {
        alerts: Array.from(this.alerts.values()),
      };
      localStorage.setItem('paper-crate-alerts', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save alert state:', error);
    }
  }

  /**
   * Export alerts for analysis
   */
  exportAlerts(): string {
    return JSON.stringify(Array.from(this.alerts.values()), null, 2);
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.alerts.clear();
    this.saveState();
  }
}

// Export singleton instance
export const alertManager = new AlertManager();

// Hook for alerting
export function useAlerting() {
  const processEvent = (event: SecurityEvent) => {
    alertManager.processSecurityEvent(event);
  };

  const processIncident = (incident: SecurityIncident) => {
    alertManager.processSecurityIncident(incident);
  };

  const getActiveAlerts = () => {
    return alertManager.getActiveAlerts();
  };

  const acknowledgeAlert = (alertId: string, userId?: string) => {
    alertManager.acknowledgeAlert(alertId, userId);
  };

  const dismissAlert = (alertId: string, userId?: string) => {
    alertManager.dismissAlert(alertId, userId);
  };

  const setToastCallback = (callback: (alert: SecurityAlert) => void) => {
    alertManager.setToastCallback(callback);
  };

  const setModalCallback = (callback: (alert: SecurityAlert) => void) => {
    alertManager.setModalCallback(callback);
  };

  return {
    processEvent,
    processIncident,
    getActiveAlerts,
    acknowledgeAlert,
    dismissAlert,
    setToastCallback,
    setModalCallback,
  };
}