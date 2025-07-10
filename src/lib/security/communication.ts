/**
 * Secure communication utilities for API calls and WebSocket connections
 */
import { securityMonitor } from './monitoring';

export interface SecureRequestOptions {
  timeout?: number;
  retries?: number;
  validateResponse?: (response: Response) => boolean;
  sanitizeUrl?: boolean;
  allowedDomains?: string[];
  headers?: Record<string, string>;
}

export interface WebSocketSecurityOptions {
  timeout?: number;
  reconnectAttempts?: number;
  validateOrigin?: boolean;
  allowedOrigins?: string[];
  heartbeatInterval?: number;
}

/**
 * Secure fetch wrapper with validation and security measures
 */
export async function secureFetch(
  url: string | URL,
  options: RequestInit & SecureRequestOptions = {}
): Promise<Response> {
  const {
    timeout = 10000,
    retries = 3,
    validateResponse,
    sanitizeUrl = true,
    allowedDomains = [],
    ...fetchOptions
  } = options;

  let urlObj: URL;
  
  try {
    urlObj = new URL(url);
  } catch {
    throw new Error('Invalid URL provided');
  }

  // Validate URL security
  if (sanitizeUrl) {
    const validationResult = validateUrl(urlObj, allowedDomains);
    if (!validationResult.valid) {
      securityMonitor.logEvent({
        type: 'blocked_request',
        details: {
          url: urlObj.toString(),
          reason: validationResult.reason,
        },
        severity: 'medium',
      });
      throw new Error(`Blocked request: ${validationResult.reason}`);
    }
  }

  // Set default security headers
  const secureHeaders: Record<string, string> = {
    'X-Requested-With': 'XMLHttpRequest',
    'Accept': 'application/json, text/plain, */*',
    ...(fetchOptions.headers as Record<string, string> || {}),
  };

  // Remove potential XSS vectors from headers
  const sanitizedHeaders = sanitizeHeaders(secureHeaders);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetch(urlObj, {
        ...fetchOptions,
        headers: sanitizedHeaders,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Validate response if validator provided
      if (validateResponse && !validateResponse(response)) {
        throw new Error('Response validation failed');
      }

      // Check for suspicious response headers
      validateResponseHeaders(response);

      securityMonitor.logEvent({
        type: 'secure_request_success',
        details: {
          url: urlObj.origin,
          status: response.status,
          attempt: attempt + 1,
        },
        severity: 'low',
      });

      return response;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (attempt === retries) {
        securityMonitor.logEvent({
          type: 'secure_request_failed',
          details: {
            url: urlObj.origin,
            error: lastError.message,
            attempts: retries + 1,
          },
          severity: 'medium',
        });
        break;
      }

      // Wait before retry (exponential backoff)
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
    }
  }

  clearTimeout(timeoutId);
  throw lastError || new Error('Request failed after all retries');
}

/**
 * Validate URL for security issues
 */
export function validateUrl(
  url: URL,
  allowedDomains: string[] = []
): { valid: boolean; reason?: string } {
  // Check protocol
  if (!['https:', 'wss:'].includes(url.protocol)) {
    return { valid: false, reason: 'Only HTTPS and WSS protocols allowed' };
  }

  // Check for localhost/private IPs in production
  if (import.meta.env.PROD) {
    const hostname = url.hostname.toLowerCase();
    
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname === '::1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return { valid: false, reason: 'Private/local addresses not allowed in production' };
    }
  }

  // Check against allowed domains if specified
  if (allowedDomains.length > 0) {
    const isAllowed = allowedDomains.some(domain => {
      if (domain.startsWith('*.')) {
        // Wildcard subdomain
        const baseDomain = domain.slice(2);
        return url.hostname === baseDomain || url.hostname.endsWith(`.${baseDomain}`);
      }
      return url.hostname === domain;
    });

    if (!isAllowed) {
      return { valid: false, reason: 'Domain not in allowed list' };
    }
  }

  // Check for suspicious path patterns
  const suspiciousPatterns = [
    /\.\./,  // Path traversal
    /%2e%2e/i,  // Encoded path traversal
    /javascript:/i,  // JavaScript protocol
    /data:/i,  // Data URLs (can be XSS vectors)
  ];

  if (suspiciousPatterns.some(pattern => pattern.test(url.href))) {
    return { valid: false, reason: 'Suspicious URL pattern detected' };
  }

  return { valid: true };
}

/**
 * Sanitize HTTP headers to prevent injection attacks
 */
export function sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
  const sanitized: Record<string, string> = {};

  Object.entries(headers).forEach(([key, value]) => {
    // Remove control characters and potential injection vectors
    const cleanKey = key.replace(/[\r\n\t]/g, '').trim();
    const cleanValue = value.replace(/[\r\n\t]/g, '').trim();

    // Skip empty or invalid headers
    if (cleanKey && cleanValue && !cleanKey.includes(' ')) {
      sanitized[cleanKey] = cleanValue;
    }
  });

  return sanitized;
}

/**
 * Validate response headers for security issues
 */
