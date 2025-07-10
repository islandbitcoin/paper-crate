/**
 * API security utilities for external service integration
 */
import { securityMonitor } from './monitoring';
import { secureFetch } from './communication';

export interface APISecurityConfig {
  allowedDomains: string[];
  maxRequestsPerMinute: number;
  timeoutMs: number;
  retryAttempts: number;
  requireHttps: boolean;
  validateApiKeys: boolean;
}

export interface APIKeyConfig {
  keyName: string;
  headerName: string;
  pattern?: RegExp;
  required: boolean;
}

export interface RateLimitState {
  requests: number[];
  blocked: boolean;
  resetTime: number;
}

/**
 * Default API security configuration
 */
export const DEFAULT_API_CONFIG: APISecurityConfig = {
  allowedDomains: [
    'api.rapidapi.com',
    'api.twitter.com',
    'graph.instagram.com',
    'api.tiktok.com',
    'api.youtube.com',
    'api.linkedin.com',
    'graph.facebook.com',
  ],
  maxRequestsPerMinute: 60,
  timeoutMs: 15000,
  retryAttempts: 3,
  requireHttps: true,
  validateApiKeys: true,
};

/**
 * Known API configurations for security validation
 */
export const API_CONFIGS: Record<string, APIKeyConfig[]> = {
  'api.rapidapi.com': [
    {
      keyName: 'rapidapi_key',
      headerName: 'X-RapidAPI-Key',
      pattern: /^[a-f0-9]{50}$/i,
      required: true,
    },
    {
      keyName: 'rapidapi_host',
      headerName: 'X-RapidAPI-Host',
      required: true,
    },
  ],
  'api.twitter.com': [
    {
      keyName: 'twitter_bearer',
      headerName: 'Authorization',
      pattern: /^Bearer [A-Za-z0-9_-]+$/,
      required: true,
    },
  ],
  'graph.instagram.com': [
    {
      keyName: 'instagram_token',
      headerName: 'Authorization',
      pattern: /^Bearer [A-Za-z0-9_-]+$/,
      required: true,
    },
  ],
};

/**
 * Rate limiter for API requests
 */
export class APIRateLimiter {
  private limits = new Map<string, RateLimitState>();
  private config: APISecurityConfig;

  constructor(config: APISecurityConfig = DEFAULT_API_CONFIG) {
    this.config = config;
  }

  /**
   * Check if request is allowed within rate limits
   */
  checkRateLimit(domain: string): boolean {
    const now = Date.now();
    const windowMs = 60000; // 1 minute window
    
    let state = this.limits.get(domain);
    
    if (!state) {
      state = {
        requests: [],
        blocked: false,
        resetTime: now + windowMs,
      };
      this.limits.set(domain, state);
    }

    // Clean old requests outside window
    state.requests = state.requests.filter(time => time > now - windowMs);

    // Check if blocked
    if (state.blocked && now < state.resetTime) {
      return false;
    }

    // Reset block if time has passed
    if (state.blocked && now >= state.resetTime) {
      state.blocked = false;
      state.requests = [];
    }

    // Check rate limit
    if (state.requests.length >= this.config.maxRequestsPerMinute) {
      state.blocked = true;
      state.resetTime = now + windowMs;
      
      securityMonitor.logEvent({
        type: 'api_rate_limit_exceeded',
        details: {
          domain,
          requests: state.requests.length,
          limit: this.config.maxRequestsPerMinute,
        },
        severity: 'medium',
      });
      
      return false;
    }

    // Allow request
    state.requests.push(now);
    this.limits.set(domain, state);
    return true;
  }

