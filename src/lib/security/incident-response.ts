/**
 * Automated incident response and threat mitigation
 */
import { securityMonitor, type SecurityEvent, type SecurityEventType } from './monitoring';

export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';
export type IncidentStatus = 'open' | 'investigating' | 'mitigating' | 'resolved' | 'closed';

export interface IncidentRule {
  id: string;
  name: string;
  description: string;
  triggers: IncidentTrigger[];
  severity: IncidentSeverity;
  autoResponse?: AutoResponseAction[];
  enabled: boolean;
}

export interface IncidentTrigger {
  eventType: SecurityEventType;
  conditions: {
    count?: number;
    timeWindow?: number; // milliseconds
    severity?: 'low' | 'medium' | 'high' | 'critical';
    userPattern?: string; // regex pattern for user ID
    detailsPattern?: Record<string, unknown>; // pattern matching for event details
  };
}

export interface AutoResponseAction {
  type: 'log' | 'alert' | 'block_user' | 'rate_limit' | 'notify' | 'escalate' | 'quarantine' | 'forensic_capture';
  config: Record<string, unknown>;
  delay?: number; // milliseconds to wait before executing
}

export interface SecurityIncident {
  id: string;
  ruleId: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  events: SecurityEvent[];
  createdAt: number;
  updatedAt: number;
  resolvedAt?: number;
  assignedTo?: string;
  actions: IncidentAction[];
  forensicData: Record<string, unknown>;
}

export interface IncidentAction {
  id: string;
  type: AutoResponseAction['type'];
  timestamp: number;
  success: boolean;
  details: Record<string, unknown>;
  error?: string;
}

/**
 * Default incident response rules
 */
export const DEFAULT_INCIDENT_RULES: IncidentRule[] = [
  {
    id: 'multiple-payment-failures',
    name: 'Multiple Payment Failures',
    description: 'Detects multiple payment failures from the same user',
    triggers: [{
      eventType: 'payment_failed',
      conditions: {
        count: 5,
        timeWindow: 300000, // 5 minutes
      }
    }],
    severity: 'high',
    autoResponse: [
      {
        type: 'log',
        config: { message: 'Multiple payment failures detected' }
      },
      {
        type: 'rate_limit',
        config: { duration: 3600000, operations: ['payment'] } // 1 hour
      }
    ],
    enabled: true,
  },
  {
    id: 'suspicious-auth-pattern',
    name: 'Suspicious Authentication Pattern',
    description: 'Detects multiple authentication failures followed by success',
    triggers: [
      {
        eventType: 'auth_failed',
        conditions: {
          count: 3,
          timeWindow: 600000, // 10 minutes
        }
      }
    ],
    severity: 'medium',
    autoResponse: [
      {
        type: 'alert',
        config: { message: 'Potential brute force attack detected' }
      },
      {
        type: 'rate_limit',
        config: { duration: 1800000, operations: ['auth'] } // 30 minutes
      }
    ],
    enabled: true,
  },
  {
    id: 'csp-violations',
    name: 'CSP Violations',
    description: 'Detects multiple Content Security Policy violations',
    triggers: [{
      eventType: 'csp_violation',
      conditions: {
        count: 3,
        timeWindow: 60000, // 1 minute
      }
    }],
    severity: 'medium',
    autoResponse: [
      {
        type: 'forensic_capture',
        config: { captureType: 'csp_violation' }
      }
    ],
    enabled: true,
  },
  {
    id: 'critical-security-events',
    name: 'Critical Security Events',
    description: 'Immediate response to critical security events',
    triggers: [{
      eventType: 'threat_detected',
      conditions: {
        severity: 'critical',
        count: 1,
      }
    }],
    severity: 'critical',
    autoResponse: [
      {
        type: 'alert',
        config: { immediate: true, message: 'Critical threat detected' }
      },
      {
        type: 'escalate',
        config: { level: 'immediate' }
      },
      {
        type: 'forensic_capture',
        config: { captureType: 'full_context' }
      }
    ],
    enabled: true,
  },
  {
    id: 'data-exfiltration',
    name: 'Data Exfiltration Attempt',
    description: 'Detects potential data exfiltration patterns',
    triggers: [{
      eventType: 'data_export',
      conditions: {
        count: 3,
        timeWindow: 3600000, // 1 hour
      }
    }],
    severity: 'high',
    autoResponse: [
      {
        type: 'alert',
        config: { message: 'Potential data exfiltration detected' }
      },
      {
        type: 'rate_limit',
        config: { duration: 7200000, operations: ['export'] } // 2 hours
      },
      {
        type: 'forensic_capture',
        config: { captureType: 'data_access_pattern' }
      }
    ],
    enabled: true,
  }
];

