/**
 * Automated threat detection and analysis system
 */
import { securityMonitor, type SecurityEvent } from './monitoring';
import { incidentResponseManager } from './incident-response';
import { metricsCollector } from './metrics';
import { forensicLogger } from './forensics';

export type ThreatType = 
  | 'brute_force'
  | 'data_exfiltration'
  | 'injection_attack'
  | 'anomalous_behavior'
  | 'credential_stuffing'
  | 'account_takeover'
  | 'privilege_escalation'
  | 'malware'
  | 'phishing'
  | 'dos_attack'
  | 'insider_threat'
  | 'social_engineering';

export interface ThreatDetectionRule {
  id: string;
  name: string;
  description: string;
  threatType: ThreatType;
  enabled: boolean;
  confidence: number; // 0-100
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: ThreatCondition[];
  timeWindow: number; // milliseconds
  threshold: number;
  actions: ThreatAction[];
}

export interface ThreatCondition {
  eventType?: string;
  userId?: string;
  pattern?: string; // regex pattern
  field?: string; // event detail field
  operator: 'equals' | 'contains' | 'greaterThan' | 'lessThan' | 'regex' | 'exists';
  value: unknown;
}

export interface ThreatAction {
  type: 'log' | 'alert' | 'block' | 'investigate' | 'collect_evidence' | 'escalate';
  config: Record<string, unknown>;
}

export interface DetectedThreat {
  id: string;
  ruleId: string;
  threatType: ThreatType;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  detectedAt: number;
  events: SecurityEvent[];
  evidence: string[];
  status: 'active' | 'investigating' | 'mitigated' | 'false_positive';
  riskScore: number;
  mitigationSteps: string[];
  lastActivity: number;
}

export interface BehaviorBaseline {
  userId: string;
  avgLoginTime: number[];
  commonLocations: string[];
  avgSessionDuration: number;
  commonEventTypes: string[];
  typicalPaymentAmounts: number[];
  lastUpdated: number;
}

export interface AnomalyDetection {
  type: 'statistical' | 'machine_learning' | 'rule_based';
  algorithm: string;
  parameters: Record<string, unknown>;
  sensitivity: number; // 0-100
}

/**
 * Default threat detection rules
 */
