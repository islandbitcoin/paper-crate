/**
 * Lightning Network payment validation utilities
 */
import { decode } from 'bolt11';
import { SECURITY_CONFIG } from './config';
import { logInvalidInvoice } from './monitoring';

export interface ValidatedInvoice {
  paymentRequest: string;
  satoshis: number;
  timestamp: number;
  expiry: number;
  description: string;
  paymentHash: string;
}

/**
 * Validates a Lightning invoice and extracts key information
 */
export function validateLightningInvoice(
  invoice: string,
  expectedAmount?: number,
  userId?: string
): { valid: boolean; invoice?: ValidatedInvoice; error?: string } {
  try {
    // Basic format check
    if (!invoice || typeof invoice !== 'string') {
      return { valid: false, error: 'Invalid invoice format' };
    }
    
    // Decode the invoice
    const decoded = decode(invoice);
    
    // Check if invoice has expired
    const now = Math.floor(Date.now() / 1000);
    const expiry = (decoded as { expiry?: number }).expiry || 3600; // Default 1 hour expiry
    const timestamp = decoded.timestamp || Math.floor(Date.now() / 1000);
    const expiryTime = timestamp + expiry;
    
    if (now > expiryTime) {
      return { valid: false, error: 'Invoice has expired' };
    }
    
    // Extract amount (might be undefined for zero-amount invoices)
    const satoshis = decoded.satoshis || 0;
    
    // Validate amount is within acceptable range
    if (!isValidInvoiceAmount(satoshis)) {
      if (userId) {
        logInvalidInvoice(userId, expectedAmount || 0, satoshis);
      }
      return { 
        valid: false, 
        error: `Amount ${satoshis} sats is outside allowed range (${SECURITY_CONFIG.payment.minAmount}-${SECURITY_CONFIG.payment.maxAmount})` 
      };
    }
    
    // If expected amount is provided, validate it matches (with tolerance)
    if (expectedAmount !== undefined && expectedAmount > 0) {
      const tolerance = 0.01; // 1% tolerance for network fees
      const difference = Math.abs(satoshis - expectedAmount);
      
      if (difference > expectedAmount * tolerance) {
        if (userId) {
          logInvalidInvoice(userId, expectedAmount, satoshis);
        }
        return { 
          valid: false, 
          error: `Invoice amount (${satoshis} sats) does not match expected amount (${expectedAmount} sats)` 
        };
      }
    }
    
    // Check payment hash exists
    if (!decoded.tagsObject.payment_hash) {
      return { valid: false, error: 'Invoice missing payment hash' };
    }
    
    return {
      valid: true,
      invoice: {
        paymentRequest: invoice,
        satoshis: satoshis || 0,
        timestamp: timestamp,
        expiry: expiry,
        description: decoded.tagsObject.description || '',
        paymentHash: decoded.tagsObject.payment_hash || '',
      }
    };
  } catch (error) {
    console.error('Invoice validation error:', error);
    return { 
      valid: false, 
      error: 'Failed to decode invoice' 
    };
  }
}

/**
 * Validates invoice amount is within acceptable range
 */
export function isValidInvoiceAmount(satoshis: number): boolean {
  return (
    typeof satoshis === 'number' &&
    !isNaN(satoshis) &&
    satoshis >= SECURITY_CONFIG.payment.minAmount &&
    satoshis <= SECURITY_CONFIG.payment.maxAmount &&
    satoshis === Math.floor(satoshis) // Must be whole sats
  );
}

/**
 * Validates a Lightning address domain
 */
export function isValidLightningDomain(domain: string): boolean {
  if (!domain || typeof domain !== 'string') return false;
  
  const normalizedDomain = domain.toLowerCase();
  
  // Check against trusted Lightning domains
  return SECURITY_CONFIG.trustedDomains.lightning.some(
    trusted => normalizedDomain === trusted || normalizedDomain.endsWith(`.${trusted}`)
  );
}

/**
 * Validates and parses a Lightning address
 */
export function validateLightningAddress(address: string): {
  valid: boolean;
  username?: string;
  domain?: string;
  error?: string;
} {
  if (!address || typeof address !== 'string') {
    return { valid: false, error: 'Invalid address format' };
  }
  
  // Check LUD-16 format (username@domain)
  const lud16Match = address.match(/^([a-zA-Z0-9._-]+)@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})$/);
  
  if (lud16Match) {
    const [, username, domain] = lud16Match;
    
    // Validate domain is trusted
    if (!isValidLightningDomain(domain)) {
      return { 
        valid: false, 
        error: `Domain ${domain} is not in the trusted list` 
      };
    }
    
    return { valid: true, username, domain };
  }
  
  // Check LUD-06 format (LNURL)
  if (address.startsWith('https://')) {
    try {
      const url = new URL(address);
      
      // Validate domain is trusted
      if (!isValidLightningDomain(url.hostname)) {
        return { 
          valid: false, 
          error: `Domain ${url.hostname} is not in the trusted list` 
        };
      }
      
      return { valid: true, domain: url.hostname };
    } catch {
      return { valid: false, error: 'Invalid LNURL format' };
    }
  }
  
  return { valid: false, error: 'Address must be username@domain or LNURL' };
}

/**
 * Safely constructs Lightning address lookup URL
 */
export function buildLightningAddressUrl(username: string, domain: string): string | null {
  // Validate inputs
  if (!username || !domain) return null;
  
  // Sanitize username (alphanumeric, dots, underscores, hyphens only)
  const cleanUsername = username.replace(/[^a-zA-Z0-9._-]/g, '');
  
  // Validate domain
  if (!isValidLightningDomain(domain)) return null;
  
  // Construct URL
  return `https://${domain}/.well-known/lnurlp/${cleanUsername}`;
}