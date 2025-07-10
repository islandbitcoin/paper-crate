/**
 * Security metrics and reporting system
 */
import { securityMonitor, type SecurityEvent, type SecurityEventType } from './monitoring';

export interface SecurityMetrics {
  timeframe: {
    start: number;
    end: number;
    duration: number;
  };
  events: {
    total: number;
    byType: Record<SecurityEventType, number>;
    bySeverity: Record<string, number>;
    byUser: Record<string, number>;
    trends: {
      hourly: number[];
      daily: number[];
    };
  };
  incidents: {
    total: number;
    open: number;
    resolved: number;
    bySeverity: Record<string, number>;
    averageResponseTime: number;
    averageResolutionTime: number;
  };
  alerts: {
    total: number;
    acknowledged: number;
    dismissed: number;
    byPriority: Record<string, number>;
  };
  threats: {
    detected: number;
    mitigated: number;
    falsePositives: number;
    riskScore: number;
  };
  compliance: {
    violations: number;
    auditFindings: number;
    complianceScore: number;
  };
  performance: {
    securityOverhead: number;
    detectionLatency: number;
    responseLatency: number;
  };
}

export interface ThreatIntelligence {
  id: string;
  type: 'ip' | 'domain' | 'user_pattern' | 'behavior' | 'signature';
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number; // 0-100
  source: string;
  description: string;
  createdAt: number;
  lastSeen?: number;
  active: boolean;
}

export interface SecurityReport {
  id: string;
  type: 'daily' | 'weekly' | 'monthly' | 'incident' | 'compliance';
  title: string;
  summary: string;
  metrics: SecurityMetrics;
  recommendations: string[];
  findings: SecurityFinding[];
  generatedAt: number;
  period: {
    start: number;
    end: number;
  };
}

export interface SecurityFinding {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'vulnerability' | 'misconfiguration' | 'threat' | 'compliance' | 'performance';
  evidence: string[];
  recommendations: string[];
  impact: string;
  likelihood: 'low' | 'medium' | 'high';
  risk: number; // calculated from severity + likelihood
}

/**
 * Security Metrics Collector
 */
export class SecurityMetricsCollector {
  private threatIntelligence = new Map<string, ThreatIntelligence>();
  private reports = new Map<string, SecurityReport>();
  private knownIPs = new Set<string>();
  private userBehaviorBaselines = new Map<string, UserBehaviorBaseline>();

  constructor() {
    this.loadState();
    this.setupThreatIntelligence();
    
    // Generate reports periodically
    setInterval(() => this.generateScheduledReports(), 86400000); // Daily
  }

  /**
   * Calculate comprehensive security metrics
   */
  calculateMetrics(timeframe: { start: number; end: number }): SecurityMetrics {
    const events = securityMonitor.getRecentEvents(undefined, undefined, timeframe.end - timeframe.start);
    const filteredEvents = events.filter(e => e.timestamp >= timeframe.start && e.timestamp <= timeframe.end);

    // Event metrics
    const eventsByType: Record<SecurityEventType, number> = {} as Record<SecurityEventType, number>;
    const eventsBySeverity: Record<string, number> = {};
    const eventsByUser: Record<string, number> = {};

    filteredEvents.forEach(event => {
      // By type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      
      // By severity
      eventsBySeverity[event.severity] = (eventsBySeverity[event.severity] || 0) + 1;
      
      // By user
      if (event.userId) {
        eventsByUser[event.userId] = (eventsByUser[event.userId] || 0) + 1;
      }
    });

    // Calculate trends
    const hourlyTrends = this.calculateHourlyTrends(filteredEvents, timeframe);
    const dailyTrends = this.calculateDailyTrends(filteredEvents, timeframe);

    // Incident metrics (would be calculated from incident manager)
    const incidentMetrics = this.calculateIncidentMetrics(timeframe);

    // Alert metrics (would be calculated from alert manager)
    const alertMetrics = this.calculateAlertMetrics(timeframe);

    // Threat metrics
    const threatMetrics = this.calculateThreatMetrics(filteredEvents);

    // Compliance metrics
    const complianceMetrics = this.calculateComplianceMetrics(filteredEvents);

    // Performance metrics
    const performanceMetrics = this.calculatePerformanceMetrics();

    return {
      timeframe: {
        start: timeframe.start,
        end: timeframe.end,
        duration: timeframe.end - timeframe.start,
      },
      events: {
        total: filteredEvents.length,
        byType: eventsByType,
        bySeverity: eventsBySeverity,
        byUser: eventsByUser,
        trends: {
          hourly: hourlyTrends,
          daily: dailyTrends,
        },
      },
      incidents: incidentMetrics,
      alerts: alertMetrics,
      threats: threatMetrics,
      compliance: complianceMetrics,
      performance: performanceMetrics,
    };
  }