export const DEFAULT_THREAT_RULES: ThreatDetectionRule[] = [
  {
    id: 'brute-force-login',
    name: 'Brute Force Login Attempt',
    description: 'Multiple failed login attempts from same user/IP',
    threatType: 'brute_force',
    enabled: true,
    confidence: 85,
    severity: 'high',
    conditions: [
      {
        eventType: 'auth_failed',
        operator: 'exists',
        value: true,
      }
    ],
    timeWindow: 300000, // 5 minutes
    threshold: 5,
    actions: [
      { type: 'alert', config: { immediate: true } },
      { type: 'block', config: { duration: 1800000 } }, // 30 minutes
      { type: 'collect_evidence', config: { type: 'full_context' } }
    ],
  },
  {
    id: 'payment-fraud',
    name: 'Payment Fraud Pattern',
    description: 'Suspicious payment patterns indicating fraud',
    threatType: 'anomalous_behavior',
    enabled: true,
    confidence: 75,
    severity: 'high',
    conditions: [
      {
        eventType: 'payment_failed',
        operator: 'exists',
        value: true,
      },
      {
        field: 'amount',
        operator: 'greaterThan',
        value: 1000000, // Large amounts in satoshis
      }
    ],
    timeWindow: 600000, // 10 minutes
    threshold: 3,
    actions: [
      { type: 'alert', config: { priority: 'high' } },
      { type: 'investigate', config: { auto: true } },
      { type: 'collect_evidence', config: { type: 'payment_history' } }
    ],
  },
  {
    id: 'data-exfiltration',
    name: 'Data Exfiltration Attempt',
    description: 'Unusual data export or access patterns',
    threatType: 'data_exfiltration',
    enabled: true,
    confidence: 80,
    severity: 'critical',
    conditions: [
      {
        eventType: 'data_export',
        operator: 'exists',
        value: true,
      }
    ],
    timeWindow: 3600000, // 1 hour
    threshold: 3,
    actions: [
      { type: 'alert', config: { immediate: true, priority: 'critical' } },
      { type: 'block', config: { operations: ['export'], duration: 7200000 } },
      { type: 'collect_evidence', config: { type: 'data_access_pattern' } },
      { type: 'escalate', config: { level: 'security_team' } }
    ],
  },
  {
    id: 'csp-injection',
    name: 'Content Security Policy Violation',
    description: 'Potential XSS or injection attempt detected',
    threatType: 'injection_attack',
    enabled: true,
    confidence: 70,
    severity: 'medium',
    conditions: [
      {
        eventType: 'csp_violation',
        operator: 'exists',
        value: true,
      }
    ],
    timeWindow: 60000, // 1 minute
    threshold: 2,
    actions: [
      { type: 'log', config: { level: 'warning' } },
      { type: 'collect_evidence', config: { type: 'dom_snapshot' } },
      { type: 'investigate', config: { auto: false } }
    ],
  },
  {
    id: 'privilege-escalation',
    name: 'Privilege Escalation Attempt',
    description: 'User attempting unauthorized privilege escalation',
    threatType: 'privilege_escalation',
    enabled: true,
    confidence: 90,
    severity: 'high',
    conditions: [
      {
        eventType: 'permission_denied',
        operator: 'exists',
        value: true,
      }
    ],
    timeWindow: 300000, // 5 minutes
    threshold: 3,
    actions: [
      { type: 'alert', config: { priority: 'high' } },
      { type: 'investigate', config: { auto: true } },
      { type: 'collect_evidence', config: { type: 'user_session' } }
    ],
  },
  {
    id: 'anomalous-user-behavior',
    name: 'Anomalous User Behavior',
    description: 'User behavior significantly different from baseline',
    threatType: 'anomalous_behavior',
    enabled: true,
    confidence: 60,
    severity: 'medium',
    conditions: [
      {
        operator: 'exists',
        value: true,
      }
    ],
    timeWindow: 1800000, // 30 minutes
    threshold: 1, // Handled by ML algorithm
    actions: [
      { type: 'log', config: { level: 'info' } },
      { type: 'investigate', config: { auto: false } }
    ],
  }
];

/**
 * Threat Detection Engine
 */
export class ThreatDetectionEngine {
  private rules: ThreatDetectionRule[];
  private detectedThreats = new Map<string, DetectedThreat>();
  private behaviorBaselines = new Map<string, BehaviorBaseline>();
  private eventBuffer: SecurityEvent[] = [];
  private maxBufferSize = 10000;
  
  constructor(customRules?: ThreatDetectionRule[]) {
    this.rules = customRules || DEFAULT_THREAT_RULES;
    this.loadState();
    this.setupEventProcessing();
    
    // Cleanup old threats periodically
    setInterval(() => this.cleanupOldThreats(), 3600000); // Every hour
  }

  /**
   * Setup event processing
   */
  private setupEventProcessing(): void {
    // Event processing integration would be implemented here
    setInterval(() => {
      this.processBufferedEvents();
    }, 10000); // Process every 10 seconds
  }

  /**
   * Process security event for threat detection
   */
  processSecurityEvent(event: SecurityEvent): void {
    // Add to buffer
    this.eventBuffer.push(event);
    
    // Maintain buffer size
    if (this.eventBuffer.length > this.maxBufferSize) {
      this.eventBuffer = this.eventBuffer.slice(-this.maxBufferSize);
    }

    // Update behavior baselines
    this.updateBehaviorBaseline(event);

    // Check against rules
    this.checkThreatRules(event);

    // Check for anomalies
    this.checkBehaviorAnomalies(event);

    // Check threat intelligence
    const threatMatches = metricsCollector.checkThreatIntelligence(event);
    if (threatMatches.length > 0) {
      this.handleThreatIntelligenceMatch(event, threatMatches);
    }
  }

