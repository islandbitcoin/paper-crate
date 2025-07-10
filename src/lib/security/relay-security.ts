/**
 * Nostr relay security and validation utilities
 */
import { type NostrEvent } from '@nostrify/nostrify';
import { securityMonitor } from './monitoring';
import { validateUrl } from './communication';

export interface RelaySecurityConfig {
  allowedRelays?: string[];
  blockedRelays?: string[];
  maxConnectionTime?: number;
  maxEventsPerSecond?: number;
  validateEvents?: boolean;
  requireTLS?: boolean;
}

export interface RelayValidationResult {
  valid: boolean;
  reason?: string;
  warnings?: string[];
}

export interface RelayMetrics {
  url: string;
  connected: boolean;
  lastConnected?: number;
  connectionCount: number;
  eventsSent: number;
  eventsReceived: number;
  errors: number;
  avgResponseTime: number;
  trustScore: number;
}

/**
 * Default relay security configuration
 */
export const DEFAULT_RELAY_CONFIG: RelaySecurityConfig = {
  allowedRelays: [
    'wss://relay.nostr.band',
    'wss://relay.damus.io',
    'wss://nos.lol',
    'wss://relay.primal.net',
    'wss://nostr.mutinywallet.com',
    'wss://relay.snort.social',
  ],
  blockedRelays: [
    // Known malicious or problematic relays can be added here
  ],
  maxConnectionTime: 300000, // 5 minutes
  maxEventsPerSecond: 10,
  validateEvents: true,
  requireTLS: true,
};

/**
 * Known relay information for security validation
 */
export const KNOWN_RELAYS = {
  'wss://relay.nostr.band': {
    name: 'Nostr Band',
    trustScore: 9,
    features: ['nip11', 'nip42'],
    operator: 'nostr.band',
  },
  'wss://relay.damus.io': {
    name: 'Damus',
    trustScore: 9,
    features: ['nip11', 'nip42'],
    operator: 'damus.io',
  },
  'wss://nos.lol': {
    name: 'nos.lol',
    trustScore: 8,
    features: ['nip11'],
    operator: 'nos.lol',
  },
  'wss://relay.primal.net': {
    name: 'Primal',
    trustScore: 8,
    features: ['nip11'],
    operator: 'primal.net',
  },
};

/**
 * Validate relay URL for security
 */