/**
 * Incident Response Manager
 */
export class IncidentResponseManager {
  private incidents = new Map<string, SecurityIncident>();
  private rules: IncidentRule[];
  private blockedUsers = new Set<string>();
  private rateLimits = new Map<string, { until: number; operations: string[] }>();
  private alertCallbacks: Array<(incident: SecurityIncident) => void> = [];

  constructor(customRules?: IncidentRule[]) {
    this.rules = customRules || DEFAULT_INCIDENT_RULES;
    this.loadState();
    this.setupEventListening();
  }

  /**
   * Add alert callback for notifications
   */
  onAlert(callback: (incident: SecurityIncident) => void): void {
    this.alertCallbacks.push(callback);
  }

  /**
   * Process security event and check for incident triggers
   */
  processSecurityEvent(event: SecurityEvent): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      for (const trigger of rule.triggers) {
        if (this.checkTrigger(trigger, event)) {
          this.createIncident(rule, event);
          break;
        }
      }
    }
  }

  /**
   * Check if event matches trigger conditions
   */
  private checkTrigger(trigger: IncidentTrigger, event: SecurityEvent): boolean {
    // Check event type
    if (trigger.eventType !== event.type) return false;

    // Check severity if specified
    if (trigger.conditions.severity && event.severity !== trigger.conditions.severity) {
      return false;
    }

    // Check user pattern if specified
    if (trigger.conditions.userPattern && event.userId) {
      const pattern = new RegExp(trigger.conditions.userPattern);
      if (!pattern.test(event.userId)) return false;
    }

    // Check count and time window
    if (trigger.conditions.count && trigger.conditions.timeWindow) {
      const recentEvents = securityMonitor.getRecentEvents(
        trigger.eventType,
        event.userId,
        trigger.conditions.timeWindow
      );

      if (recentEvents.length < trigger.conditions.count) return false;
    }

    return true;
  }

  /**
   * Create new incident
   */
  private createIncident(rule: IncidentRule, triggerEvent: SecurityEvent): void {
    const incidentId = `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    // Gather related events
    const relatedEvents = securityMonitor.getRecentEvents(
      triggerEvent.type,
      triggerEvent.userId,
      300000 // 5 minutes
    );

    const incident: SecurityIncident = {
      id: incidentId,
      ruleId: rule.id,
      title: rule.name,
      description: rule.description,
      severity: rule.severity,
      status: 'open',
      events: relatedEvents,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      actions: [],
      forensicData: this.captureForensicData(triggerEvent),
    };

    this.incidents.set(incidentId, incident);

    // Log incident creation
    securityMonitor.logEvent({
      type: 'incident_detected',
      userId: triggerEvent.userId,
      details: {
        incidentId,
        ruleId: rule.id,
        severity: rule.severity,
      },
      severity: 'high',
    });

    // Execute auto-response actions
    if (rule.autoResponse) {
      this.executeAutoResponse(incident, rule.autoResponse);
    }

    // Trigger alerts
    this.triggerAlert(incident);

    this.saveState();
  }

  /**
   * Execute automated response actions
   */
  private async executeAutoResponse(
    incident: SecurityIncident, 
    actions: AutoResponseAction[]
  ): Promise<void> {
    for (const action of actions) {
      try {
        // Apply delay if specified
        if (action.delay) {
          await new Promise(resolve => setTimeout(resolve, action.delay));
        }

        const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const result = await this.executeAction(action, incident);

        const incidentAction: IncidentAction = {
          id: actionId,
          type: action.type,
          timestamp: Date.now(),
          success: result.success,
          details: result.details,
          error: result.error,
        };

        incident.actions.push(incidentAction);
        incident.updatedAt = Date.now();

        // Log automated response
        securityMonitor.logEvent({
          type: 'automated_response_triggered',
          details: {
            incidentId: incident.id,
            actionType: action.type,
            success: result.success,
            error: result.error,
          },
          severity: 'medium',
        });

      } catch (error) {
        const actionId = `action-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        incident.actions.push({
          id: actionId,
          type: action.type,
          timestamp: Date.now(),
          success: false,
          details: {},
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    this.saveState();
  }

  /**
   * Execute individual action
   */
  private async executeAction(
    action: AutoResponseAction, 
    incident: SecurityIncident
  ): Promise<{ success: boolean; details: Record<string, unknown>; error?: string }> {
    switch (action.type) {
      case 'log':
        console.warn(`[INCIDENT] ${action.config.message}`, incident);
        return { success: true, details: { logged: true } };

      case 'alert':
        // Trigger immediate notification if configured
        if (action.config.immediate) {
          this.alertCallbacks.forEach(callback => callback(incident));
        }
        return { success: true, details: { alerted: true } };

      case 'block_user':
        if (incident.events[0]?.userId) {
          this.blockedUsers.add(incident.events[0].userId);
          return { 
            success: true, 
            details: { 
              blockedUser: incident.events[0].userId,
              duration: action.config.duration || 'permanent'
            } 
          };
        }
        return { success: false, details: {}, error: 'No user ID to block' };

      case 'rate_limit':
        if (incident.events[0]?.userId) {
          const duration = action.config.duration as number || 3600000; // 1 hour default
          const operations = action.config.operations as string[] || ['all'];
          
          this.rateLimits.set(incident.events[0].userId, {
            until: Date.now() + duration,
            operations,
          });
          
          return { 
            success: true, 
            details: { 
              rateLimitedUser: incident.events[0].userId,
              duration,
              operations,
            } 
          };
        }
        return { success: false, details: {}, error: 'No user ID to rate limit' };

      case 'forensic_capture': {
        const forensicData = this.captureForensicData(incident.events[0], action.config.captureType as string);
        incident.forensicData = { ...incident.forensicData, ...forensicData };
        return { success: true, details: { capturedDataKeys: Object.keys(forensicData) } };
      }

      case 'notify':
        // Security team notifications would be implemented here
        console.info('[SECURITY NOTIFICATION]', incident);
        return { success: true, details: { notified: true } };

      case 'escalate':
        incident.severity = 'critical';
        return { success: true, details: { escalated: true } };

      case 'quarantine':
        // Quarantine suspicious data or disable features
        return { success: true, details: { quarantined: true } };

      default:
        return { success: false, details: {}, error: `Unknown action type: ${action.type}` };
    }
  }

  /**
   * Capture forensic data for incident investigation
   */
  private captureForensicData(event: SecurityEvent, captureType = 'basic'): Record<string, unknown> {
    const forensicData: Record<string, unknown> = {
      captureTime: Date.now(),
      captureType,
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
      timestamp: event.timestamp,
      eventType: event.type,
      eventDetails: event.details,
    };

    if (captureType === 'full_context') {
      forensicData.localStorage = this.captureLocalStorageSnapshot();
      forensicData.sessionStorage = this.captureSessionStorageSnapshot();
      forensicData.cookies = typeof document !== 'undefined' ? document.cookie : 'unknown';
    }

    if (captureType === 'csp_violation') {
      forensicData.documentScripts = this.captureScriptElements();
      forensicData.documentLinks = this.captureLinkElements();
    }

    if (captureType === 'data_access_pattern') {
      forensicData.recentDataEvents = securityMonitor.getRecentEvents('data_access', event.userId, 3600000);
    }

    return forensicData;
  }

  /**
   * Capture localStorage snapshot (keys only for privacy)
   */
  private captureLocalStorageSnapshot(): Record<string, string> {
    const snapshot: Record<string, string> = {};
    
    if (typeof localStorage !== 'undefined') {
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            // Only capture key names and data sizes for privacy
            const value = localStorage.getItem(key);
            snapshot[key] = `[${value?.length || 0} characters]`;
          }
        }
      } catch (error) {
        snapshot.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    return snapshot;
  }

  /**
   * Capture sessionStorage snapshot (keys only for privacy)
   */
  private captureSessionStorageSnapshot(): Record<string, string> {
    const snapshot: Record<string, string> = {};
    
    if (typeof sessionStorage !== 'undefined') {
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            const value = sessionStorage.getItem(key);
            snapshot[key] = `[${value?.length || 0} characters]`;
          }
        }
      } catch (error) {
        snapshot.error = error instanceof Error ? error.message : 'Unknown error';
      }
    }
    
    return snapshot;
  }

  /**
   * Capture script elements for CSP violation analysis
   */
  private captureScriptElements(): Array<{ src?: string; inline: boolean; content?: string }> {
    if (typeof document === 'undefined') return [];
    
    const scripts = Array.from(document.querySelectorAll('script'));
    return scripts.map(script => ({
      src: script.src || undefined,
      inline: !script.src,
      content: script.src ? undefined : script.textContent?.slice(0, 100) + '...',
    }));
  }

  /**
   * Capture link elements for CSP violation analysis
   */
  private captureLinkElements(): Array<{ href?: string; rel?: string }> {
    if (typeof document === 'undefined') return [];
    
    const links = Array.from(document.querySelectorAll('link'));
    return links.map(link => ({
      href: link.href || undefined,
      rel: link.rel || undefined,
    }));
  }

  /**
   * Check if user is blocked
   */
  isUserBlocked(userId: string): boolean {
    return this.blockedUsers.has(userId);
  }

  /**
   * Check if user is rate limited for specific operation
   */
  isUserRateLimited(userId: string, operation = 'all'): boolean {
    const limit = this.rateLimits.get(userId);
    if (!limit) return false;
    
    if (Date.now() > limit.until) {
      this.rateLimits.delete(userId);
      return false;
    }
    
    return limit.operations.includes('all') || limit.operations.includes(operation);
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): SecurityIncident[] {
    return Array.from(this.incidents.values()).filter(
      incident => incident.status !== 'resolved' && incident.status !== 'closed'
    );
  }

  /**
   * Resolve incident
   */
  resolveIncident(incidentId: string, resolution: string): void {
    const incident = this.incidents.get(incidentId);
    if (incident) {
      incident.status = 'resolved';
      incident.resolvedAt = Date.now();
      incident.updatedAt = Date.now();
      incident.forensicData.resolution = resolution;

      securityMonitor.logEvent({
        type: 'incident_resolved',
        details: {
          incidentId,
          resolution,
          duration: incident.resolvedAt - incident.createdAt,
        },
        severity: 'low',
      });

      this.saveState();
    }
  }

  /**
   * Trigger alert for incident
   */
  private triggerAlert(incident: SecurityIncident): void {
    securityMonitor.logEvent({
      type: 'alert_triggered',
      details: {
        incidentId: incident.id,
        severity: incident.severity,
        title: incident.title,
      },
      severity: incident.severity,
    });

    this.alertCallbacks.forEach(callback => {
      try {
        callback(incident);
      } catch (error) {
        console.error('Alert callback failed:', error);
      }
    });
  }

  /**
   * Setup event listening
   */
  private setupEventListening(): void {
    // Event listening integration would be implemented here
    // For now, we'll rely on manual calls to processSecurityEvent
  }

  /**
   * Load state from storage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem('paper-crate-incidents');
      if (stored) {
        const data = JSON.parse(stored);
        if (data.incidents) {
          data.incidents.forEach((incident: SecurityIncident) => {
            this.incidents.set(incident.id, incident);
          });
        }
        if (data.blockedUsers) {
          this.blockedUsers = new Set(data.blockedUsers);
        }
        if (data.rateLimits) {
          this.rateLimits = new Map(data.rateLimits);
        }
      }
    } catch (error) {
      console.error('Failed to load incident state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    try {
      const data = {
        incidents: Array.from(this.incidents.values()),
        blockedUsers: Array.from(this.blockedUsers),
        rateLimits: Array.from(this.rateLimits.entries()),
      };
      localStorage.setItem('paper-crate-incidents', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save incident state:', error);
    }
  }

  /**
   * Export incidents for analysis
   */
  exportIncidents(): string {
    return JSON.stringify(Array.from(this.incidents.values()), null, 2);
  }

  /**
   * Clear all incidents and state
   */
  clearAll(): void {
    this.incidents.clear();
    this.blockedUsers.clear();
    this.rateLimits.clear();
    this.saveState();
  }
}

// Export singleton instance
export const incidentResponseManager = new IncidentResponseManager();

// Hook for incident response
export function useIncidentResponse() {
  const processEvent = (event: SecurityEvent) => {
    incidentResponseManager.processSecurityEvent(event);
  };

  const getActiveIncidents = () => {
    return incidentResponseManager.getActiveIncidents();
  };

  const isUserBlocked = (userId: string) => {
    return incidentResponseManager.isUserBlocked(userId);
  };

  const isUserRateLimited = (userId: string, operation?: string) => {
    return incidentResponseManager.isUserRateLimited(userId, operation);
  };

  const resolveIncident = (incidentId: string, resolution: string) => {
    incidentResponseManager.resolveIncident(incidentId, resolution);
  };

  const onAlert = (callback: (incident: SecurityIncident) => void) => {
    incidentResponseManager.onAlert(callback);
  };

  return {
    processEvent,
    getActiveIncidents,
    isUserBlocked,
    isUserRateLimited,
    resolveIncident,
    onAlert,
  };
}