  /**
   * Process buffered events for pattern analysis
   */
  private processBufferedEvents(): void {
    if (this.eventBuffer.length === 0) return;

    // Look for complex patterns across multiple events
    this.detectComplexPatterns();
    
    // Perform statistical analysis
    this.performStatisticalAnalysis();
    
    // Update machine learning models (if implemented)
    this.updateMLModels();
  }

  /**
   * Check event against threat detection rules
   */
  private checkThreatRules(event: SecurityEvent): void {
    for (const rule of this.rules) {
      if (!rule.enabled) continue;

      if (this.evaluateRule(rule, event)) {
        this.createThreat(rule, [event]);
      }
    }
  }

  /**
   * Evaluate if rule matches event
   */
  private evaluateRule(rule: ThreatDetectionRule, event: SecurityEvent): boolean {
    // Get recent events matching rule conditions
    const matchingEvents = this.getMatchingEvents(rule, event);
    
    if (matchingEvents.length >= rule.threshold) {
      return true;
    }

    return false;
  }

  /**
   * Get events matching rule conditions
   */
  private getMatchingEvents(rule: ThreatDetectionRule, triggerEvent: SecurityEvent): SecurityEvent[] {
    const cutoff = triggerEvent.timestamp - rule.timeWindow;
    const events = this.eventBuffer.filter(e => e.timestamp >= cutoff);

    return events.filter(event => {
      return rule.conditions.every(condition => this.evaluateCondition(condition, event));
    });
  }