export function validateRelayUrl(
  relayUrl: string,
  config: RelaySecurityConfig = DEFAULT_RELAY_CONFIG
): RelayValidationResult {
  const warnings: string[] = [];

  try {
    const url = new URL(relayUrl);

    // Check protocol
    if (config.requireTLS && url.protocol !== 'wss:') {
      return {
        valid: false,
        reason: 'Relay must use secure WebSocket (wss://) protocol',
      };
    }

    if (!['ws:', 'wss:'].includes(url.protocol)) {
      return {
        valid: false,
        reason: 'Invalid protocol. Only ws:// and wss:// are supported',
      };
    }

    // Basic URL validation
    const urlValidation = validateUrl(url);
    if (!urlValidation.valid) {
      return {
        valid: false,
        reason: urlValidation.reason,
      };
    }

    // Check against blocked relays
    if (config.blockedRelays?.includes(relayUrl)) {
      return {
        valid: false,
        reason: 'Relay is in blocked list',
      };
    }

    // Check against allowed relays (if allowlist is defined)
    if (config.allowedRelays && config.allowedRelays.length > 0) {
      const isAllowed = config.allowedRelays.some(allowed => {
        if (allowed.includes('*')) {
          // Wildcard matching
          const pattern = allowed.replace(/\*/g, '.*');
          return new RegExp(`^${pattern}$`).test(relayUrl);
        }
        return relayUrl === allowed;
      });

      if (!isAllowed) {
        return {
          valid: false,
          reason: 'Relay is not in allowed list',
        };
      }
    }

    // Check if relay is known and trusted
    const knownRelay = KNOWN_RELAYS[relayUrl as keyof typeof KNOWN_RELAYS];
    if (!knownRelay) {
      warnings.push('Relay is not in the known/trusted relay list');
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /localhost/i,
      /127\.0\.0\.1/,
      /192\.168\./,
      /10\./,
      /\.onion$/,
    ];

    if (import.meta.env.PROD && suspiciousPatterns.some(pattern => pattern.test(url.hostname))) {
      warnings.push('Relay hostname appears to be local or private');
    }

    return {
      valid: true,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  } catch {
    return {
      valid: false,
      reason: 'Invalid relay URL format',
    };
  }
}

/**
 * Validate Nostr event for security issues
 */
export function validateNostrEventSecurity(event: NostrEvent): RelayValidationResult {
  const warnings: string[] = [];

  // Basic structure validation
  if (!event.id || !event.pubkey || !event.sig || typeof event.created_at !== 'number') {
    return {
      valid: false,
      reason: 'Event missing required fields',
    };
  }

  // Check timestamp bounds
  const now = Math.floor(Date.now() / 1000);
  const maxFuture = 3600; // 1 hour
  const maxPast = 86400 * 365; // 1 year

  if (event.created_at > now + maxFuture) {
    return {
      valid: false,
      reason: 'Event timestamp too far in the future',
    };
  }

  if (event.created_at < now - maxPast) {
    warnings.push('Event timestamp is very old');
  }

  // Check content length (prevent DoS)
  if (event.content && event.content.length > 100000) { // 100KB limit
    return {
      valid: false,
      reason: 'Event content exceeds maximum length',
    };
  }

  // Check tag count and structure
  if (event.tags && event.tags.length > 1000) {
    return {
      valid: false,
      reason: 'Event has too many tags',
    };
  }

  // Validate individual tags
  if (event.tags) {
    for (const tag of event.tags) {
      if (!Array.isArray(tag) || tag.length === 0) {
        warnings.push('Invalid tag structure detected');
        continue;
      }

      // Check tag length
      if (tag.some(item => typeof item === 'string' && item.length > 1000)) {
        warnings.push('Tag contains very long string');
      }
    }
  }

  // Check for suspicious content patterns
  if (event.content) {
    const suspiciousPatterns = [
      /<script/i,
      /javascript:/i,
      /data:text\/html/i,
      /\0/, // Null bytes
    ];

    if (suspiciousPatterns.some(pattern => pattern.test(event.content))) {
      warnings.push('Event content contains potentially suspicious patterns');
    }
  }

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

/**
 * Calculate relay trust score based on metrics
 */
export function calculateRelayTrustScore(metrics: Partial<RelayMetrics>): number {
  let score = 5; // Base score

  // Known relay bonus
  if (metrics.url && KNOWN_RELAYS[metrics.url as keyof typeof KNOWN_RELAYS]) {
    score += 3;
  }

  // Connection stability
  if (metrics.connectionCount && metrics.connectionCount > 10) {
    score += Math.min(2, metrics.connectionCount / 50);
  }

  // Error rate penalty
  if (metrics.errors && metrics.eventsSent) {
    const errorRate = metrics.errors / (metrics.eventsSent + (metrics.eventsReceived || 0));
    score -= errorRate * 5;
  }

  // Response time factor
  if (metrics.avgResponseTime) {
    if (metrics.avgResponseTime < 1000) score += 1; // Fast response
    else if (metrics.avgResponseTime > 5000) score -= 1; // Slow response
  }

  return Math.max(0, Math.min(10, score));
}

/**
 * Relay connection manager with security features
 */
export class SecureRelayManager {
  private relayMetrics = new Map<string, RelayMetrics>();
  private rateLimiters = new Map<string, { count: number; resetTime: number }>();
  private config: RelaySecurityConfig;

  constructor(config: RelaySecurityConfig = DEFAULT_RELAY_CONFIG) {
    this.config = config;
  }

  /**
   * Validate and add relay
   */
  validateRelay(relayUrl: string): RelayValidationResult {
    const result = validateRelayUrl(relayUrl, this.config);
    
    if (result.valid) {
      // Initialize metrics if not exists
      if (!this.relayMetrics.has(relayUrl)) {
        this.relayMetrics.set(relayUrl, {
          url: relayUrl,
          connected: false,
          connectionCount: 0,
          eventsSent: 0,
          eventsReceived: 0,
          errors: 0,
          avgResponseTime: 0,
          trustScore: 5,
        });
      }

      securityMonitor.logEvent({
        type: 'relay_validated',
        details: {
          url: relayUrl,
          warnings: result.warnings,
        },
        severity: 'low',
      });
    } else {
      securityMonitor.logEvent({
        type: 'relay_validation_failed',
        details: {
          url: relayUrl,
          reason: result.reason,
        },
        severity: 'medium',
      });
    }

    return result;
  }

  /**
   * Check rate limit for relay
   */
  checkRateLimit(relayUrl: string): boolean {
    if (!this.config.maxEventsPerSecond) return true;

    const now = Date.now();
    const limiter = this.rateLimiters.get(relayUrl);

    if (!limiter || now > limiter.resetTime) {
      this.rateLimiters.set(relayUrl, {
        count: 1,
        resetTime: now + 1000,
      });
      return true;
    }

    if (limiter.count >= this.config.maxEventsPerSecond) {
      securityMonitor.logEvent({
        type: 'relay_rate_limit_exceeded',
        details: {
          url: relayUrl,
          limit: this.config.maxEventsPerSecond,
        },
        severity: 'medium',
      });
      return false;
    }

    limiter.count++;
    return true;
  }

  /**
   * Record relay metrics
   */
  recordRelayMetric(
    relayUrl: string,
    type: 'connect' | 'disconnect' | 'send' | 'receive' | 'error',
    responseTime?: number
  ): void {
    const metrics = this.relayMetrics.get(relayUrl);
    if (!metrics) return;

    switch (type) {
      case 'connect':
        metrics.connected = true;
        metrics.connectionCount++;
        metrics.lastConnected = Date.now();
        break;
      case 'disconnect':
        metrics.connected = false;
        break;
      case 'send':
        metrics.eventsSent++;
        break;
      case 'receive':
        metrics.eventsReceived++;
        break;
      case 'error':
        metrics.errors++;
        break;
    }

    if (responseTime !== undefined) {
      // Calculate moving average
      metrics.avgResponseTime = 
        (metrics.avgResponseTime * 0.8) + (responseTime * 0.2);
    }

    // Update trust score
    metrics.trustScore = calculateRelayTrustScore(metrics);

    this.relayMetrics.set(relayUrl, metrics);
  }

  /**
   * Get relay metrics
   */
  getRelayMetrics(relayUrl?: string): RelayMetrics | RelayMetrics[] {
    if (relayUrl) {
      return this.relayMetrics.get(relayUrl) || {
        url: relayUrl,
        connected: false,
        connectionCount: 0,
        eventsSent: 0,
        eventsReceived: 0,
        errors: 0,
        avgResponseTime: 0,
        trustScore: 0,
      };
    }

    return Array.from(this.relayMetrics.values());
  }

  /**
   * Get recommended relays based on trust scores
   */
  getRecommendedRelays(): RelayMetrics[] {
    return Array.from(this.relayMetrics.values())
      .sort((a, b) => b.trustScore - a.trustScore)
      .slice(0, 5);
  }
}

/**
 * Hook for relay security management
 */
export function useRelaySecurity(config?: RelaySecurityConfig) {
  const manager = new SecureRelayManager(config);

  const validateRelay = (relayUrl: string) => {
    return manager.validateRelay(relayUrl);
  };

  const checkRateLimit = (relayUrl: string) => {
    return manager.checkRateLimit(relayUrl);
  };

  const validateEvent = (event: NostrEvent) => {
    return validateNostrEventSecurity(event);
  };

  const getMetrics = (relayUrl?: string) => {
    return manager.getRelayMetrics(relayUrl);
  };

  const getRecommended = () => {
    return manager.getRecommendedRelays();
  };

  return {
    validateRelay,
    checkRateLimit,
    validateEvent,
    getMetrics,
    getRecommended,
    recordMetric: manager.recordRelayMetric.bind(manager),
  };
}