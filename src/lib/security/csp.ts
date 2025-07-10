/**
 * Content Security Policy and security headers configuration
 */
import { securityMonitor } from './monitoring';

export interface CSPConfig {
  'default-src': string[];
  'script-src': string[];
  'style-src': string[];
  'img-src': string[];
  'connect-src': string[];
  'font-src': string[];
  'object-src': string[];
  'media-src': string[];
  'frame-src': string[];
  'worker-src': string[];
  'manifest-src': string[];
  'form-action': string[];
  'frame-ancestors': string[];
  'base-uri': string[];
  'upgrade-insecure-requests'?: boolean;
  'block-all-mixed-content'?: boolean;
}

/**
 * Default CSP configuration for the application
 */
export const DEFAULT_CSP_CONFIG: CSPConfig = {
  'default-src': ["'self'"],
  'script-src': [
    "'self'",
    "'unsafe-inline'", // Required for Vite in development
    "'unsafe-eval'", // Required for development tools
    'https://api.nostr.band',
    'https://relay.damus.io',
    'https://nos.lol',
    'https://relay.primal.net',
  ],
  'style-src': [
    "'self'",
    "'unsafe-inline'", // Required for CSS-in-JS and component libraries
    'https://fonts.googleapis.com',
  ],
  'img-src': [
    "'self'",
    'data:',
    'blob:',
    'https:', // Allow HTTPS images for user avatars and content
  ],
  'connect-src': [
    "'self'",
    'wss:', // WebSocket connections for Nostr relays
    'https:', // HTTPS connections for APIs
    'https://api.nostr.band',
    'https://relay.damus.io',
    'https://nos.lol',
    'https://relay.primal.net',
    'https://api.rapidapi.com', // For social media APIs
  ],
  'font-src': [
    "'self'",
    'https://fonts.gstatic.com',
    'data:',
  ],
  'object-src': ["'none'"],
  'media-src': [
    "'self'",
    'https:',
    'blob:',
  ],
  'frame-src': [
    "'self'",
    'https://www.youtube.com',
    'https://player.vimeo.com',
  ],
  'worker-src': [
    "'self'",
    'blob:',
  ],
  'manifest-src': ["'self'"],
  'form-action': ["'self'"],
  'frame-ancestors': ["'none'"],
  'base-uri': ["'self'"],
  'upgrade-insecure-requests': true,
  'block-all-mixed-content': true,
};

/**
 * Generate CSP header string from configuration
 */
export function generateCSPHeader(config: CSPConfig): string {
  const directives: string[] = [];

  Object.entries(config).forEach(([directive, value]) => {
    if (typeof value === 'boolean') {
      if (value) {
        directives.push(directive.replace(/([A-Z])/g, '-$1').toLowerCase());
      }
    } else if (Array.isArray(value) && value.length > 0) {
      const formattedDirective = directive.replace(/([A-Z])/g, '-$1').toLowerCase();
      directives.push(`${formattedDirective} ${value.join(' ')}`);
    }
  });

  return directives.join('; ');
}

/**
 * Security headers configuration
 */
export interface SecurityHeaders {
  'Content-Security-Policy'?: string;
  'X-Content-Type-Options': string;
  'X-Frame-Options': string;
  'X-XSS-Protection': string;
  'Referrer-Policy': string;
  'Permissions-Policy': string;
  'Strict-Transport-Security'?: string;
}

export const DEFAULT_SECURITY_HEADERS: SecurityHeaders = {
  'Content-Security-Policy': generateCSPHeader(DEFAULT_CSP_CONFIG),
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': [
    'geolocation=()',
    'microphone=()',
    'camera=()',
    'payment=(self)',
    'usb=()',
    'bluetooth=()',
  ].join(', '),
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
};

/**
 * Apply security headers to meta tags (for client-side applications)
 */