  /**
   * Evaluate individual condition
   */
  private evaluateCondition(condition: ThreatCondition, event: SecurityEvent): boolean {
    let value: unknown;

    // Get value to compare
    if (condition.eventType) {
      value = event.type;
    } else if (condition.userId) {
      value = event.userId;
    } else if (condition.field) {
      value = this.getNestedValue(event.details, condition.field);
    } else {
      value = event;
    }

    // Apply operator
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
      
      case 'exists':
        return value !== undefined && value !== null;
      
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
   * Create detected threat
   */
  private createThreat(rule: ThreatDetectionRule, events: SecurityEvent[]): void {
    const threatId = `threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const riskScore = this.calculateRiskScore(rule, events);
    
    const threat: DetectedThreat = {
      id: threatId,
      ruleId: rule.id,
      threatType: rule.threatType,
      title: rule.name,
      description: rule.description,
      severity: rule.severity,
      confidence: rule.confidence,
      detectedAt: Date.now(),
      events,
      evidence: [],
      status: 'active',
      riskScore,
      mitigationSteps: this.generateMitigationSteps(rule),
      lastActivity: Date.now(),
    };

    this.detectedThreats.set(threatId, threat);

    // Execute threat actions
    this.executeThreatActions(threat, rule.actions);

    // Log threat detection
    securityMonitor.logEvent({
      type: 'threat_detected',
      userId: events[0]?.userId,
      details: {
        threatId,
        threatType: rule.threatType,
        severity: rule.severity,
        confidence: rule.confidence,
        riskScore,
      },
      severity: 'high',
    });

    this.saveState();
  }

  /**
   * Calculate risk score for threat
   */
  private calculateRiskScore(rule: ThreatDetectionRule, events: SecurityEvent[]): number {
    let score = 0;

    // Base score from rule severity
    const severityScores = { low: 20, medium: 40, high: 70, critical: 90 };
    score += severityScores[rule.severity];

    // Adjust for confidence
    score *= (rule.confidence / 100);

    // Adjust for event count
    score += Math.min(events.length * 5, 30);

    // Adjust for event severity
    const avgEventSeverity = events.reduce((sum, event) => {
      const eventScores = { low: 1, medium: 2, high: 3, critical: 4 };
      return sum + eventScores[event.severity];
    }, 0) / events.length;
    
    score += avgEventSeverity * 5;

    return Math.min(Math.round(score), 100);
  }

  /**
   * Generate mitigation steps
   */
  private generateMitigationSteps(rule: ThreatDetectionRule): string[] {
    const steps: string[] = [];

    switch (rule.threatType) {
      case 'brute_force':
        steps.push('Block or rate limit the attacking IP/user');
        steps.push('Force password reset for targeted accounts');
        steps.push('Enable additional authentication factors');
        break;

      case 'data_exfiltration':
        steps.push('Block data export operations immediately');
        steps.push('Review user access permissions');
        steps.push('Investigate user activity logs');
        steps.push('Notify data protection officer');
        break;

      case 'injection_attack':
        steps.push('Sanitize and validate all user inputs');
        steps.push('Review and strengthen CSP policies');
        steps.push('Check for vulnerable dependencies');
        break;

      case 'privilege_escalation':
        steps.push('Review user role assignments');
        steps.push('Audit permission changes');
        steps.push('Implement principle of least privilege');
        break;

      default:
        steps.push('Investigate the security incident');
        steps.push('Review system logs and evidence');
        steps.push('Apply appropriate security measures');
    }

    return steps;
  }

  /**
   * Execute threat actions
   */
  private async executeThreatActions(threat: DetectedThreat, actions: ThreatAction[]): Promise<void> {
    for (const action of actions) {
      try {
        await this.executeThreatAction(threat, action);
      } catch (error) {
        console.error(`Failed to execute threat action ${action.type}:`, error);
      }
    }
  }

  /**
   * Execute individual threat action
   */
  private async executeThreatAction(threat: DetectedThreat, action: ThreatAction): Promise<void> {
    switch (action.type) {
      case 'log':
        console.warn(`[THREAT DETECTED] ${threat.title}`, threat);
        break;

      case 'alert':
        // Would integrate with alerting system
        break;

      case 'block':
        // Would integrate with incident response system
        if (threat.events[0]?.userId) {
          incidentResponseManager.processSecurityEvent({
            type: 'threat_detected',
            timestamp: Date.now(),
            userId: threat.events[0].userId,
            details: { threatId: threat.id, action: 'block' },
            severity: 'high',
          });
        }
        break;

      case 'investigate':
        threat.status = 'investigating';
        break;

      case 'collect_evidence': {
        const evidenceType = action.config.type as string || 'security_events';
        const evidenceId = forensicLogger.collectEvidence(
          evidenceType as 'user_session' | 'network_activity' | 'dom_snapshot' | 'storage_snapshot' | 'performance_metrics' | 'security_events' | 'console_logs' | 'error_logs' | 'api_requests' | 'user_interactions',
          'automatic',
          {
            threatId: threat.id,
            threatType: threat.threatType,
            events: threat.events.map(e => ({ type: e.type, timestamp: e.timestamp })),
          },
          undefined,
          threat.id
        );
        threat.evidence.push(evidenceId);
        break;
      }

      case 'escalate':
        threat.severity = 'critical';
        break;
    }
  }

  /**
   * Update behavior baseline for user
   */
  private updateBehaviorBaseline(event: SecurityEvent): void {
    if (!event.userId) return;

    let baseline = this.behaviorBaselines.get(event.userId);
    
    if (!baseline) {
      baseline = {
        userId: event.userId,
        avgLoginTime: [],
        commonLocations: [],
        avgSessionDuration: 0,
        commonEventTypes: [],
        typicalPaymentAmounts: [],
        lastUpdated: Date.now(),
      };
    }

    // Update event types
    if (!baseline.commonEventTypes.includes(event.type)) {
      baseline.commonEventTypes.push(event.type);
    }

    // Update payment amounts if applicable
    if (event.type.includes('payment') && event.details.amount) {
      const amount = event.details.amount as number;
      baseline.typicalPaymentAmounts.push(amount);
      
      // Keep only recent amounts
      baseline.typicalPaymentAmounts = baseline.typicalPaymentAmounts.slice(-50);
    }

    baseline.lastUpdated = Date.now();
    this.behaviorBaselines.set(event.userId, baseline);
  }

  /**
   * Check for behavior anomalies
   */
  private checkBehaviorAnomalies(event: SecurityEvent): void {
    if (!event.userId) return;

    const baseline = this.behaviorBaselines.get(event.userId);
    if (!baseline) return;

    const anomalies: string[] = [];

    // Check for unusual event types
    if (!baseline.commonEventTypes.includes(event.type)) {
      anomalies.push('unusual_event_type');
    }

    // Check for unusual payment amounts
    if (event.type.includes('payment') && event.details.amount) {
      const amount = event.details.amount as number;
      if (baseline.typicalPaymentAmounts.length > 10) {
        const avg = baseline.typicalPaymentAmounts.reduce((a, b) => a + b, 0) / baseline.typicalPaymentAmounts.length;
        const stdDev = Math.sqrt(
          baseline.typicalPaymentAmounts.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / baseline.typicalPaymentAmounts.length
        );
        
        if (Math.abs(amount - avg) > stdDev * 3) {
          anomalies.push('unusual_payment_amount');
        }
      }
    }

    // If anomalies detected, create threat
    if (anomalies.length > 0) {
      const anomalyRule: ThreatDetectionRule = {
        id: 'behavior-anomaly',
        name: 'Behavior Anomaly Detected',
        description: `Anomalous behavior detected: ${anomalies.join(', ')}`,
        threatType: 'anomalous_behavior',
        enabled: true,
        confidence: 60,
        severity: 'medium',
        conditions: [],
        timeWindow: 0,
        threshold: 1,
        actions: [
          { type: 'log', config: {} },
          { type: 'investigate', config: { auto: false } }
        ],
      };

      this.createThreat(anomalyRule, [event]);
    }
  }

  /**
   * Handle threat intelligence matches
   */
  private handleThreatIntelligenceMatch(event: SecurityEvent, matches: Array<{ description: string; value: string; severity: string; confidence: number }>): void {
    for (const match of matches) {
      const threatId = `ti-threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      const threat: DetectedThreat = {
        id: threatId,
        ruleId: 'threat-intelligence',
        threatType: 'malware', // Default type for TI matches
        title: `Threat Intelligence Match: ${match.description}`,
        description: `Event matched threat intelligence: ${match.value}`,
        severity: match.severity as 'low' | 'medium' | 'high' | 'critical',
        confidence: match.confidence,
        detectedAt: Date.now(),
        events: [event],
        evidence: [],
        status: 'active',
        riskScore: match.confidence,
        mitigationSteps: ['Investigate threat intelligence match', 'Review event context'],
        lastActivity: Date.now(),
      };

      this.detectedThreats.set(threatId, threat);

      securityMonitor.logEvent({
        type: 'threat_detected',
        userId: event.userId,
        details: {
          threatId,
          source: 'threat_intelligence',
          matchedIndicator: match.value,
        },
        severity: 'medium',
      });
    }
  }

