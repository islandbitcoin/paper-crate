/**
 * Content sanitization utilities to prevent XSS attacks
 */
import DOMPurify from 'isomorphic-dompurify';

// Configure DOMPurify for different content types
const createSanitizer = (config: Record<string, unknown>) => {
  return (dirty: string): string => {
    if (!dirty || typeof dirty !== 'string') return '';
    return DOMPurify.sanitize(dirty, config) as string;
  };
};

// For plain text content (no HTML allowed)
export const sanitizePlainText = createSanitizer({
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
});

// For rich text content (basic formatting only)
export const sanitizeRichText = createSanitizer({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p'],
  ALLOWED_ATTR: [],
});

// For links and basic content
export const sanitizeWithLinks = createSanitizer({
  ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'u', 'br', 'p', 'a'],
  ALLOWED_ATTR: ['href', 'target', 'rel'],
  ALLOWED_URI_REGEXP: /^https?:\/\//i,
});

// For usernames and handles
export const sanitizeUsername = (username: string): string => {
  if (!username || typeof username !== 'string') return '';
  
  // Remove any HTML tags first
  const plainText = sanitizePlainText(username);
  
  // Only allow alphanumeric, underscores, hyphens, and dots
  return plainText.replace(/[^a-zA-Z0-9._-]/g, '').slice(0, 50);
};

// For campaign/report titles
export const sanitizeTitle = (title: string): string => {
  if (!title || typeof title !== 'string') return '';
  
  // Remove any HTML and limit length
  return sanitizePlainText(title).slice(0, 100);
};

// For campaign/report descriptions
export const sanitizeDescription = (description: string): string => {
  if (!description || typeof description !== 'string') return '';
  
  // Allow basic formatting but no scripts
  return sanitizeRichText(description).slice(0, 1000);
};

// For URLs
export const sanitizeUrl = (url: string): string => {
  if (!url || typeof url !== 'string') return '';
  
  try {
    const parsed = new URL(url);
    
    // Only allow http(s) protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return '';
    }
    
    // Rebuild URL to ensure it's clean
    return parsed.toString();
  } catch {
    return '';
  }
};

// For Nostr event content
export const sanitizeNostrContent = (content: string): string => {
  if (!content || typeof content !== 'string') return '';
  
  // For Nostr, we want to preserve some formatting but prevent XSS
  return sanitizeWithLinks(content);
};

// For JSON content in Nostr events
export const sanitizeJsonContent = (obj: unknown): string => {
  try {
    // First stringify to ensure it's valid JSON
    const jsonStr = JSON.stringify(obj);
    
    // Parse and re-stringify to remove any non-JSON content
    const parsed = JSON.parse(jsonStr);
    
    // Recursively sanitize string values
    const sanitizeObject = (item: unknown): unknown => {
      if (typeof item === 'string') {
        return sanitizePlainText(item);
      } else if (Array.isArray(item)) {
        return item.map(sanitizeObject);
      } else if (item && typeof item === 'object') {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(item)) {
          // Sanitize keys too
          const cleanKey = sanitizePlainText(key);
          result[cleanKey] = sanitizeObject(value);
        }
        return result;
      }
      return item;
    };
    
    const sanitized = sanitizeObject(parsed);
    return JSON.stringify(sanitized);
  } catch {
    return '{}';
  }
};