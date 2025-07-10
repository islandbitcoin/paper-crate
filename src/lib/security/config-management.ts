/**
 * Security configuration management and compliance
 */
import { securityMonitor } from './monitoring';

export type ConfigurationType = 
  | 'authentication'
  | 'authorization'
  | 'encryption'
  | 'networking'
  | 'logging'
  | 'monitoring'
  | 'data_protection'
  | 'incident_response'
  | 'compliance';

export interface SecurityConfiguration {
  id: string;
  name: string;
  type: ConfigurationType;
  description: string;
  value: unknown;
  defaultValue: unknown;
  required: boolean;
  sensitive: boolean;
  validationRules: ValidationRule[];
  complianceStandards: string[];
  lastModified: number;
  modifiedBy?: string;
  version: number;
}

export interface ValidationRule {
  type: 'required' | 'type' | 'range' | 'regex' | 'enum' | 'custom';
  parameters: Record<string, unknown>;
  message: string;
}

export interface ComplianceStandard {
  id: string;
  name: string;
  description: string;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  configIds: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  mandatory: boolean;
}

export interface ConfigAuditLog {
  id: string;
  configId: string;
  action: 'create' | 'update' | 'delete' | 'access';
  oldValue?: unknown;
  newValue?: unknown;
  timestamp: number;
  userId?: string;
  reason?: string;
  approved: boolean;
  approvedBy?: string;
}

/**
 * Default security configurations
 */
export const DEFAULT_SECURITY_CONFIGS: SecurityConfiguration[] = [
  {
    id: 'session_timeout',
    name: 'Session Timeout',
    type: 'authentication',
    description: 'Maximum idle time before session expires (in milliseconds)',
    value: 1800000, // 30 minutes
    defaultValue: 1800000,
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'required',
        parameters: {},
        message: 'Session timeout is required',
      },
      {
        type: 'range',
        parameters: { min: 300000, max: 86400000 }, // 5 minutes to 24 hours
        message: 'Session timeout must be between 5 minutes and 24 hours',
      }
    ],
    complianceStandards: ['PCI-DSS', 'SOX'],
    lastModified: Date.now(),
    version: 1,
  },
  {
    id: 'password_complexity',
    name: 'Password Complexity Requirements',
    type: 'authentication',
    description: 'Password complexity and strength requirements',
    value: {
      minLength: 12,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: true,
      preventCommonPasswords: true,
    },
    defaultValue: {
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumbers: true,
      requireSpecialChars: false,
      preventCommonPasswords: false,
    },
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'type',
        parameters: { expectedType: 'object' },
        message: 'Password complexity must be an object',
      }
    ],
    complianceStandards: ['NIST', 'ISO27001'],
    lastModified: Date.now(),
    version: 1,
  },
  {
    id: 'encryption_algorithm',
    name: 'Default Encryption Algorithm',
    type: 'encryption',
    description: 'Default algorithm for data encryption',
    value: 'AES-256-GCM',
    defaultValue: 'AES-256-GCM',
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'enum',
        parameters: { 
          allowed: ['AES-256-GCM', 'AES-256-CBC', 'ChaCha20-Poly1305'] 
        },
        message: 'Must use approved encryption algorithm',
      }
    ],
    complianceStandards: ['FIPS-140-2', 'GDPR'],
    lastModified: Date.now(),
    version: 1,
  },
  {
    id: 'max_login_attempts',
    name: 'Maximum Login Attempts',
    type: 'authentication',
    description: 'Maximum failed login attempts before account lockout',
    value: 5,
    defaultValue: 3,
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'range',
        parameters: { min: 1, max: 10 },
        message: 'Must be between 1 and 10 attempts',
      }
    ],
    complianceStandards: ['PCI-DSS'],
    lastModified: Date.now(),
    version: 1,
  },
  {
    id: 'data_retention_period',
    name: 'Data Retention Period',
    type: 'data_protection',
    description: 'How long to retain user data (in days)',
    value: 90,
    defaultValue: 365,
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'range',
        parameters: { min: 1, max: 2555 }, // Up to 7 years
        message: 'Retention period must be between 1 day and 7 years',
      }
    ],
    complianceStandards: ['GDPR', 'CCPA'],
    lastModified: Date.now(),
    version: 1,
  },
  {
    id: 'audit_log_retention',
    name: 'Audit Log Retention',
    type: 'logging',
    description: 'How long to keep audit logs (in days)',
    value: 365,
    defaultValue: 365,
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'range',
        parameters: { min: 90, max: 2555 },
        message: 'Audit logs must be retained for at least 90 days',
      }
    ],
    complianceStandards: ['SOX', 'HIPAA', 'PCI-DSS'],
    lastModified: Date.now(),
    version: 1,
  },
  {
    id: 'threat_detection_sensitivity',
    name: 'Threat Detection Sensitivity',
    type: 'monitoring',
    description: 'Sensitivity level for automated threat detection',
    value: 'medium',
    defaultValue: 'medium',
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'enum',
        parameters: { allowed: ['low', 'medium', 'high'] },
        message: 'Must be low, medium, or high',
      }
    ],
    complianceStandards: ['ISO27001'],
    lastModified: Date.now(),
    version: 1,
  },
  {
    id: 'api_rate_limits',
    name: 'API Rate Limits',
    type: 'networking',
    description: 'Rate limiting configuration for API endpoints',
    value: {
      requestsPerMinute: 60,
      burstLimit: 10,
      enableWhitelist: true,
      blockDuration: 3600000, // 1 hour
    },
    defaultValue: {
      requestsPerMinute: 100,
      burstLimit: 20,
      enableWhitelist: false,
      blockDuration: 1800000, // 30 minutes
    },
    required: true,
    sensitive: false,
    validationRules: [
      {
        type: 'type',
        parameters: { expectedType: 'object' },
        message: 'Rate limits must be an object',
      }
    ],
    complianceStandards: ['OWASP'],
    lastModified: Date.now(),
    version: 1,
  }
];