  /**
   * Calculate hourly trends
   */
  private calculateHourlyTrends(events: SecurityEvent[], timeframe: { start: number; end: number }): number[] {
    const hours = Math.ceil((timeframe.end - timeframe.start) / 3600000);
    const trends = new Array(Math.min(hours, 24)).fill(0);

    events.forEach(event => {
      const hourIndex = Math.floor((event.timestamp - timeframe.start) / 3600000);
      if (hourIndex >= 0 && hourIndex < trends.length) {
        trends[hourIndex]++;
      }
    });

    return trends;
  }

  /**
   * Calculate daily trends
   */
  private calculateDailyTrends(events: SecurityEvent[], timeframe: { start: number; end: number }): number[] {
    const days = Math.ceil((timeframe.end - timeframe.start) / 86400000);
    const trends = new Array(Math.min(days, 30)).fill(0);

    events.forEach(event => {
      const dayIndex = Math.floor((event.timestamp - timeframe.start) / 86400000);
      if (dayIndex >= 0 && dayIndex < trends.length) {
        trends[dayIndex]++;
      }
    });

    return trends;
  }

  /**
   * Calculate incident metrics
   */
  private calculateIncidentMetrics(_timeframe: { start: number; end: number }) {
    // Incident metrics integration would be implemented here
    return {
      total: 0,
      open: 0,
      resolved: 0,
      bySeverity: {},
      averageResponseTime: 0,
      averageResolutionTime: 0,
    };
  }

  /**
   * Calculate alert metrics
   */
  private calculateAlertMetrics(_timeframe: { start: number; end: number }) {
    // Alert metrics integration would be implemented here
    return {
      total: 0,
      acknowledged: 0,
      dismissed: 0,
      byPriority: {},
    };
  }

  /**
   * Calculate threat metrics
   */
  private calculateThreatMetrics(events: SecurityEvent[]) {
    const threatEvents = events.filter(e => 
      ['threat_detected', 'suspicious_activity', 'csp_violation'].includes(e.type)
    );

    const detected = threatEvents.filter(e => e.type === 'threat_detected').length;
    const mitigated = events.filter(e => e.type === 'automated_response_triggered').length;

    // Calculate risk score based on threat events
    const riskScore = threatEvents.reduce((score, event) => {
      const severityScores = { low: 1, medium: 3, high: 7, critical: 15 };
      return score + severityScores[event.severity];
    }, 0);

    return {
      detected,
      mitigated,
      falsePositives: 0, // Would be tracked separately
      riskScore: Math.min(riskScore, 100),
    };
  }

  /**
   * Calculate compliance metrics
   */
  private calculateComplianceMetrics(events: SecurityEvent[]) {
    const violations = events.filter(e => e.type === 'compliance_violation').length;
    const auditFindings = events.filter(e => e.type === 'security_audit_completed').length;

    // Calculate compliance score (100 - penalty for violations)
    const complianceScore = Math.max(0, 100 - (violations * 5));

    return {
      violations,
      auditFindings,
      complianceScore,
    };
  }

  /**
   * Calculate performance metrics
   */
  private calculatePerformanceMetrics() {
    // Performance metrics measurement would be implemented here
    return {
      securityOverhead: 0.5, // Percentage of performance overhead
      detectionLatency: 50, // Milliseconds average detection time
      responseLatency: 200, // Milliseconds average response time
    };
  }

