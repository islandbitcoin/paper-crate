/**
 * Nostr event validation utilities
 */
import { type NostrEvent } from '@nostrify/nostrify';
import { verifyEvent } from 'nostr-tools';

/**
 * Validates a Nostr event's signature and timestamp
 */
export function validateNostrEvent(event: NostrEvent): boolean {
  try {
    // Verify event signature
    if (!verifyEvent(event)) {
      console.error('Event signature verification failed:', event.id);
      return false;
    }
    
    // Check timestamp is not too far in the future (5 minutes tolerance)
    const now = Math.floor(Date.now() / 1000);
    const fiveMinutesFromNow = now + 300;
    
    if (event.created_at > fiveMinutesFromNow) {
      console.error('Event timestamp is too far in the future:', event.id);
      return false;
    }
    
    // Check timestamp is not too old (optional, depends on use case)
    // For payment-related events, we might want fresher events
    const oneWeekAgo = now - (7 * 24 * 60 * 60);
    if (event.created_at < oneWeekAgo) {
      console.warn('Event is older than one week:', event.id);
      // We'll allow old events but log a warning
    }
    
    return true;
  } catch (error) {
    console.error('Event validation error:', error);
    return false;
  }
}

/**
 * Validates required tags exist in an event
 */
export function validateRequiredTags(
  event: NostrEvent,
  requiredTags: string[]
): boolean {
  for (const tagName of requiredTags) {
    const tag = event.tags.find(([name]) => name === tagName);
    if (!tag || !tag[1]) {
      console.error(`Event missing required tag '${tagName}':`, event.id);
      return false;
    }
  }
  return true;
}

/**
 * Validates event content is not empty when required
 */
export function validateEventContent(
  event: NostrEvent,
  requireContent = true
): boolean {
  if (requireContent && (!event.content || event.content.trim() === '')) {
    console.error('Event has empty content:', event.id);
    return false;
  }
  return true;
}

/**
 * Comprehensive validation for performance report events
 */
export function validateReportEvent(event: NostrEvent): boolean {
  // Check basic event validity
  if (!validateNostrEvent(event)) {
    return false;
  }
  
  // Check event kind
  if (event.kind !== 3387) {
    console.error('Invalid event kind for report:', event.kind);
    return false;
  }
  
  // Check required tags
  const requiredTags = ['a', 'p', 'platform', 'post_url', 'metrics', 'amount_claimed', 't'];
  if (!validateRequiredTags(event, requiredTags)) {
    return false;
  }
  
  // Validate metrics format
  const metricsTag = event.tags.find(([name]) => name === 'metrics')?.[1];
  if (metricsTag) {
    try {
      const pairs = metricsTag.split(',');
      for (const pair of pairs) {
        const [type, count] = pair.split(':');
        if (!type || !count || isNaN(parseInt(count, 10))) {
          console.error('Invalid metrics format:', metricsTag);
          return false;
        }
      }
    } catch {
      console.error('Failed to parse metrics:', metricsTag);
      return false;
    }
  }
  
  // Validate amount
  const amountStr = event.tags.find(([name]) => name === 'amount_claimed')?.[1];
  const amount = parseInt(amountStr || '0', 10);
  if (isNaN(amount) || amount <= 0) {
    console.error('Invalid amount claimed:', amountStr);
    return false;
  }
  
  return true;
}

/**
 * Validates campaign application events
 */
export function validateApplicationEvent(event: NostrEvent): boolean {
  // Check basic event validity
  if (!validateNostrEvent(event)) {
    return false;
  }
  
  // Check event kind
  if (event.kind !== 34609) {
    console.error('Invalid event kind for application:', event.kind);
    return false;
  }
  
  // Check required tags
  const requiredTags = ['a', 'p', 'status', 'platforms', 't'];
  if (!validateRequiredTags(event, requiredTags)) {
    return false;
  }
  
  // Validate status
  const status = event.tags.find(([name]) => name === 'status')?.[1];
  if (!['pending', 'approved', 'rejected'].includes(status || '')) {
    console.error('Invalid application status:', status);
    return false;
  }
  
  // Validate content (application message)
  if (!validateEventContent(event)) {
    return false;
  }
  
  return true;
}

/**
 * Validates payment confirmation events
 */
export function validatePaymentEvent(event: NostrEvent): boolean {
  // Check basic event validity
  if (!validateNostrEvent(event)) {
    return false;
  }
  
  // Check event kind
  if (event.kind !== 34611) {
    console.error('Invalid event kind for payment:', event.kind);
    return false;
  }
  
  // Check required tags
  const requiredTags = ['d', 'p', 'e', 'a', 'amount', 'preimage'];
  if (!validateRequiredTags(event, requiredTags)) {
    return false;
  }
  
  // Validate amount
  const amountStr = event.tags.find(([name]) => name === 'amount')?.[1];
  const amount = parseInt(amountStr || '0', 10);
  if (isNaN(amount) || amount <= 0) {
    console.error('Invalid payment amount:', amountStr);
    return false;
  }
  
  // Validate preimage format (should be hex)
  const preimage = event.tags.find(([name]) => name === 'preimage')?.[1];
  if (!preimage || !/^[a-fA-F0-9]+$/.test(preimage)) {
    console.error('Invalid payment preimage format:', preimage);
    return false;
  }
  
  return true;
}