/**
 * Default compliance standards
 */
export const DEFAULT_COMPLIANCE_STANDARDS: ComplianceStandard[] = [
  {
    id: 'gdpr',
    name: 'General Data Protection Regulation',
    description: 'EU data protection and privacy regulation',
    requirements: [
      {
        id: 'gdpr-encryption',
        title: 'Data Encryption',
        description: 'Personal data must be encrypted in transit and at rest',
        configIds: ['encryption_algorithm'],
        severity: 'critical',
        mandatory: true,
      },
      {
        id: 'gdpr-retention',
        title: 'Data Retention',
        description: 'Personal data must not be kept longer than necessary',
        configIds: ['data_retention_period'],
        severity: 'high',
        mandatory: true,
      }
    ]
  },
  {
    id: 'pci-dss',
    name: 'Payment Card Industry Data Security Standard',
    description: 'Security standards for payment card data',
    requirements: [
      {
        id: 'pci-authentication',
        title: 'Strong Authentication',
        description: 'Implement strong access control measures',
        configIds: ['max_login_attempts', 'session_timeout'],
        severity: 'critical',
        mandatory: true,
      },
      {
        id: 'pci-logging',
        title: 'Audit Logging',
        description: 'Maintain comprehensive audit logs',
        configIds: ['audit_log_retention'],
        severity: 'high',
        mandatory: true,
      }
    ]
  }
];

/**
 * Security Configuration Manager
 */
export class SecurityConfigManager {
  private configurations = new Map<string, SecurityConfiguration>();
  private complianceStandards = new Map<string, ComplianceStandard>();
  private auditLog: ConfigAuditLog[] = [];
  private changeApprovalRequired = true;

  constructor() {
    this.loadDefaults();
    this.loadState();
  }

