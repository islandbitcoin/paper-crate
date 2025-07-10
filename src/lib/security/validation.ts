/**
 * Security validation utilities for Paper Crate
 * These functions help prevent common security vulnerabilities
 */

// URL validation for external links
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Prevent localhost and private IPs
    const hostname = parsed.hostname.toLowerCase();
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.startsWith('172.')
    ) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

// Social media URL validation with platform whitelist
const ALLOWED_SOCIAL_DOMAINS = [
  'twitter.com',
  'x.com',
  'instagram.com',
  'youtube.com',
  'tiktok.com',
  'threads.net',
  'nostr.com',
  'primal.net',
  'snort.social',
  'iris.to',
];

export function isValidSocialUrl(url: string): boolean {
  if (!isValidUrl(url)) return false;
  
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    
    return ALLOWED_SOCIAL_DOMAINS.some(domain => 
      hostname === domain || 
      hostname === `www.${domain}` ||
      hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

// Lightning address validation
export function isValidLightningAddress(address: string): boolean {
  if (!address || typeof address !== 'string') return false;
  
  // LUD-16 format: username@domain.com
  const lud16Regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  
  // LUD-06 format: https://domain.com/.well-known/lnurlp/username
  const lud06Regex = /^https:\/\/[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}(\/.*)?$/;
  
  return lud16Regex.test(address) || lud06Regex.test(address);
}

// Amount validation for payments
export function isValidPaymentAmount(amount: number, min = 1, max = 1000000): boolean {
  return (
    typeof amount === 'number' &&
    !isNaN(amount) &&
    amount >= min &&
    amount <= max &&
    amount === Math.floor(amount) // Must be whole sats
  );
}

// Sanitize user input for display
export function sanitizeText(text: string, maxLength = 1000): string {
  if (!text || typeof text !== 'string') return '';
  
  // Remove control characters and trim
  let sanitized = text
    .split('')
    .filter(char => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127; // Allow printable characters only
    })
    .join('')
    .trim();
  
  // Limit length
  if (sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength) + '...';
  }
  
  return sanitized;
}

// Validate campaign budget
export function isValidBudget(budget: number): boolean {
  return isValidPaymentAmount(budget, 1000, 10000000); // 1k to 10M sats
}

// Validate platform name
const VALID_PLATFORMS = ['twitter', 'instagram', 'youtube', 'tiktok', 'threads', 'nostr'];

export function isValidPlatform(platform: string): boolean {
  return VALID_PLATFORMS.includes(platform.toLowerCase());
}

// Rate limiting helper
interface RateLimitEntry {
  count: number;
  resetTime: number;
}

class RateLimiter {
  private limits: Map<string, RateLimitEntry> = new Map();
  
  constructor(
    private maxAttempts: number,
    private windowMs: number
  ) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const entry = this.limits.get(key);
    
    if (!entry || now > entry.resetTime) {
      // New window
      this.limits.set(key, {
        count: 1,
        resetTime: now + this.windowMs,
      });
      return true;
    }
    
    if (entry.count >= this.maxAttempts) {
      return false;
    }
    
    entry.count++;
    return true;
  }
  
  reset(key: string): void {
    this.limits.delete(key);
  }
  
  cleanup(): void {
    const now = Date.now();
    for (const [key, entry] of this.limits.entries()) {
      if (now > entry.resetTime) {
        this.limits.delete(key);
      }
    }
  }
}

// Export rate limiters for different operations
export const applicationRateLimiter = new RateLimiter(5, 60000); // 5 per minute
export const reportRateLimiter = new RateLimiter(10, 60000); // 10 per minute
export const paymentRateLimiter = new RateLimiter(3, 60000); // 3 per minute

// Cleanup rate limiters periodically
setInterval(() => {
  applicationRateLimiter.cleanup();
  reportRateLimiter.cleanup();
  paymentRateLimiter.cleanup();
}, 60000); // Every minute