  /**
   * Generate security report
   */
  generateReport(
    type: SecurityReport['type'],
    period: { start: number; end: number }
  ): SecurityReport {
    const reportId = `report-${type}-${Date.now()}`;
    const metrics = this.calculateMetrics(period);
    const findings = this.generateFindings(metrics);
    const recommendations = this.generateRecommendations(metrics, findings);

    const report: SecurityReport = {
      id: reportId,
      type,
      title: this.generateReportTitle(type, period),
      summary: this.generateReportSummary(metrics, findings),
      metrics,
      recommendations,
      findings,
      generatedAt: Date.now(),
      period,
    };

    this.reports.set(reportId, report);
    this.saveState();

    return report;
  }

  /**
   * Generate security findings
   */
  private generateFindings(metrics: SecurityMetrics): SecurityFinding[] {
    const findings: SecurityFinding[] = [];

    // High event volume finding
    if (metrics.events.total > 1000) {
      findings.push({
        id: `finding-high-volume-${Date.now()}`,
        title: 'High Security Event Volume',
        description: `${metrics.events.total} security events detected in the timeframe`,
        severity: metrics.events.total > 5000 ? 'high' : 'medium',
        category: 'performance',
        evidence: [`Total events: ${metrics.events.total}`],
        recommendations: [
          'Review event generation patterns',
          'Consider tuning alert thresholds',
          'Investigate potential security issues'
        ],
        impact: 'Potential performance impact and alert fatigue',
        likelihood: 'high',
        risk: metrics.events.total > 5000 ? 8 : 5,
      });
    }

    // Critical events finding
    const criticalEvents = metrics.events.bySeverity.critical || 0;
    if (criticalEvents > 0) {
      findings.push({
        id: `finding-critical-events-${Date.now()}`,
        title: 'Critical Security Events Detected',
        description: `${criticalEvents} critical security events require immediate attention`,
        severity: 'critical',
        category: 'threat',
        evidence: [`Critical events: ${criticalEvents}`],
        recommendations: [
          'Investigate all critical events immediately',
          'Implement additional security controls',
          'Review incident response procedures'
        ],
        impact: 'Potential security breach or system compromise',
        likelihood: 'high',
        risk: 10,
      });
    }

    // High risk score finding
    if (metrics.threats.riskScore > 50) {
      findings.push({
        id: `finding-high-risk-${Date.now()}`,
        title: 'Elevated Risk Score',
        description: `Current risk score of ${metrics.threats.riskScore} indicates elevated threat level`,
        severity: metrics.threats.riskScore > 80 ? 'high' : 'medium',
        category: 'threat',
        evidence: [`Risk score: ${metrics.threats.riskScore}`],
        recommendations: [
          'Review threat detection rules',
          'Implement additional monitoring',
          'Consider security posture improvements'
        ],
        impact: 'Increased likelihood of security incidents',
        likelihood: 'medium',
        risk: metrics.threats.riskScore > 80 ? 7 : 5,
      });
    }

    // Compliance violations finding
    const violations = metrics.compliance.violations;
    if (violations > 0) {
      findings.push({
        id: `finding-compliance-${Date.now()}`,
        title: 'Compliance Violations Detected',
        description: `${violations} compliance violations found`,
        severity: violations > 10 ? 'high' : 'medium',
        category: 'compliance',
        evidence: [`Violations: ${violations}`],
        recommendations: [
          'Address compliance violations immediately',
          'Review compliance policies',
          'Implement automated compliance checks'
        ],
        impact: 'Regulatory penalties and reputation damage',
        likelihood: 'medium',
        risk: violations > 10 ? 8 : 5,
      });
    }

    return findings;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(metrics: SecurityMetrics, findings: SecurityFinding[]): string[] {
    const recommendations: string[] = [];

    // Base recommendations
    recommendations.push('Regularly review and update security policies');
    recommendations.push('Maintain up-to-date threat intelligence');
    recommendations.push('Conduct regular security assessments');

    // Specific recommendations based on metrics
    if (metrics.threats.detected > 0) {
      recommendations.push('Enhance threat detection capabilities');
      recommendations.push('Implement automated threat response');
    }

    if (metrics.incidents.averageResponseTime > 300000) { // 5 minutes
      recommendations.push('Improve incident response time');
      recommendations.push('Automate initial incident triage');
    }

    if (metrics.compliance.complianceScore < 80) {
      recommendations.push('Strengthen compliance controls');
      recommendations.push('Implement continuous compliance monitoring');
    }

    // Recommendations from findings
    findings.forEach(finding => {
      if (finding.severity === 'critical' || finding.severity === 'high') {
        recommendations.push(...finding.recommendations);
      }
    });

    // Remove duplicates
    return [...new Set(recommendations)];
  }

  /**
   * Generate report title
   */
  private generateReportTitle(type: SecurityReport['type'], period: { start: number; end: number }): string {
    const startDate = new Date(period.start).toLocaleDateString();
    const endDate = new Date(period.end).toLocaleDateString();
    
    const typeLabels = {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      incident: 'Incident',
      compliance: 'Compliance',
    };

    return `${typeLabels[type]} Security Report - ${startDate} to ${endDate}`;
  }

  /**
   * Generate report summary
   */
  private generateReportSummary(metrics: SecurityMetrics, findings: SecurityFinding[]): string {
    const criticalFindings = findings.filter(f => f.severity === 'critical').length;
    const highFindings = findings.filter(f => f.severity === 'high').length;
    
    let summary = `Security report covering ${metrics.events.total} events. `;
    
    if (criticalFindings > 0) {
      summary += `${criticalFindings} critical findings require immediate attention. `;
    }
    
    if (highFindings > 0) {
      summary += `${highFindings} high-priority findings identified. `;
    }
    
    summary += `Current risk score: ${metrics.threats.riskScore}/100. `;
    summary += `Compliance score: ${metrics.compliance.complianceScore}/100.`;

    return summary;
  }

  /**
   * Setup threat intelligence
   */
  private setupThreatIntelligence(): void {
    // Add known bad IP patterns
    this.addThreatIntelligence({
      id: 'bad-ip-ranges',
      type: 'ip',
      value: '10.0.0.0/8,172.16.0.0/12,192.168.0.0/16',
      severity: 'medium',
      confidence: 80,
      source: 'RFC1918',
      description: 'Private IP ranges should not be used in production',
      createdAt: Date.now(),
      active: true,
    });

    // Add suspicious user patterns
    this.addThreatIntelligence({
      id: 'rapid-requests',
      type: 'behavior',
      value: 'requests_per_minute > 100',
      severity: 'high',
      confidence: 90,
      source: 'internal',
      description: 'Unusually high request rate indicating potential bot activity',
      createdAt: Date.now(),
      active: true,
    });
  }

  /**
   * Add threat intelligence
   */
  addThreatIntelligence(threat: ThreatIntelligence): void {
    this.threatIntelligence.set(threat.id, threat);
    this.saveState();
  }

  /**
   * Check event against threat intelligence
   */
  checkThreatIntelligence(event: SecurityEvent): ThreatIntelligence[] {
    const matches: ThreatIntelligence[] = [];

    for (const threat of this.threatIntelligence.values()) {
      if (!threat.active) continue;

      if (this.matchesThreatIntelligence(event, threat)) {
        matches.push(threat);
        
        // Update last seen
        threat.lastSeen = Date.now();
      }
    }

    return matches;
  }

  /**
   * Check if event matches threat intelligence
   */
  private matchesThreatIntelligence(event: SecurityEvent, threat: ThreatIntelligence): boolean {
    switch (threat.type) {
      case 'ip': {
        // Check if event contains IP addresses matching the threat
        const eventString = JSON.stringify(event.details);
        return threat.value.split(',').some(ip => eventString.includes(ip.trim()));
      }

      case 'user_pattern':
        return event.userId?.includes(threat.value) || false;

      case 'behavior':
        // Simple behavior matching - in reality this would be more sophisticated
        return threat.value.includes(event.type);

      default:
        return false;
    }
  }

  /**
   * Generate scheduled reports
   */
  private generateScheduledReports(): void {
    const now = Date.now();
    const oneDayAgo = now - 86400000;
    const oneWeekAgo = now - 604800000;
    const oneMonthAgo = now - 2592000000;

    // Generate daily report
    this.generateReport('daily', { start: oneDayAgo, end: now });

    // Generate weekly report (on Sundays)
    const today = new Date();
    if (today.getDay() === 0) {
      this.generateReport('weekly', { start: oneWeekAgo, end: now });
    }

    // Generate monthly report (on 1st of month)
    if (today.getDate() === 1) {
      this.generateReport('monthly', { start: oneMonthAgo, end: now });
    }
  }

  /**
   * Get reports
   */
  getReports(type?: SecurityReport['type'], limit = 10): SecurityReport[] {
    let reports = Array.from(this.reports.values());
    
    if (type) {
      reports = reports.filter(r => r.type === type);
    }

    return reports
      .sort((a, b) => b.generatedAt - a.generatedAt)
      .slice(0, limit);
  }

  /**
   * Get report by ID
   */
  getReport(reportId: string): SecurityReport | undefined {
    return this.reports.get(reportId);
  }

  /**
   * Load state from storage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem('paper-crate-metrics');
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.threatIntelligence) {
          data.threatIntelligence.forEach((threat: ThreatIntelligence) => {
            this.threatIntelligence.set(threat.id, threat);
          });
        }
        
        if (data.reports) {
          data.reports.forEach((report: SecurityReport) => {
            this.reports.set(report.id, report);
          });
        }
      }
    } catch (error) {
      console.error('Failed to load metrics state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    try {
      const data = {
        threatIntelligence: Array.from(this.threatIntelligence.values()),
        reports: Array.from(this.reports.values()),
      };
      localStorage.setItem('paper-crate-metrics', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save metrics state:', error);
    }
  }

  /**
   * Export metrics data
   */
  exportMetrics(timeframe?: { start: number; end: number }): string {
    const metrics = timeframe ? 
      this.calculateMetrics(timeframe) : 
      this.calculateMetrics({ start: Date.now() - 86400000, end: Date.now() });
    
    return JSON.stringify(metrics, null, 2);
  }

  /**
   * Export reports
   */
  exportReports(): string {
    return JSON.stringify(Array.from(this.reports.values()), null, 2);
  }

  /**
   * Clear old reports
   */
  clearOldReports(maxAge = 2592000000): void { // 30 days default
    const cutoff = Date.now() - maxAge;
    const reportsToRemove: string[] = [];

    for (const [id, report] of this.reports) {
      if (report.generatedAt < cutoff) {
        reportsToRemove.push(id);
      }
    }

    reportsToRemove.forEach(id => this.reports.delete(id));
    this.saveState();
  }
}

interface UserBehaviorBaseline {
  userId: string;
  avgEventsPerHour: number;
  commonEventTypes: string[];
  avgSessionDuration: number;
  lastUpdated: number;
}

// Export singleton instance
export const metricsCollector = new SecurityMetricsCollector();

// Hook for security metrics
export function useSecurityMetrics() {
  const calculateMetrics = (timeframe: { start: number; end: number }) => {
    return metricsCollector.calculateMetrics(timeframe);
  };

  const generateReport = (type: SecurityReport['type'], period: { start: number; end: number }) => {
    return metricsCollector.generateReport(type, period);
  };

  const getReports = (type?: SecurityReport['type'], limit?: number) => {
    return metricsCollector.getReports(type, limit);
  };

  const checkThreatIntelligence = (event: SecurityEvent) => {
    return metricsCollector.checkThreatIntelligence(event);
  };

  const addThreatIntelligence = (threat: ThreatIntelligence) => {
    metricsCollector.addThreatIntelligence(threat);
  };

  return {
    calculateMetrics,
    generateReport,
    getReports,
    checkThreatIntelligence,
    addThreatIntelligence,
  };
}