  /**
   * Detect complex patterns across multiple events
   */
  private detectComplexPatterns(): void {
    // Example: Detect login -> privilege escalation -> data export pattern
    const recentEvents = this.eventBuffer.slice(-100); // Last 100 events
    
    // Group events by user
    const userEvents = new Map<string, SecurityEvent[]>();
    recentEvents.forEach(event => {
      if (event.userId) {
        if (!userEvents.has(event.userId)) {
          userEvents.set(event.userId, []);
        }
        userEvents.get(event.userId)!.push(event);
      }
    });

    // Check for suspicious patterns
    for (const [userId, events] of userEvents) {
      const pattern = this.analyzeEventPattern(events);
      if (pattern.suspicious) {
        this.createPatternThreat(userId, events, pattern);
      }
    }
  }

  /**
   * Analyze event pattern for suspicious activity
   */
  private analyzeEventPattern(events: SecurityEvent[]): { suspicious: boolean; patterns: string[] } {
    const patterns: string[] = [];
    const eventTypes = events.map(e => e.type);

    // Check for attack chain patterns
    if (eventTypes.includes('auth_success') && 
        eventTypes.includes('permission_denied') && 
        eventTypes.includes('data_export')) {
      patterns.push('potential_insider_threat');
    }

    if (eventTypes.filter(t => t === 'payment_failed').length > 3 &&
        eventTypes.includes('payment_success')) {
      patterns.push('payment_fraud_pattern');
    }

    return {
      suspicious: patterns.length > 0,
      patterns,
    };
  }

