/**
 * Security configuration and constants
 */

export const SECURITY_CONFIG = {
  // Payment limits
  payment: {
    minAmount: 1, // 1 sat minimum
    maxAmount: 1000000, // 1M sats maximum per payment
    maxDailyAmount: 10000000, // 10M sats daily limit
    confirmationThreshold: 100000, // Require extra confirmation above 100k sats
    cooldownPeriod: 10000, // 10 seconds between payments
  },
  
  // Rate limiting
  rateLimit: {
    applications: {
      maxPerMinute: 5,
      maxPerHour: 20,
    },
    reports: {
      maxPerMinute: 10,
      maxPerHour: 50,
    },
    payments: {
      maxPerMinute: 3,
      maxPerHour: 20,
    },
    events: {
      maxPerMinute: 30,
      maxPerHour: 500,
    },
  },
  
  // Session management
  session: {
    idleTimeout: 1800000, // 30 minutes
    maxDuration: 86400000, // 24 hours
    rememberMeDuration: 604800000, // 7 days
  },
  
  // Input validation
  validation: {
    maxMessageLength: 1000,
    maxCampaignNameLength: 100,
    maxCampaignDescriptionLength: 500,
    maxUrlLength: 2048,
    maxUsernameLength: 50,
  },
  
  // Content Security Policy
  csp: {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // TODO: Remove unsafe-inline
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:", "https:", "blob:"],
    connectSrc: ["'self'", "wss:", "https:"],
    fontSrc: ["'self'"],
    objectSrc: ["'none'"],
    mediaSrc: ["'self'"],
    frameSrc: ["'none'"],
  },
  
  // Trusted domains
  trustedDomains: {
    social: [
      'twitter.com',
      'x.com',
      'instagram.com',
      'youtube.com',
      'tiktok.com',
      'threads.net',
    ],
    lightning: [
      'getalby.com',
      'walletofsatoshi.com',
      'strike.me',
      'zebedee.io',
      'lnbits.com',
    ],
    nostr: [
      'relay.damus.io',
      'relay.nostr.band',
      'relay.primal.net',
      'relay.snort.social',
    ],
  },
  
  // Security headers
  headers: {
    'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'geolocation=(), camera=(), microphone=()',
  },
};

// Security error messages (user-friendly, no internal details)
export const SECURITY_ERRORS = {
  INVALID_INPUT: 'Invalid input provided. Please check your data and try again.',
  RATE_LIMIT: 'Too many requests. Please wait a moment and try again.',
  UNAUTHORIZED: 'You are not authorized to perform this action.',
  INVALID_PAYMENT: 'Payment validation failed. Please verify the amount and try again.',
  SESSION_EXPIRED: 'Your session has expired. Please log in again.',
  INVALID_URL: 'The provided URL is not valid or not from an allowed domain.',
  AMOUNT_TOO_HIGH: 'The payment amount exceeds the maximum allowed limit.',
  AMOUNT_TOO_LOW: 'The payment amount is below the minimum required.',
};

// Environment-specific settings
export const IS_PRODUCTION = import.meta.env.PROD;
export const ENABLE_SECURITY_LOGS = !IS_PRODUCTION;
export const ENABLE_DETAILED_ERRORS = !IS_PRODUCTION;