  /**
   * Load default configurations
   */
  private loadDefaults(): void {
    DEFAULT_SECURITY_CONFIGS.forEach(config => {
      this.configurations.set(config.id, { ...config });
    });

    DEFAULT_COMPLIANCE_STANDARDS.forEach(standard => {
      this.complianceStandards.set(standard.id, { ...standard });
    });
  }

  /**
   * Get configuration by ID
   */
  getConfig(configId: string): SecurityConfiguration | undefined {
    return this.configurations.get(configId);
  }

  /**
   * Get all configurations by type
   */
  getConfigsByType(type: ConfigurationType): SecurityConfiguration[] {
    return Array.from(this.configurations.values()).filter(config => config.type === type);
  }

  /**
   * Get all configurations
   */
  getAllConfigs(): SecurityConfiguration[] {
    return Array.from(this.configurations.values());
  }

  /**
   * Update configuration
   */
  updateConfig(
    configId: string, 
    newValue: unknown, 
    userId?: string, 
    reason?: string
  ): { success: boolean; errors: string[] } {
    const config = this.configurations.get(configId);
    if (!config) {
      return { success: false, errors: ['Configuration not found'] };
    }

    // Validate new value
    const validation = this.validateConfigValue(config, newValue);
    if (!validation.valid) {
      return { success: false, errors: validation.errors };
    }

    // Check if approval is required
    if (this.changeApprovalRequired && config.required) {
      return this.requestChangeApproval(configId, newValue, userId, reason);
    }

    return this.applyConfigChange(configId, newValue, userId, reason);
  }

  /**
   * Apply configuration change
   */
  private applyConfigChange(
    configId: string,
    newValue: unknown,
    userId?: string,
    reason?: string
  ): { success: boolean; errors: string[] } {
    const config = this.configurations.get(configId);
    if (!config) {
      return { success: false, errors: ['Configuration not found'] };
    }

    const oldValue = config.value;
    
    // Update configuration
    config.value = newValue;
    config.lastModified = Date.now();
    config.modifiedBy = userId;
    config.version += 1;

    // Log the change
    this.logConfigChange('update', configId, oldValue, newValue, userId, reason, true);

    // Trigger compliance check
    this.checkCompliance();

    // Save state
    this.saveState();

    // Log security event
    securityMonitor.logEvent({
      type: 'security_config_changed',
      userId,
      details: {
        configId,
        configName: config.name,
        oldValue: this.sanitizeValue(oldValue, config.sensitive),
        newValue: this.sanitizeValue(newValue, config.sensitive),
        reason,
      },
      severity: config.required ? 'medium' : 'low',
    });

    return { success: true, errors: [] };
  }

  /**
   * Request change approval (placeholder)
   */
  private requestChangeApproval(
    configId: string,
    newValue: unknown,
    userId?: string,
    reason?: string
  ): { success: boolean; errors: string[] } {
    // Approval workflow would be implemented here
    this.logConfigChange('update', configId, undefined, newValue, userId, reason, false);
    
    return { 
      success: false, 
      errors: ['Change requires approval from security administrator'] 
    };
  }

