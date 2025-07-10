/**
 * Environment security checks and configuration validation
 */
import { securityMonitor } from './monitoring';

export interface SecurityCheck {
  name: string;
  status: 'pass' | 'warn' | 'fail';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  details?: Record<string, unknown>;
}

export interface EnvironmentReport {
  overall: 'secure' | 'warnings' | 'insecure';
  checks: SecurityCheck[];
  recommendations: string[];
  timestamp: number;
}

/**
 * Check if running in development mode
 */
export function isDevelopmentMode(): boolean {
  return import.meta.env.DEV || import.meta.env.MODE === 'development';
}

/**
 * Check if running in production mode
 */
export function isProductionMode(): boolean {
  return import.meta.env.PROD || import.meta.env.MODE === 'production';
}

/**
 * Validate environment variables for security
 */
export function validateEnvironmentVariables(): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  // Check for development mode in production
  if (isProductionMode() && import.meta.env.DEV) {
    checks.push({
      name: 'Development Mode Check',
      status: 'fail',
      message: 'Development mode is enabled in production build',
      severity: 'critical',
    });
  }

  // Check for debug flags
  if (isProductionMode()) {
    const debugVars = Object.keys(import.meta.env).filter(key => 
      key.toLowerCase().includes('debug') && import.meta.env[key]
    );

    if (debugVars.length > 0) {
      checks.push({
        name: 'Debug Variables Check',
        status: 'warn',
        message: 'Debug variables are set in production',
        severity: 'medium',
        details: { debugVars },
      });
    }
  }

  // Check for exposed sensitive variables
  const sensitivePatterns = [
    /secret/i,
    /key/i,
    /token/i,
    /password/i,
    /private/i,
  ];

  const exposedVars = Object.keys(import.meta.env).filter(key => {
    // Only check VITE_ prefixed vars as they're exposed to client
    if (!key.startsWith('VITE_')) return false;
    return sensitivePatterns.some(pattern => pattern.test(key));
  });

  if (exposedVars.length > 0) {
    checks.push({
      name: 'Exposed Sensitive Variables',
      status: 'fail',
      message: 'Potentially sensitive environment variables are exposed to client',
      severity: 'high',
      details: { exposedVars },
    });
  }

  return checks;
}

/**
 * Check browser security features
 */
export function checkBrowserSecurity(): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  if (typeof window === 'undefined') {
    return checks; // Server-side, skip browser checks
  }

  // Check HTTPS
  if (isProductionMode() && window.location.protocol !== 'https:') {
    checks.push({
      name: 'HTTPS Check',
      status: 'fail',
      message: 'Application is not served over HTTPS in production',
      severity: 'critical',
    });
  }

  // Check for secure context
  if (!window.isSecureContext && isProductionMode()) {
    checks.push({
      name: 'Secure Context Check',
      status: 'fail',
      message: 'Application is not running in a secure context',
      severity: 'high',
    });
  }

  // Check for Content Security Policy
  const metaCSP = document.querySelector('meta[http-equiv="Content-Security-Policy"]');
  if (!metaCSP) {
    checks.push({
      name: 'Content Security Policy',
      status: 'warn',
      message: 'No Content Security Policy detected',
      severity: 'medium',
    });
  }

  // Check for mixed content
  if (window.location.protocol === 'https:') {
    const mixedContentElements = document.querySelectorAll('img[src^="http:"], script[src^="http:"], link[href^="http:"]');
    if (mixedContentElements.length > 0) {
      checks.push({
        name: 'Mixed Content Check',
        status: 'warn',
        message: 'Mixed content detected (HTTP resources on HTTPS page)',
        severity: 'medium',
        details: { count: mixedContentElements.length },
      });
    }
  }

  // Check for dangerous browser features
  const dangerousFeatures: string[] = [];
  
  // Check if eval is available (security concern)
  try {
    const evalFunction = window.eval;
    if (evalFunction && typeof evalFunction === 'function') {
      dangerousFeatures.push('eval');
    }
  } catch {
    // eval is blocked, which is good for security
  }

  if (dangerousFeatures.length > 0) {
    checks.push({
      name: 'Dangerous Features Check',
      status: 'warn',
      message: 'Dangerous JavaScript features are available',
      severity: 'low',
      details: { features: dangerousFeatures },
    });
  }

  // Check for development tools
  if (isProductionMode()) {
    let devToolsOpen = false;
    
    // Simple check for dev tools (not foolproof)
    const start = Date.now();
    // Use a different method to detect dev tools
    console.clear();
    const end = Date.now();
    
    if (end - start > 100) {
      devToolsOpen = true;
    }

    if (devToolsOpen) {
      checks.push({
        name: 'Developer Tools Check',
        status: 'warn',
        message: 'Developer tools appear to be open',
        severity: 'low',
      });
    }
  }

  return checks;
}

/**
 * Check localStorage security
 */
