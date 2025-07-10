# Security Hardening Roadmap for Paper Crate

## Overview

This document outlines a comprehensive security hardening roadmap for the Paper Crate platform, focusing on protecting user funds, data integrity, and preventing common attack vectors in decentralized applications.

## Security Priorities

1. **Payment Security** - Protecting Lightning payments and preventing fund theft
2. **Data Integrity** - Ensuring Nostr events cannot be tampered with
3. **Authentication** - Secure user authentication and session management
4. **Input Validation** - Preventing injection attacks and data corruption
5. **Rate Limiting** - Protecting against spam and DoS attacks

## Phase 1: Critical Security Fixes (Week 1-2)

### 1.1 Payment Security Enhancements

- [ ] **Invoice Verification**
  - Implement strict validation of Lightning invoice amounts
  - Verify invoice matches the approved report amount
  - Add payment amount limits per transaction
  - Code location: `src/components/PayCreatorButton.tsx`

- [ ] **Payment Authorization**
  - Add confirmation dialogs for payments over certain thresholds
  - Implement 2-factor authentication for large payments
  - Add payment cooldown periods to prevent rapid draining
  - Store payment attempts in local storage for audit trail

- [ ] **Lightning Address Validation**
  - Validate Lightning addresses before requesting invoices
  - Implement domain whitelist for Lightning address providers
  - Add DNS verification for lud16 addresses
  - Cache validated addresses with expiration

### 1.2 Event Signature Verification

- [ ] **Nostr Event Validation**
  - Verify all incoming Nostr events have valid signatures
  - Implement event replay attack prevention
  - Add timestamp validation (events not too old/future)
  - Code location: `src/hooks/usePerformanceReports.ts`

- [ ] **Content Integrity**
  - Hash verification for report content
  - Prevent modification of approved reports
  - Add checksums to critical data fields

### 1.3 Input Sanitization

- [ ] **XSS Prevention**
  - Sanitize all user-generated content before rendering
  - Use DOMPurify for HTML content sanitization
  - Escape special characters in URLs and text
  - Code locations: 
    - `src/components/NoteContent.tsx`
    - `src/components/CreateCampaignDialog.tsx`
    - `src/components/ApplyCampaignDialog.tsx`

- [ ] **URL Validation**
  - Validate all external URLs (social media posts, websites)
  - Implement URL whitelist for known platforms
  - Prevent javascript: and data: URLs
  - Add Content Security Policy headers

## Phase 2: Authentication & Authorization (Week 3-4)

### 2.1 Enhanced Authentication

- [ ] **Session Management**
  - Implement session timeout for idle users
  - Add "Remember Me" functionality with secure tokens
  - Clear sensitive data on logout
  - Prevent concurrent sessions if needed

- [ ] **NIP-07 Security**
  - Validate signer responses
  - Handle malicious signer extensions
  - Add permission scopes for different operations
  - Implement signing request throttling

### 2.2 Role-Based Access Control

- [ ] **Permission System**
  - Clearly separate business and creator permissions
  - Prevent creators from approving their own reports
  - Add admin role for platform management
  - Implement permission checks on all sensitive operations

- [ ] **API Rate Limiting**
  - Implement rate limits for Nostr event publishing
  - Add cooldowns for application submissions
  - Throttle report submissions per creator
  - Prevent spam campaign creation

## Phase 3: Data Protection (Week 5-6)

### 3.1 Encryption

- [ ] **Sensitive Data Encryption**
  - Encrypt API keys in localStorage
  - Use NIP-44 for private messages between users
  - Encrypt payment metadata
  - Implement key rotation strategy

- [ ] **Secure Storage**
  - Move sensitive data out of localStorage where possible
  - Implement secure key management
  - Add data expiration for cached content
  - Clear sensitive data on app close

### 3.2 Privacy Enhancements

- [ ] **Data Minimization**
  - Only request necessary permissions
  - Allow users to delete their data
  - Implement data retention policies
  - Add privacy mode for sensitive operations

- [ ] **Anonymous Usage**
  - Support viewing campaigns without login
  - Allow anonymous browsing of public data
  - Implement optional analytics opt-out
  - Respect Do Not Track headers

## Phase 4: Infrastructure Security (Week 7-8)

### 4.1 Relay Security

- [ ] **Relay Authentication**
  - Implement NIP-42 relay authentication
  - Use AUTH for write operations
  - Validate relay SSL certificates
  - Implement relay reputation system

- [ ] **Relay Redundancy**
  - Use multiple relays for critical operations
  - Implement relay failover
  - Add relay health monitoring
  - Cache important events locally

### 4.2 Client Security

- [ ] **Build Security**
  - Implement Subresource Integrity (SRI)
  - Enable strict Content Security Policy
  - Remove source maps from production
  - Implement anti-tampering checks

- [ ] **Dependencies**
  - Regular dependency audits
  - Automated security updates
  - Remove unused dependencies
  - Pin dependency versions

## Phase 5: Monitoring & Incident Response (Week 9-10)

### 5.1 Security Monitoring

- [ ] **Audit Logging**
  - Log all payment attempts
  - Track authentication events
  - Monitor suspicious patterns
  - Implement anomaly detection