  /**
   * Get current rate limit status
   */
  getRateLimitStatus(domain: string): { 
    remaining: number; 
    resetTime: number; 
    blocked: boolean; 
  } {
    const state = this.limits.get(domain);
    
    if (!state) {
      return {
        remaining: this.config.maxRequestsPerMinute,
        resetTime: Date.now() + 60000,
        blocked: false,
      };
    }

    const now = Date.now();
    const activeRequests = state.requests.filter(time => time > now - 60000);
    
    return {
      remaining: Math.max(0, this.config.maxRequestsPerMinute - activeRequests.length),
      resetTime: state.resetTime,
      blocked: state.blocked && now < state.resetTime,
    };
  }
}

/**
 * Validate API key format and security
 */
export function validateAPIKey(
  keyValue: string,
  config: APIKeyConfig
): { valid: boolean; reason?: string } {
  // Check if key is required
  if (config.required && !keyValue) {
    return { valid: false, reason: 'API key is required' };
  }

  if (!keyValue) {
    return { valid: true }; // Optional key not provided
  }

  // Check pattern if specified
  if (config.pattern && !config.pattern.test(keyValue)) {
    return { valid: false, reason: 'API key format is invalid' };
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /test/i,
    /demo/i,
    /sample/i,
    /example/i,
    /^(abc|123)/i,
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(keyValue))) {
    return { valid: false, reason: 'API key appears to be a placeholder or test key' };
  }

  // Check minimum length for security
  if (keyValue.length < 16) {
    return { valid: false, reason: 'API key is too short to be secure' };
  }

  return { valid: true };
}

/**
 * Sanitize API request parameters
 */
export function sanitizeAPIParams(params: Record<string, unknown>): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};

  Object.entries(params).forEach(([key, value]) => {
    // Skip null/undefined values
    if (value == null) return;

    // Sanitize strings
    if (typeof value === 'string') {
      // Remove potential injection vectors
      const clean = value
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/['"]/g, '') // Remove quotes
        .replace(/[;]/g, '') // Remove semicolons
        .trim();
      
      if (clean.length > 0) {
        sanitized[key] = clean;
      }
    } else if (typeof value === 'number' && isFinite(value)) {
      sanitized[key] = value;
    } else if (typeof value === 'boolean') {
      sanitized[key] = value;
    } else if (Array.isArray(value)) {
      // Recursively sanitize array elements
      const sanitizedArray = value
        .map(item => typeof item === 'string' ? 
          item.replace(/[<>'"]/g, '').trim() : item)
        .filter(item => item != null && item !== '');
      
      if (sanitizedArray.length > 0) {
        sanitized[key] = sanitizedArray;
      }
    }
  });

  return sanitized;
}

/**
 * Secure API request wrapper
 */
export async function secureAPIRequest(
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: unknown;
    params?: Record<string, unknown>;
    apiConfig?: APISecurityConfig;
    rateLimiter?: APIRateLimiter;
  } = {}
): Promise<Response> {
  const {
    method = 'GET',
    headers = {},
    body,
    params,
    apiConfig = DEFAULT_API_CONFIG,
    rateLimiter = new APIRateLimiter(apiConfig),
  } = options;

  try {
    const urlObj = new URL(url);
    const domain = urlObj.hostname;

    // Validate domain is allowed
    if (!apiConfig.allowedDomains.some(allowed => {
      if (allowed.includes('*')) {
        const pattern = allowed.replace(/\*/g, '.*');
        return new RegExp(`^${pattern}$`).test(domain);
      }
      return domain === allowed || domain.endsWith(`.${allowed}`);
    })) {
      throw new Error(`Domain ${domain} is not in allowed list`);
    }

    // Check HTTPS requirement
    if (apiConfig.requireHttps && urlObj.protocol !== 'https:') {
      throw new Error('HTTPS is required for API requests');
    }

    // Check rate limits
    if (!rateLimiter.checkRateLimit(domain)) {
      const status = rateLimiter.getRateLimitStatus(domain);
      throw new Error(`Rate limit exceeded. Try again in ${Math.ceil((status.resetTime - Date.now()) / 1000)} seconds`);
    }

    // Validate API keys in headers
    if (apiConfig.validateApiKeys && API_CONFIGS[domain]) {
      for (const keyConfig of API_CONFIGS[domain]) {
        const keyValue = headers[keyConfig.headerName];
        const validation = validateAPIKey(keyValue || '', keyConfig);
        
        if (!validation.valid) {
          securityMonitor.logEvent({
            type: 'invalid_api_key',
            details: {
              domain,
              keyName: keyConfig.keyName,
              reason: validation.reason,
            },
            severity: 'high',
          });
          throw new Error(`Invalid ${keyConfig.keyName}: ${validation.reason}`);
        }
      }
    }

    // Sanitize URL parameters
    if (params) {
      const sanitizedParams = sanitizeAPIParams(params);
      Object.entries(sanitizedParams).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value));
      });
    }

    // Prepare secure headers
    const secureHeaders = {
      'User-Agent': 'Paper-Crate/1.0',
      'Accept': 'application/json',
      'Cache-Control': 'no-cache',
      ...headers,
    };

    // Make secure request
    const response = await secureFetch(urlObj.toString(), {
      method,
      headers: secureHeaders,
      body: body ? JSON.stringify(body) : undefined,
      timeout: apiConfig.timeoutMs,
      retries: apiConfig.retryAttempts,
      allowedDomains: apiConfig.allowedDomains,
    });

    // Log successful request
    securityMonitor.logEvent({
      type: 'api_request_success',
      details: {
        domain,
        method,
        status: response.status,
      },
      severity: 'low',
    });

    return response;
  } catch (error) {
    securityMonitor.logEvent({
      type: 'api_request_failed',
      details: {
        url: new URL(url).hostname,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      severity: 'medium',
    });
    throw error;
  }
}