  /**
   * Create threat from pattern analysis
   */
  private createPatternThreat(userId: string, events: SecurityEvent[], pattern: { patterns: string[] }): void {
    const threatId = `pattern-threat-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const threat: DetectedThreat = {
      id: threatId,
      ruleId: 'pattern-analysis',
      threatType: 'anomalous_behavior',
      title: `Suspicious Pattern Detected`,
      description: `Detected patterns: ${pattern.patterns.join(', ')}`,
      severity: 'medium',
      confidence: 70,
      detectedAt: Date.now(),
      events,
      evidence: [],
      status: 'active',
      riskScore: 60,
      mitigationSteps: ['Investigate user activity', 'Review event sequence'],
      lastActivity: Date.now(),
    };

    this.detectedThreats.set(threatId, threat);

    securityMonitor.logEvent({
      type: 'threat_detected',
      userId,
      details: {
        threatId,
        source: 'pattern_analysis',
        patterns: pattern.patterns,
      },
      severity: 'medium',
    });
  }

  /**
   * Perform statistical analysis
   */
  private performStatisticalAnalysis(): void {
    // Simple statistical anomaly detection
    const recentEvents = this.eventBuffer.slice(-1000);
    
    // Check for event frequency anomalies
    const eventCounts = new Map<string, number>();
    recentEvents.forEach(event => {
      eventCounts.set(event.type, (eventCounts.get(event.type) || 0) + 1);
    });

    // Calculate z-scores for event frequencies
    const counts = Array.from(eventCounts.values());
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const stdDev = Math.sqrt(counts.reduce((sum, count) => sum + Math.pow(count - mean, 2), 0) / counts.length);

    eventCounts.forEach((count, eventType) => {
      const zScore = (count - mean) / stdDev;
      if (Math.abs(zScore) > 2) { // Significant deviation
        this.createStatisticalAnomaly(eventType, count, zScore);
      }
    });
  }

  /**
   * Create statistical anomaly threat
   */
  private createStatisticalAnomaly(eventType: string, count: number, zScore: number): void {
    const threatId = `stat-anomaly-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const threat: DetectedThreat = {
      id: threatId,
      ruleId: 'statistical-analysis',
      threatType: 'anomalous_behavior',
      title: `Statistical Anomaly: ${eventType}`,
      description: `Unusual frequency of ${eventType} events (z-score: ${zScore.toFixed(2)})`,
      severity: Math.abs(zScore) > 3 ? 'high' : 'medium',
      confidence: Math.min(Math.abs(zScore) * 20, 90),
      detectedAt: Date.now(),
      events: this.eventBuffer.filter(e => e.type === eventType).slice(-10),
      evidence: [],
      status: 'active',
      riskScore: Math.min(Math.abs(zScore) * 15, 80),
      mitigationSteps: ['Investigate event frequency spike', 'Check for system issues'],
      lastActivity: Date.now(),
    };

    this.detectedThreats.set(threatId, threat);
  }

