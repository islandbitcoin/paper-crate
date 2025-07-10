/**
 * Forensic logging and digital evidence collection
 */
import { securityMonitor, type SecurityEvent } from './monitoring';
import { type SecurityIncident } from './incident-response';

export type EvidenceType = 
  | 'user_session'
  | 'network_activity' 
  | 'dom_snapshot'
  | 'storage_snapshot'
  | 'performance_metrics'
  | 'security_events'
  | 'console_logs'
  | 'error_logs'
  | 'api_requests'
  | 'user_interactions';

export interface ForensicEvidence {
  id: string;
  type: EvidenceType;
  timestamp: number;
  triggeredBy: 'manual' | 'automatic' | 'incident' | 'alert';
  relatedEventId?: string;
  relatedIncidentId?: string;
  userId?: string;
  sessionId?: string;
  data: Record<string, unknown>;
  integrity: string; // Hash for integrity verification
  retained: boolean;
  retentionExpiry?: number;
}

export interface ForensicSession {
  id: string;
  userId?: string;
  startTime: number;
  endTime?: number;
  userAgent: string;
  ipAddress?: string;
  events: SecurityEvent[];
  evidence: ForensicEvidence[];
  suspicious: boolean;
  risk_score: number;
}

export interface ForensicQuery {
  type?: EvidenceType;
  userId?: string;
  sessionId?: string;
  timeRange?: {
    start: number;
    end: number;
  };
  eventTypes?: string[];
  suspicious?: boolean;
  limit?: number;
}

/**
 * Forensic Logger
 */
export class ForensicLogger {
  private evidence = new Map<string, ForensicEvidence>();
  private sessions = new Map<string, ForensicSession>();
  private currentSession?: ForensicSession;
  private retentionPolicies = new Map<EvidenceType, number>();
  private autoCollectionEnabled = true;

  constructor() {
    this.setupRetentionPolicies();
    this.startSession();
    this.setupAutoCollection();
    this.loadState();
    
    // Cleanup old evidence periodically
    setInterval(() => this.cleanupExpiredEvidence(), 3600000); // Every hour
  }

  /**
   * Setup evidence retention policies
   */
  private setupRetentionPolicies(): void {
    // Retention periods in milliseconds
    this.retentionPolicies.set('user_session', 86400000 * 30); // 30 days
    this.retentionPolicies.set('security_events', 86400000 * 90); // 90 days
    this.retentionPolicies.set('network_activity', 86400000 * 7); // 7 days
    this.retentionPolicies.set('dom_snapshot', 86400000 * 3); // 3 days
    this.retentionPolicies.set('storage_snapshot', 86400000 * 14); // 14 days
    this.retentionPolicies.set('performance_metrics', 86400000 * 7); // 7 days
    this.retentionPolicies.set('console_logs', 86400000 * 14); // 14 days
    this.retentionPolicies.set('error_logs', 86400000 * 30); // 30 days
    this.retentionPolicies.set('api_requests', 86400000 * 14); // 14 days
    this.retentionPolicies.set('user_interactions', 86400000 * 7); // 7 days
  }