export function checkLocalStorageSecurity(): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  if (typeof window === 'undefined' || !window.localStorage) {
    return checks;
  }

  try {
    const storageKeys = Object.keys(localStorage);
    
    // Check for potentially sensitive data in localStorage
    const sensitivePatterns = [
      /password/i,
      /secret/i,
      /private.*key/i,
      /credit.*card/i,
      /ssn/i,
    ];

    const suspiciousKeys = storageKeys.filter(key => 
      sensitivePatterns.some(pattern => pattern.test(key))
    );

    if (suspiciousKeys.length > 0) {
      checks.push({
        name: 'Sensitive Data in localStorage',
        status: 'warn',
        message: 'Potentially sensitive data found in localStorage',
        severity: 'medium',
        details: { keys: suspiciousKeys },
      });
    }

    // Check localStorage size
    const totalSize = storageKeys.reduce((size, key) => {
      try {
        return size + (localStorage.getItem(key)?.length || 0);
      } catch {
        return size;
      }
    }, 0);

    if (totalSize > 5 * 1024 * 1024) { // 5MB
      checks.push({
        name: 'localStorage Size Check',
        status: 'warn',
        message: 'localStorage usage is very high',
        severity: 'low',
        details: { sizeBytes: totalSize },
      });
    }

    // Check for expired data (if using timestamps)
    const expiredKeys = storageKeys.filter(key => {
      try {
        const data = localStorage.getItem(key);
        if (!data) return false;
        
        const parsed = JSON.parse(data);
        if (parsed && typeof parsed === 'object' && 'timestamp' in parsed && 'ttl' in parsed) {
          return Date.now() > (parsed.timestamp as number) + (parsed.ttl as number);
        }
        return false;
      } catch {
        return false;
      }
    });

    if (expiredKeys.length > 0) {
      checks.push({
        name: 'Expired Data Check',
        status: 'warn',
        message: 'Expired data found in localStorage',
        severity: 'low',
        details: { expiredKeys },
      });
    }

  } catch (error) {
    checks.push({
      name: 'localStorage Access Check',
      status: 'fail',
      message: 'Cannot access localStorage',
      severity: 'medium',
      details: { error: error instanceof Error ? error.message : 'Unknown error' },
    });
  }

  return checks;
}

/**
 * Check third-party dependencies for known vulnerabilities
 */
export function checkDependencySecurity(): SecurityCheck[] {
  const checks: SecurityCheck[] = [];

  // This would typically integrate with npm audit or similar tools
  // For now, we'll do basic checks on available globals

  if (typeof window === 'undefined') {
    return checks;
  }

  // Check for jQuery (if present) - common vulnerability source
  // @ts-expect-error - jQuery may not be defined
  if (typeof window.jQuery !== 'undefined') {
    // @ts-expect-error - jQuery may not be defined
    const jqVersion = window.jQuery.fn.jquery;
    if (jqVersion && jqVersion < '3.5.0') {
      checks.push({
        name: 'jQuery Version Check',
        status: 'warn',
        message: 'Outdated jQuery version detected',
        severity: 'medium',
        details: { version: jqVersion },
      });
    }
  }

  // Check for exposed React DevTools in production
  // @ts-expect-error - React DevTools may not be defined
  if (isProductionMode() && window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
    checks.push({
      name: 'React DevTools Check',
      status: 'warn',
      message: 'React DevTools detected in production',
      severity: 'low',
    });
  }

  return checks;
}

/**
 * Perform comprehensive security audit
 */
export function performSecurityAudit(): EnvironmentReport {
  const allChecks: SecurityCheck[] = [
    ...validateEnvironmentVariables(),
    ...checkBrowserSecurity(),
    ...checkLocalStorageSecurity(),
    ...checkDependencySecurity(),
  ];

  // Determine overall status
  const hasFailures = allChecks.some(check => check.status === 'fail');
  const hasWarnings = allChecks.some(check => check.status === 'warn');

  let overall: EnvironmentReport['overall'] = 'secure';
  if (hasFailures) {
    overall = 'insecure';
  } else if (hasWarnings) {
    overall = 'warnings';
  }

  // Generate recommendations
  const recommendations: string[] = [];
  
  if (hasFailures) {
    recommendations.push('Address all critical security issues immediately');
  }
  
  if (hasWarnings) {
    recommendations.push('Review and address security warnings');
  }

  if (isProductionMode()) {
    recommendations.push('Regularly update dependencies to latest secure versions');
    recommendations.push('Implement Content Security Policy headers');
    recommendations.push('Enable HTTPS and security headers');
  }

  recommendations.push('Regularly perform security audits');
  recommendations.push('Monitor for new security vulnerabilities');

  const report: EnvironmentReport = {
    overall,
    checks: allChecks,
    recommendations,
    timestamp: Date.now(),
  };

  // Log audit results
  securityMonitor.logEvent({
    type: 'security_audit_completed',
    details: {
      overall,
      totalChecks: allChecks.length,
      failures: allChecks.filter(c => c.status === 'fail').length,
      warnings: allChecks.filter(c => c.status === 'warn').length,
    },
    severity: hasFailures ? 'high' : hasWarnings ? 'medium' : 'low',
  });

  return report;
}

/**
 * Hook for environment security monitoring
 */
export function useEnvironmentSecurity() {
  const runAudit = (): EnvironmentReport => {
    return performSecurityAudit();
  };

  const checkEnvironment = () => {
    return {
      isDevelopment: isDevelopmentMode(),
      isProduction: isProductionMode(),
      isSecureContext: typeof window !== 'undefined' ? window.isSecureContext : false,
      protocol: typeof window !== 'undefined' ? window.location.protocol : 'unknown',
    };
  };

  const validateEnvVars = () => {
    return validateEnvironmentVariables();
  };

  const checkBrowser = () => {
    return checkBrowserSecurity();
  };

  const checkStorage = () => {
    return checkLocalStorageSecurity();
  };

  return {
    runAudit,
    checkEnvironment,
    validateEnvVars,
    checkBrowser,
    checkStorage,
  };
}