  /**
   * Update ML models (placeholder)
   */
  private updateMLModels(): void {
    // Machine learning model updates would be implemented here
    // with recent event data for improved threat detection
  }

  /**
   * Get active threats
   */
  getActiveThreats(): DetectedThreat[] {
    return Array.from(this.detectedThreats.values()).filter(
      threat => threat.status === 'active' || threat.status === 'investigating'
    );
  }

  /**
   * Get threat by ID
   */
  getThreat(threatId: string): DetectedThreat | undefined {
    return this.detectedThreats.get(threatId);
  }

  /**
   * Mitigate threat
   */
  mitigateThreat(threatId: string, mitigation: string): void {
    const threat = this.detectedThreats.get(threatId);
    if (threat) {
      threat.status = 'mitigated';
      threat.lastActivity = Date.now();
      
      securityMonitor.logEvent({
        type: 'threat_detected',
        details: {
          threatId,
          action: 'mitigated',
          mitigation,
        },
        severity: 'low',
      });

      this.saveState();
    }
  }

  /**
   * Mark threat as false positive
   */
  markFalsePositive(threatId: string, reason: string): void {
    const threat = this.detectedThreats.get(threatId);
    if (threat) {
      threat.status = 'false_positive';
      threat.lastActivity = Date.now();
      
      securityMonitor.logEvent({
        type: 'threat_detected',
        details: {
          threatId,
          action: 'false_positive',
          reason,
        },
        severity: 'low',
      });

      this.saveState();
    }
  }

  /**
   * Cleanup old threats
   */
  private cleanupOldThreats(): void {
    const cutoff = Date.now() - 2592000000; // 30 days
    const threatsToRemove: string[] = [];

    for (const [id, threat] of this.detectedThreats) {
      if (threat.lastActivity < cutoff && 
          (threat.status === 'mitigated' || threat.status === 'false_positive')) {
        threatsToRemove.push(id);
      }
    }

    threatsToRemove.forEach(id => this.detectedThreats.delete(id));
    
    if (threatsToRemove.length > 0) {
      this.saveState();
    }
  }

  /**
   * Load state from storage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem('paper-crate-threats');
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.threats) {
          data.threats.forEach((threat: DetectedThreat) => {
            this.detectedThreats.set(threat.id, threat);
          });
        }
        
        if (data.baselines) {
          data.baselines.forEach((baseline: BehaviorBaseline) => {
            this.behaviorBaselines.set(baseline.userId, baseline);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load threat detection state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    try {
      const data = {
        threats: Array.from(this.detectedThreats.values()),
        baselines: Array.from(this.behaviorBaselines.values()),
      };
      localStorage.setItem('paper-crate-threats', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save threat detection state:', error);
    }
  }

  /**
   * Export threats for analysis
   */
  exportThreats(): string {
    return JSON.stringify(Array.from(this.detectedThreats.values()), null, 2);
  }

  /**
   * Clear all threats
   */
  clearAllThreats(): void {
    this.detectedThreats.clear();
    this.saveState();
  }
}

// Export singleton instance
export const threatDetectionEngine = new ThreatDetectionEngine();

// Hook for threat detection
export function useThreatDetection() {
  const processEvent = (event: SecurityEvent) => {
    threatDetectionEngine.processSecurityEvent(event);
  };

  const getActiveThreats = () => {
    return threatDetectionEngine.getActiveThreats();
  };

  const getThreat = (threatId: string) => {
    return threatDetectionEngine.getThreat(threatId);
  };

  const mitigateThreat = (threatId: string, mitigation: string) => {
    threatDetectionEngine.mitigateThreat(threatId, mitigation);
  };

  const markFalsePositive = (threatId: string, reason: string) => {
    threatDetectionEngine.markFalsePositive(threatId, reason);
  };

  return {
    processEvent,
    getActiveThreats,
    getThreat,
    mitigateThreat,
    markFalsePositive,
  };
}