  /**
   * Start new forensic session
   */
  private startSession(): void {
    const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentSession = {
      id: sessionId,
      userId: undefined, // Will be set when user logs in
      startTime: Date.now(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
      ipAddress: undefined, // Would be set from server-side
      events: [],
      evidence: [],
      suspicious: false,
      risk_score: 0,
    };

    this.sessions.set(sessionId, this.currentSession);
    
    // Collect initial session evidence
    this.collectEvidence('user_session', 'automatic', {
      sessionStart: true,
      timestamp: Date.now(),
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      referrer: typeof document !== 'undefined' ? document.referrer : 'unknown',
      screenResolution: typeof screen !== 'undefined' ? `${screen.width}x${screen.height}` : 'unknown',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });

    this.saveState();
  }

  /**
   * End current session
   */
  endSession(): void {
    if (this.currentSession) {
      this.currentSession.endTime = Date.now();
      
      // Collect final session evidence
      this.collectEvidence('user_session', 'automatic', {
        sessionEnd: true,
        duration: this.currentSession.endTime - this.currentSession.startTime,
        eventCount: this.currentSession.events.length,
        evidenceCount: this.currentSession.evidence.length,
        riskScore: this.currentSession.risk_score,
      });

      this.saveState();
      this.currentSession = undefined;
    }
  }

  /**
   * Setup automatic evidence collection
   */
  private setupAutoCollection(): void {
    if (typeof window === 'undefined') return;

    // Collect evidence on page unload
    window.addEventListener('beforeunload', () => {
      this.endSession();
    });

    // Collect evidence on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.collectEvidence('user_interactions', 'automatic', {
          action: 'page_hidden',
          timestamp: Date.now(),
        });
      }
    });

    // Collect evidence on errors
    window.addEventListener('error', (event) => {
      this.collectEvidence('error_logs', 'automatic', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: Date.now(),
      });
    });

    // Collect evidence on unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.collectEvidence('error_logs', 'automatic', {
        reason: event.reason?.toString(),
        stack: event.reason?.stack,
        timestamp: Date.now(),
      });
    });

    // Collect performance metrics periodically
    setInterval(() => {
      if (this.autoCollectionEnabled) {
        this.collectPerformanceMetrics();
      }
    }, 60000); // Every minute
  }

  /**
   * Collect evidence
   */
  collectEvidence(
    type: EvidenceType, 
    triggeredBy: ForensicEvidence['triggeredBy'],
    data: Record<string, unknown>,
    relatedEventId?: string,
    relatedIncidentId?: string
  ): string {
    const evidenceId = `evidence-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    
    // Add metadata to evidence
    const enrichedData = {
      ...data,
      collected_at: timestamp,
      session_id: this.currentSession?.id,
      url: typeof window !== 'undefined' ? window.location.href : 'unknown',
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
    };

    // Calculate integrity hash
    const integrity = this.calculateIntegrity(enrichedData);

    // Determine retention period
    const retentionPeriod = this.retentionPolicies.get(type) || 86400000 * 7; // 7 days default
    
    const evidence: ForensicEvidence = {
      id: evidenceId,
      type,
      timestamp,
      triggeredBy,
      relatedEventId,
      relatedIncidentId,
      userId: this.currentSession?.userId,
      sessionId: this.currentSession?.id,
      data: enrichedData,
      integrity,
      retained: true,
      retentionExpiry: timestamp + retentionPeriod,
    };

    this.evidence.set(evidenceId, evidence);

    // Add to current session
    if (this.currentSession) {
      this.currentSession.evidence.push(evidence);
    }

    // Log evidence collection
    securityMonitor.logEvent({
      type: 'forensic_capture',
      userId: evidence.userId,
      details: {
        evidenceId,
        evidenceType: type,
        triggeredBy,
        dataSize: JSON.stringify(enrichedData).length,
      },
      severity: 'low',
    });

    this.saveState();
    return evidenceId;
  }

  /**
   * Collect DOM snapshot
   */
  collectDOMSnapshot(reason: string): string {
    if (typeof document === 'undefined') return '';

    const snapshot = {
      reason,
      html: document.documentElement.outerHTML.slice(0, 50000), // Limit size
      title: document.title,
      scripts: Array.from(document.querySelectorAll('script')).map(script => ({
        src: script.src,
        inline: !script.src,
        content: script.src ? undefined : script.textContent?.slice(0, 1000),
      })),
      stylesheets: Array.from(document.querySelectorAll('link[rel="stylesheet"]')).map(link => ({
        href: (link as HTMLLinkElement).href,
      })),
      meta: Array.from(document.querySelectorAll('meta')).map(meta => ({
        name: meta.getAttribute('name'),
        content: meta.getAttribute('content'),
        property: meta.getAttribute('property'),
      })),
    };

    return this.collectEvidence('dom_snapshot', 'manual', snapshot);
  }

  /**
   * Collect storage snapshot
   */
  collectStorageSnapshot(reason: string): string {
    const snapshot: Record<string, unknown> = { reason };

    // LocalStorage snapshot
    if (typeof localStorage !== 'undefined') {
      const localStorageData: Record<string, string> = {};
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key) {
            // For privacy, only store key names and data sizes
            const value = localStorage.getItem(key);
            localStorageData[key] = `[${value?.length || 0} characters]`;
          }
        }
        snapshot.localStorage = localStorageData;
      } catch (error) {
        snapshot.localStorageError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // SessionStorage snapshot
    if (typeof sessionStorage !== 'undefined') {
      const sessionStorageData: Record<string, string> = {};
      try {
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key) {
            const value = sessionStorage.getItem(key);
            sessionStorageData[key] = `[${value?.length || 0} characters]`;
          }
        }
        snapshot.sessionStorage = sessionStorageData;
      } catch (error) {
        snapshot.sessionStorageError = error instanceof Error ? error.message : 'Unknown error';
      }
    }

    // Cookies (metadata only)
    if (typeof document !== 'undefined') {
      snapshot.cookies = {
        count: document.cookie.split(';').length,
        hasSecureFlags: document.cookie.includes('Secure'),
        hasHttpOnlyFlags: document.cookie.includes('HttpOnly'),
      };
    }

    return this.collectEvidence('storage_snapshot', 'manual', snapshot);
  }

  /**
   * Collect performance metrics
   */
  collectPerformanceMetrics(): string {
    if (typeof performance === 'undefined') return '';

    interface PerformanceMemory {
      usedJSHeapSize: number;
      totalJSHeapSize: number;
      jsHeapSizeLimit: number;
    }

    interface PerformanceNavigation {
      type: number;
      redirectCount: number;
    }

    const extendedPerformance = performance as Performance & {
      memory?: PerformanceMemory;
      navigation?: PerformanceNavigation;
    };

    const metrics = {
      memory: extendedPerformance.memory ? {
        usedJSHeapSize: extendedPerformance.memory.usedJSHeapSize,
        totalJSHeapSize: extendedPerformance.memory.totalJSHeapSize,
        jsHeapSizeLimit: extendedPerformance.memory.jsHeapSizeLimit,
      } : undefined,
      timing: performance.timing ? {
        navigationStart: performance.timing.navigationStart,
        loadEventEnd: performance.timing.loadEventEnd,
        domContentLoadedEventEnd: performance.timing.domContentLoadedEventEnd,
        responseEnd: performance.timing.responseEnd,
      } : undefined,
      navigation: extendedPerformance.navigation ? {
        type: extendedPerformance.navigation.type,
        redirectCount: extendedPerformance.navigation.redirectCount,
      } : undefined,
    };

    return this.collectEvidence('performance_metrics', 'automatic', metrics);
  }

  /**
   * Collect console logs (if available)
   */
  collectConsoleLogs(): string {
    // Console log capture would be implemented here
    const logs = {
      message: 'Console logs would be captured here',
      timestamp: Date.now(),
    };

    return this.collectEvidence('console_logs', 'manual', logs);
  }

  /**
   * Record security event for forensics
   */
  recordSecurityEvent(event: SecurityEvent): void {
    if (this.currentSession) {
      this.currentSession.events.push(event);
      
      // Update risk score based on event severity
      const severityScores = { low: 1, medium: 3, high: 7, critical: 15 };
      this.currentSession.risk_score += severityScores[event.severity];
      
      // Mark session as suspicious for certain events
      const suspiciousEvents = [
        'suspicious_activity',
        'threat_detected',
        'csp_violation',
        'invalid_invoice',
        'auth_failed',
      ];
      
      if (suspiciousEvents.includes(event.type)) {
        this.currentSession.suspicious = true;
      }
    }

    // Auto-collect evidence for high-severity events
    if (['high', 'critical'].includes(event.severity)) {
      this.collectEvidence('security_events', 'automatic', {
        event_type: event.type,
        event_details: event.details,
        severity: event.severity,
        user_id: event.userId,
      }, event.timestamp.toString());
    }

    this.saveState();
  }

  /**
   * Record incident for forensics
   */
  recordIncident(incident: SecurityIncident): void {
    // Collect comprehensive evidence for incident
    this.collectDOMSnapshot(`Incident: ${incident.title}`);
    this.collectStorageSnapshot(`Incident: ${incident.title}`);
    this.collectPerformanceMetrics();

    // Collect related evidence
    this.collectEvidence('security_events', 'incident', {
      incident_id: incident.id,
      incident_title: incident.title,
      incident_severity: incident.severity,
      incident_events: incident.events.map(e => ({
        type: e.type,
        timestamp: e.timestamp,
        severity: e.severity,
      })),
    }, undefined, incident.id);
  }

  /**
   * Query evidence
   */
  queryEvidence(query: ForensicQuery): ForensicEvidence[] {
    let results = Array.from(this.evidence.values());

    // Apply filters
    if (query.type) {
      results = results.filter(e => e.type === query.type);
    }

    if (query.userId) {
      results = results.filter(e => e.userId === query.userId);
    }

    if (query.sessionId) {
      results = results.filter(e => e.sessionId === query.sessionId);
    }

    if (query.timeRange) {
      results = results.filter(e => 
        e.timestamp >= query.timeRange!.start && 
        e.timestamp <= query.timeRange!.end
      );
    }

    if (query.suspicious !== undefined) {
      const suspiciousSessions = Array.from(this.sessions.values())
        .filter(s => s.suspicious === query.suspicious)
        .map(s => s.id);
      
      results = results.filter(e => 
        e.sessionId && suspiciousSessions.includes(e.sessionId)
      );
    }

    // Sort by timestamp (most recent first)
    results.sort((a, b) => b.timestamp - a.timestamp);

    // Apply limit
    if (query.limit) {
      results = results.slice(0, query.limit);
    }

    return results;
  }

  /**
   * Get evidence by ID
   */
  getEvidence(evidenceId: string): ForensicEvidence | undefined {
    return this.evidence.get(evidenceId);
  }

  /**
   * Get session information
   */
  getSession(sessionId: string): ForensicSession | undefined {
    return this.sessions.get(sessionId);
  }

  /**
   * Get current session
   */
  getCurrentSession(): ForensicSession | undefined {
    return this.currentSession;
  }

  /**
   * Verify evidence integrity
   */
  verifyEvidence(evidenceId: string): boolean {
    const evidence = this.evidence.get(evidenceId);
    if (!evidence) return false;

    const currentHash = this.calculateIntegrity(evidence.data);
    return currentHash === evidence.integrity;
  }

  /**
   * Calculate integrity hash
   */
  private calculateIntegrity(data: Record<string, unknown>): string {
    // Simple hash implementation for demonstration
    // In production, use a proper cryptographic hash
    const str = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Cleanup expired evidence
   */
  private cleanupExpiredEvidence(): void {
    const now = Date.now();
    const expiredEvidence: string[] = [];

    for (const [id, evidence] of this.evidence) {
      if (evidence.retentionExpiry && now > evidence.retentionExpiry) {
        expiredEvidence.push(id);
      }
    }

    expiredEvidence.forEach(id => {
      this.evidence.delete(id);
    });

    if (expiredEvidence.length > 0) {
      securityMonitor.logEvent({
        type: 'forensic_capture',
        details: {
          action: 'cleanup_expired_evidence',
          count: expiredEvidence.length,
        },
        severity: 'low',
      });

      this.saveState();
    }
  }

  /**
   * Set user ID for current session
   */
  setUserId(userId: string): void {
    if (this.currentSession) {
      this.currentSession.userId = userId;
      this.saveState();
    }
  }

  /**
   * Enable/disable auto collection
   */
  setAutoCollection(enabled: boolean): void {
    this.autoCollectionEnabled = enabled;
  }

  /**
   * Load state from storage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem('paper-crate-forensics');
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.evidence) {
          data.evidence.forEach((evidence: ForensicEvidence) => {
            this.evidence.set(evidence.id, evidence);
          });
        }
        
        if (data.sessions) {
          data.sessions.forEach((session: ForensicSession) => {
            this.sessions.set(session.id, session);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load forensic state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    try {
      const data = {
        evidence: Array.from(this.evidence.values()),
        sessions: Array.from(this.sessions.values()),
      };
      localStorage.setItem('paper-crate-forensics', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save forensic state:', error);
    }
  }

  /**
   * Export evidence for analysis
   */
  exportEvidence(query?: ForensicQuery): string {
    const evidence = query ? this.queryEvidence(query) : Array.from(this.evidence.values());
    return JSON.stringify(evidence, null, 2);
  }

  /**
   * Export session data
   */
  exportSessions(): string {
    return JSON.stringify(Array.from(this.sessions.values()), null, 2);
  }

  /**
   * Clear all forensic data
   */
  clearAll(): void {
    this.evidence.clear();
    this.sessions.clear();
    this.currentSession = undefined;
    this.saveState();
    this.startSession();
  }
}

// Export singleton instance
export const forensicLogger = new ForensicLogger();

// Hook for forensic logging
export function useForensics() {
  const collectEvidence = (
    type: EvidenceType,
    data: Record<string, unknown>,
    relatedEventId?: string,
    relatedIncidentId?: string
  ) => {
    return forensicLogger.collectEvidence(type, 'manual', data, relatedEventId, relatedIncidentId);
  };

  const collectDOMSnapshot = (reason: string) => {
    return forensicLogger.collectDOMSnapshot(reason);
  };

  const collectStorageSnapshot = (reason: string) => {
    return forensicLogger.collectStorageSnapshot(reason);
  };

  const queryEvidence = (query: ForensicQuery) => {
    return forensicLogger.queryEvidence(query);
  };

  const getEvidence = (evidenceId: string) => {
    return forensicLogger.getEvidence(evidenceId);
  };

  const verifyEvidence = (evidenceId: string) => {
    return forensicLogger.verifyEvidence(evidenceId);
  };

  const getCurrentSession = () => {
    return forensicLogger.getCurrentSession();
  };

  const setUserId = (userId: string) => {
    forensicLogger.setUserId(userId);
  };

  return {
    collectEvidence,
    collectDOMSnapshot,
    collectStorageSnapshot,
    queryEvidence,
    getEvidence,
    verifyEvidence,
    getCurrentSession,
    setUserId,
  };
}