- [ ] **Error Handling**
  - Sanitize error messages
  - Implement proper error boundaries
  - Add crash reporting
  - Hide stack traces in production

### 5.2 Incident Response

- [ ] **Security Procedures**
  - Create incident response plan
  - Implement emergency shutdown
  - Add ability to freeze suspicious accounts
  - Create security contact page

- [ ] **Recovery Mechanisms**
  - Implement account recovery
  - Add payment dispute process
  - Create backup/restore functionality
  - Document disaster recovery

## Implementation Guidelines

### Security Best Practices

1. **Principle of Least Privilege**
   - Grant minimum necessary permissions
   - Separate concerns between components
   - Use read-only access where possible

2. **Defense in Depth**
   - Multiple layers of security
   - Fail securely (deny by default)
   - Validate at every layer

3. **Security by Design**
   - Consider security in all new features
   - Regular security reviews
   - Threat modeling for new components

### Testing Requirements

- [ ] **Security Testing**
  - Penetration testing for payment flows
  - Fuzzing for input validation
  - Static analysis for vulnerabilities
  - Regular security audits

- [ ] **Automated Testing**
  - Security-focused unit tests
  - Integration tests for auth flows
  - End-to-end security scenarios
  - Performance testing for DoS resistance

### Code Examples

#### Input Validation Example
```typescript
// src/lib/validation/security.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
    ALLOWED_ATTR: ['href', 'target', 'rel'],
  });
}

export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    // Check against domain whitelist
    const allowedDomains = [
      'twitter.com', 'x.com', 'instagram.com', 
      'youtube.com', 'tiktok.com', 'threads.net'
    ];
    return allowedDomains.some(domain => 
      parsed.hostname === domain || 
      parsed.hostname.endsWith(`.${domain}`)
    );
  } catch {
    return false;
  }
}

export function validateLightningAddress(address: string): boolean {
  // Basic format validation
  const lud16Regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const lud06Regex = /^https:\/\/.+$/;
  
  return lud16Regex.test(address) || lud06Regex.test(address);
}
```

#### Payment Security Example
```typescript
// src/hooks/useSecurePayment.ts
export function useSecurePayment() {
  const { toast } = useToast();
  
  const validateInvoice = async (
    invoice: string, 
    expectedAmount: number
  ): Promise<boolean> => {
    try {
      // Decode invoice to verify amount
      const decoded = lightningPayReq.decode(invoice);
      
      // Check amount matches (with small tolerance for fees)
      const tolerance = 0.01; // 1% tolerance
      const invoiceAmount = decoded.satoshis || 0;
      const difference = Math.abs(invoiceAmount - expectedAmount);
      
      if (difference > expectedAmount * tolerance) {
        toast({
          title: 'Invalid Invoice Amount',
          description: `Expected ${expectedAmount} sats, got ${invoiceAmount} sats`,
          variant: 'destructive',
        });
        return false;
      }
      
      // Check invoice hasn't expired
      const expiryTime = decoded.timestamp + decoded.expiry;
      if (Date.now() / 1000 > expiryTime) {
        toast({
          title: 'Invoice Expired',
          description: 'Please request a new invoice',
          variant: 'destructive',
        });
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('Invoice validation failed:', error);
      return false;
    }
  };
  
  return { validateInvoice };
}
```

#### Rate Limiting Example
```typescript
// src/lib/security/rateLimiter.ts
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export class RateLimiter {
  private attempts: Map<string, number[]> = new Map();
  
  constructor(private config: RateLimitConfig) {}
  
  isAllowed(key: string): boolean {
    const now = Date.now();
    const attempts = this.attempts.get(key) || [];
    
    // Remove old attempts outside window
    const validAttempts = attempts.filter(
      time => now - time < this.config.windowMs
    );
    
    if (validAttempts.length >= this.config.maxRequests) {
      return false;
    }
    
    // Add new attempt
    validAttempts.push(now);
    this.attempts.set(key, validAttempts);
    
    return true;
  }
  
  reset(key: string): void {
    this.attempts.delete(key);
  }
}

// Usage
const paymentLimiter = new RateLimiter({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 3, // 3 payments per minute
});
```

## Security Checklist

Before each release, ensure:

- [ ] All user inputs are validated and sanitized
- [ ] Payment amounts are verified before processing
- [ ] Nostr events are signature-verified
- [ ] No sensitive data in console logs
- [ ] Error messages don't leak information
- [ ] Dependencies are up to date
- [ ] Security headers are configured
- [ ] Rate limiting is active
- [ ] Audit logs are working
- [ ] Emergency shutdown is tested

## Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Nostr Security Best Practices](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [Lightning Network Security](https://github.com/lightning/bolts)
- [React Security Best Practices](https://react.dev/learn/security)

## Security Contact

For security vulnerabilities, please contact:
- Email: security@papercrate.app (to be set up)
- Nostr: [security announcement pubkey]
- Use responsible disclosure practices

## Conclusion

Security is an ongoing process. This roadmap should be reviewed and updated quarterly as new threats emerge and the platform evolves. Regular security audits and penetration testing should be conducted to validate these measures.