/**
 * Validate API response for security issues
 */
export function validateAPIResponse(response: Response, expectedContentType = 'application/json'): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];

  // Check status code
  if (response.status < 200 || response.status >= 300) {
    issues.push(`Unexpected status code: ${response.status}`);
  }

  // Check content type
  const contentType = response.headers.get('content-type');
  if (contentType && !contentType.includes(expectedContentType)) {
    issues.push(`Unexpected content type: ${contentType}`);
  }

  // Check for security headers
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
  ];

  securityHeaders.forEach(header => {
    if (!response.headers.has(header)) {
      issues.push(`Missing security header: ${header}`);
    }
  });

  // Check for suspicious headers
  const suspiciousHeaders = [
    'x-powered-by',
    'server',
  ];

  suspiciousHeaders.forEach(header => {
    const value = response.headers.get(header);
    if (value && value.toLowerCase().includes('debug')) {
      issues.push(`Suspicious header value: ${header}: ${value}`);
    }
  });

  return {
    valid: issues.length === 0,
    issues,
  };
}

/**
 * Hook for secure API communication
 */
export function useAPISecurity(config?: Partial<APISecurityConfig>) {
  const apiConfig = { ...DEFAULT_API_CONFIG, ...config };
  const rateLimiter = new APIRateLimiter(apiConfig);

  const makeSecureAPIRequest = async (
    url: string,
    options?: Parameters<typeof secureAPIRequest>[1]
  ) => {
    return secureAPIRequest(url, {
      ...options,
      apiConfig,
      rateLimiter,
    });
  };

  const validateKey = (keyValue: string, keyConfig: APIKeyConfig) => {
    return validateAPIKey(keyValue, keyConfig);
  };

  const sanitizeParams = (params: Record<string, unknown>) => {
    return sanitizeAPIParams(params);
  };

  const checkRateLimit = (domain: string) => {
    return rateLimiter.checkRateLimit(domain);
  };

  const getRateLimitStatus = (domain: string) => {
    return rateLimiter.getRateLimitStatus(domain);
  };

  return {
    makeSecureAPIRequest,
    validateKey,
    sanitizeParams,
    checkRateLimit,
    getRateLimitStatus,
    validateResponse: validateAPIResponse,
  };
}