  /**
   * Validate configuration value
   */
  private validateConfigValue(
    config: SecurityConfiguration, 
    value: unknown
  ): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    for (const rule of config.validationRules) {
      const result = this.applyValidationRule(rule, value);
      if (!result.valid) {
        errors.push(result.message);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Apply validation rule
   */
  private applyValidationRule(
    rule: ValidationRule, 
    value: unknown
  ): { valid: boolean; message: string } {
    switch (rule.type) {
      case 'required':
        return {
          valid: value !== undefined && value !== null && value !== '',
          message: rule.message,
        };

      case 'type': {
        const expectedType = rule.parameters.expectedType as string;
        return {
          valid: typeof value === expectedType,
          message: rule.message,
        };
      }

      case 'range': {
        if (typeof value === 'number') {
          const min = rule.parameters.min as number;
          const max = rule.parameters.max as number;
          return {
            valid: value >= min && value <= max,
            message: rule.message,
          };
        }
        return { valid: false, message: rule.message };
      }

      case 'regex': {
        if (typeof value === 'string') {
          const pattern = new RegExp(rule.parameters.pattern as string);
          return {
            valid: pattern.test(value),
            message: rule.message,
          };
        }
        return { valid: false, message: rule.message };
      }

      case 'enum': {
        const allowed = rule.parameters.allowed as unknown[];
        return {
          valid: allowed.includes(value),
          message: rule.message,
        };
      }

      case 'custom':
        // Custom validation would be implemented here
        return { valid: true, message: '' };

      default:
        return { valid: true, message: '' };
    }
  }

  /**
   * Log configuration change
   */
  private logConfigChange(
    action: ConfigAuditLog['action'],
    configId: string,
    oldValue?: unknown,
    newValue?: unknown,
    userId?: string,
    reason?: string,
    approved = false,
    approvedBy?: string
  ): void {
    const logEntry: ConfigAuditLog = {
      id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      configId,
      action,
      oldValue,
      newValue,
      timestamp: Date.now(),
      userId,
      reason,
      approved,
      approvedBy,
    };

    this.auditLog.push(logEntry);

    // Keep only recent audit logs
    if (this.auditLog.length > 10000) {
      this.auditLog = this.auditLog.slice(-5000);
    }
  }

  /**
   * Check compliance with standards
   */
  checkCompliance(): { compliant: boolean; violations: ComplianceViolation[] } {
    const violations: ComplianceViolation[] = [];

    for (const standard of this.complianceStandards.values()) {
      for (const requirement of standard.requirements) {
        const violation = this.checkRequirement(requirement, standard);
        if (violation) {
          violations.push(violation);
        }
      }
    }

    if (violations.length > 0) {
      securityMonitor.logEvent({
        type: 'compliance_violation',
        details: {
          violationCount: violations.length,
          violations: violations.map(v => ({
            standard: v.standardId,
            requirement: v.requirementId,
            severity: v.severity,
          })),
        },
        severity: violations.some(v => v.severity === 'critical') ? 'critical' : 'high',
      });
    }

    return {
      compliant: violations.length === 0,
      violations,
    };
  }

  /**
   * Check individual compliance requirement
   */
  private checkRequirement(
    requirement: ComplianceRequirement,
    standard: ComplianceStandard
  ): ComplianceViolation | null {
    for (const configId of requirement.configIds) {
      const config = this.configurations.get(configId);
      if (!config) {
        return {
          id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          standardId: standard.id,
          standardName: standard.name,
          requirementId: requirement.id,
          requirementTitle: requirement.title,
          configId,
          severity: requirement.severity,
          description: `Configuration ${configId} is missing`,
          detectedAt: Date.now(),
        };
      }

      // Check if configuration meets requirement
      if (!this.configMeetsRequirement(config, requirement)) {
        return {
          id: `violation-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          standardId: standard.id,
          standardName: standard.name,
          requirementId: requirement.id,
          requirementTitle: requirement.title,
          configId,
          severity: requirement.severity,
          description: `Configuration ${config.name} does not meet ${requirement.title}`,
          detectedAt: Date.now(),
        };
      }
    }

    return null;
  }

  /**
   * Check if configuration meets requirement
   */
  private configMeetsRequirement(
    config: SecurityConfiguration,
    _requirement: ComplianceRequirement
  ): boolean {
    // This would contain specific compliance logic
    // For now, we just check if the config has a value
    return config.value !== undefined && config.value !== null;
  }

  /**
   * Sanitize value for logging (hide sensitive data)
   */
  private sanitizeValue(value: unknown, sensitive: boolean): unknown {
    if (!sensitive) {
      return value;
    }

    if (typeof value === 'string') {
      return '*'.repeat(value.length);
    }

    if (typeof value === 'object' && value !== null) {
      return '[OBJECT]';
    }

    return '[HIDDEN]';
  }

  /**
   * Get audit log
   */
  getAuditLog(configId?: string, limit = 100): ConfigAuditLog[] {
    let logs = [...this.auditLog];

    if (configId) {
      logs = logs.filter(log => log.configId === configId);
    }

    return logs
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Get compliance status
   */
  getComplianceStatus(): {
    overall: 'compliant' | 'non_compliant';
    standards: Array<{
      id: string;
      name: string;
      compliant: boolean;
      violationCount: number;
    }>;
  } {
    const compliance = this.checkCompliance();
    const standardStatus = new Map<string, { name: string; violations: number }>();

    // Initialize all standards
    for (const standard of this.complianceStandards.values()) {
      standardStatus.set(standard.id, { name: standard.name, violations: 0 });
    }

    // Count violations per standard
    compliance.violations.forEach(violation => {
      const status = standardStatus.get(violation.standardId);
      if (status) {
        status.violations++;
      }
    });

    return {
      overall: compliance.compliant ? 'compliant' : 'non_compliant',
      standards: Array.from(standardStatus.entries()).map(([id, status]) => ({
        id,
        name: status.name,
        compliant: status.violations === 0,
        violationCount: status.violations,
      })),
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    const exportData = {
      configurations: Array.from(this.configurations.values()).map(config => ({
        ...config,
        value: this.sanitizeValue(config.value, config.sensitive),
      })),
      complianceStandards: Array.from(this.complianceStandards.values()),
      auditLog: this.auditLog.slice(-1000), // Last 1000 entries
    };

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Reset configuration to default
   */
  resetConfigToDefault(configId: string, userId?: string, reason?: string): { success: boolean; errors: string[] } {
    const config = this.configurations.get(configId);
    if (!config) {
      return { success: false, errors: ['Configuration not found'] };
    }

    return this.updateConfig(configId, config.defaultValue, userId, reason || 'Reset to default value');
  }

  /**
   * Load state from storage
   */
  private loadState(): void {
    try {
      const stored = localStorage.getItem('paper-crate-security-config');
      if (stored) {
        const data = JSON.parse(stored);
        
        if (data.configurations) {
          data.configurations.forEach((config: SecurityConfiguration) => {
            // Only update existing configurations to preserve defaults
            if (this.configurations.has(config.id)) {
              this.configurations.set(config.id, config);
            }
          });
        }
        
        if (data.auditLog) {
          this.auditLog = data.auditLog;
        }
      }
    } catch (error) {
      console.error('Failed to load security configuration state:', error);
    }
  }

  /**
   * Save state to storage
   */
  private saveState(): void {
    try {
      const data = {
        configurations: Array.from(this.configurations.values()),
        auditLog: this.auditLog,
      };
      localStorage.setItem('paper-crate-security-config', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save security configuration state:', error);
    }
  }
}

interface ComplianceViolation {
  id: string;
  standardId: string;
  standardName: string;
  requirementId: string;
  requirementTitle: string;
  configId: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  detectedAt: number;
}

// Export singleton instance
export const securityConfigManager = new SecurityConfigManager();

// Hook for security configuration
export function useSecurityConfig() {
  const getConfig = (configId: string) => {
    return securityConfigManager.getConfig(configId);
  };

  const updateConfig = (configId: string, value: unknown, userId?: string, reason?: string) => {
    return securityConfigManager.updateConfig(configId, value, userId, reason);
  };

  const getConfigsByType = (type: ConfigurationType) => {
    return securityConfigManager.getConfigsByType(type);
  };

  const checkCompliance = () => {
    return securityConfigManager.checkCompliance();
  };

  const getComplianceStatus = () => {
    return securityConfigManager.getComplianceStatus();
  };

  const getAuditLog = (configId?: string, limit?: number) => {
    return securityConfigManager.getAuditLog(configId, limit);
  };

  const resetToDefault = (configId: string, userId?: string, reason?: string) => {
    return securityConfigManager.resetConfigToDefault(configId, userId, reason);
  };

  return {
    getConfig,
    updateConfig,
    getConfigsByType,
    checkCompliance,
    getComplianceStatus,
    getAuditLog,
    resetToDefault,
  };
}