export function validateResponseHeaders(response: Response): void {
  const headers = response.headers;

  // Check for missing security headers
  const securityHeaders = [
    'x-content-type-options',
    'x-frame-options',
    'x-xss-protection',
  ];

  const missingHeaders = securityHeaders.filter(header => !headers.has(header));
  
  if (missingHeaders.length > 0) {
    securityMonitor.logEvent({
      type: 'missing_security_headers',
      details: {
        url: response.url,
        missingHeaders,
      },
      severity: 'low',
    });
  }

  // Check for suspicious content types
  const contentType = headers.get('content-type');
  if (contentType && contentType.includes('text/html') && response.url.includes('api')) {
    securityMonitor.logEvent({
      type: 'suspicious_content_type',
      details: {
        url: response.url,
        contentType,
      },
      severity: 'medium',
    });
  }
}

/**
 * Secure WebSocket connection wrapper
 */
export class SecureWebSocket {
  private ws: WebSocket | null = null;
  private options: WebSocketSecurityOptions;
  private reconnectCount = 0;
  private heartbeatTimer: number | null = null;
  private isIntentionallyClosed = false;

  constructor(
    private url: string,
    private protocols?: string | string[],
    options: WebSocketSecurityOptions = {}
  ) {
    this.options = {
      timeout: 10000,
      reconnectAttempts: 5,
      validateOrigin: true,
      allowedOrigins: [],
      heartbeatInterval: 30000,
      ...options,
    };
  }

  async connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const urlObj = new URL(this.url);
        
        // Validate URL
        const validation = validateUrl(urlObj, this.options.allowedOrigins);
        if (!validation.valid) {
          reject(new Error(`WebSocket connection blocked: ${validation.reason}`));
          return;
        }

        this.ws = new WebSocket(this.url, this.protocols);
        
        const timeout = setTimeout(() => {
          if (this.ws && this.ws.readyState === WebSocket.CONNECTING) {
            this.ws.close();
            reject(new Error('WebSocket connection timeout'));
          }
        }, this.options.timeout);

        this.ws.onopen = () => {
          clearTimeout(timeout);
          this.reconnectCount = 0;
          this.startHeartbeat();
          
          securityMonitor.logEvent({
            type: 'websocket_connected',
            details: { url: urlObj.origin },
            severity: 'low',
          });
          
          resolve();
        };

        this.ws.onerror = (error) => {
          clearTimeout(timeout);
          securityMonitor.logEvent({
            type: 'websocket_error',
            details: { 
              url: urlObj.origin,
              error: error.toString(),
            },
            severity: 'medium',
          });
          reject(error);
        };

        this.ws.onclose = () => {
          this.stopHeartbeat();
          
          if (!this.isIntentionallyClosed && this.reconnectCount < (this.options.reconnectAttempts || 5)) {
            setTimeout(() => {
              this.reconnectCount++;
              this.connect().catch(console.error);
            }, Math.pow(2, this.reconnectCount) * 1000);
          }
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  send(data: string | ArrayBufferLike | Blob | ArrayBufferView): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      // Validate data before sending
      if (typeof data === 'string') {
        const sanitized = this.sanitizeMessage(data);
        this.ws.send(sanitized);
      } else {
        this.ws.send(data);
      }
    } else {
      throw new Error('WebSocket is not connected');
    }
  }

  close(code?: number, reason?: string): void {
    this.isIntentionallyClosed = true;
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close(code, reason);
    }
  }

  onMessage(callback: (data: MessageEvent) => void): void {
    if (this.ws) {
      this.ws.onmessage = (event) => {
        // Validate message before processing
        if (this.validateMessage(event.data)) {
          callback(event);
        }
      };
    }
  }

  private sanitizeMessage(message: string): string {
    // Remove potential XSS vectors
    return message.replace(/[<>]/g, '');
  }

  private validateMessage(data: unknown): boolean {
    // Basic validation - ensure it's not malicious
    if (typeof data === 'string') {
      // Check for suspicious patterns
      const suspiciousPatterns = [
        /<script/i,
        /javascript:/i,
        /on\w+\s*=/i,
      ];
      
      if (suspiciousPatterns.some(pattern => pattern.test(data))) {
        securityMonitor.logEvent({
          type: 'suspicious_websocket_message',
          details: { 
            pattern: 'Potential XSS vector detected',
            messageLength: data.length,
          },
          severity: 'high',
        });
        return false;
      }
    }
    
    return true;
  }

  private startHeartbeat(): void {
    if (this.options.heartbeatInterval) {
      this.heartbeatTimer = window.setInterval(() => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, this.options.heartbeatInterval);
    }
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

/**
 * Hook for secure communication
 */
export function useSecureCommunication() {
  const makeSecureRequest = async (
    url: string,
    options?: RequestInit & SecureRequestOptions
  ): Promise<Response> => {
    return secureFetch(url, options);
  };

  const createSecureWebSocket = (
    url: string,
    protocols?: string | string[],
    options?: WebSocketSecurityOptions
  ): SecureWebSocket => {
    return new SecureWebSocket(url, protocols, options);
  };

  const validateRequestUrl = (url: string, allowedDomains?: string[]) => {
    try {
      return validateUrl(new URL(url), allowedDomains);
    } catch {
      return { valid: false, reason: 'Invalid URL format' };
    }
  };

  return {
    makeSecureRequest,
    createSecureWebSocket,
    validateRequestUrl,
    sanitizeHeaders,
  };
}