export function applySecurityHeaders(headers: SecurityHeaders = DEFAULT_SECURITY_HEADERS): void {
  try {
    // Apply CSP via meta tag
    if (headers['Content-Security-Policy']) {
      let cspMeta = document.querySelector('meta[http-equiv="Content-Security-Policy"]') as HTMLMetaElement;
      if (!cspMeta) {
        cspMeta = document.createElement('meta');
        cspMeta.httpEquiv = 'Content-Security-Policy';
        document.head.appendChild(cspMeta);
      }
      cspMeta.content = headers['Content-Security-Policy'];
    }

    // Apply X-Content-Type-Options
    let contentTypeMeta = document.querySelector('meta[http-equiv="X-Content-Type-Options"]') as HTMLMetaElement;
    if (!contentTypeMeta) {
      contentTypeMeta = document.createElement('meta');
      contentTypeMeta.httpEquiv = 'X-Content-Type-Options';
      document.head.appendChild(contentTypeMeta);
    }
    contentTypeMeta.content = headers['X-Content-Type-Options'];

    // Apply Referrer Policy
    let referrerMeta = document.querySelector('meta[name="referrer"]') as HTMLMetaElement;
    if (!referrerMeta) {
      referrerMeta = document.createElement('meta');
      referrerMeta.name = 'referrer';
      document.head.appendChild(referrerMeta);
    }
    referrerMeta.content = headers['Referrer-Policy'];

    securityMonitor.logEvent({
      type: 'security_headers_applied',
      details: { 
        headers: Object.keys(headers),
        timestamp: Date.now()
      },
      severity: 'low',
    });
  } catch (error) {
    console.error('Failed to apply security headers:', error);
    securityMonitor.logEvent({
      type: 'security_headers_failed',
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      severity: 'medium',
    });
  }
}

/**
 * Validate current CSP configuration
 */
export function validateCSPConfig(config: CSPConfig): { valid: boolean; issues: string[] } {
  const issues: string[] = [];

  // Check for unsafe directives in production
  if (import.meta.env.PROD) {
    if (config['script-src']?.includes("'unsafe-inline'")) {
      issues.push("'unsafe-inline' in script-src is not recommended for production");
    }
    if (config['script-src']?.includes("'unsafe-eval'")) {
      issues.push("'unsafe-eval' in script-src is not recommended for production");
    }
  }

  // Check for overly permissive directives
  if (config['default-src']?.includes('*')) {
    issues.push("Wildcard in default-src allows all sources");
  }

  if (config['script-src']?.includes('*')) {
    issues.push("Wildcard in script-src is dangerous");
  }

  // Check for missing important directives
  if (!config['object-src'] || !config['object-src'].includes("'none'")) {
    issues.push("object-src should be set to 'none' to prevent plugin execution");
  }

  if (!config['frame-ancestors'] || !config['frame-ancestors'].includes("'none'")) {
    issues.push("frame-ancestors should be restrictive to prevent clickjacking");
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Report CSP violations (for future implementation with reporting endpoint)
 */
export function handleCSPViolation(violationEvent: SecurityPolicyViolationEvent): void {
  const violation = {
    blockedURI: violationEvent.blockedURI,
    violatedDirective: violationEvent.violatedDirective,
    originalPolicy: violationEvent.originalPolicy,
    sourceFile: violationEvent.sourceFile,
    lineNumber: violationEvent.lineNumber,
    columnNumber: violationEvent.columnNumber,
  };

  securityMonitor.logEvent({
    type: 'csp_violation',
    details: violation,
    severity: 'high',
  });

  console.warn('CSP Violation:', violation);
}

/**
 * Initialize CSP violation reporting
 */
export function initCSPReporting(): void {
  if (typeof window !== 'undefined') {
    document.addEventListener('securitypolicyviolation', handleCSPViolation);
  }
}

/**
 * Hook for managing CSP configuration
 */
export function useCSP() {
  const applyHeaders = (customHeaders?: Partial<SecurityHeaders>): void => {
    const headers = { ...DEFAULT_SECURITY_HEADERS, ...customHeaders };
    applySecurityHeaders(headers);
  };

  const validateConfig = (config: CSPConfig) => {
    return validateCSPConfig(config);
  };

  const generateHeader = (config: CSPConfig): string => {
    return generateCSPHeader(config);
  };

  return {
    applyHeaders,
    validateConfig,
    generateHeader,
    defaultConfig: DEFAULT_CSP_CONFIG,
    defaultHeaders: DEFAULT_SECURITY_HEADERS,
  };
}