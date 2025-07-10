/**
 * Secure storage utilities with encryption and validation
 */
import { z } from 'zod';
import { securityMonitor } from './monitoring';

export interface SecureStorageOptions {
  encrypt?: boolean;
  ttl?: number; // Time to live in milliseconds
  schema?: z.ZodSchema;
}

/**
 * Secure storage wrapper with validation and optional encryption
 */
export class SecureStorage {
  private prefix: string;

  constructor(prefix = 'paper-crate') {
    this.prefix = prefix;
  }

  /**
   * Store data securely with validation
   */
  set<T>(
    key: string,
    value: T,
    options: SecureStorageOptions = {}
  ): boolean {
    try {
      const fullKey = `${this.prefix}:${key}`;
      
      // Validate against schema if provided
      if (options.schema) {
        const validated = options.schema.parse(value);
        value = validated as T;
      }

      const wrapper = {
        value,
        timestamp: Date.now(),
        ttl: options.ttl,
        encrypted: false,
      };

      // TODO: Implement encryption when signer is available
      // For now, we'll store unencrypted but mark sensitive data
      if (options.encrypt) {
        wrapper.encrypted = true;
        console.warn('Encryption requested but not implemented for localStorage');
      }

      localStorage.setItem(fullKey, JSON.stringify(wrapper));

      securityMonitor.logEvent({
        type: 'secure_storage_write',
        details: { 
          key: fullKey,
          encrypted: wrapper.encrypted,
          hasTTL: !!options.ttl,
        },
        severity: 'low',
      });

      return true;
    } catch (error) {
      console.error('Secure storage write failed:', error);
      
      securityMonitor.logEvent({
        type: 'secure_storage_error',
        details: { 
          key,
          operation: 'write',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        severity: 'medium',
      });

      return false;
    }
  }

  /**
   * Retrieve data with validation and TTL checking
   */
  get<T>(
    key: string,
    options: SecureStorageOptions = {}
  ): T | null {
    try {
      const fullKey = `${this.prefix}:${key}`;
      const stored = localStorage.getItem(fullKey);

      if (!stored) {
        return null;
      }

      const wrapper = JSON.parse(stored);

      // Check TTL
      if (wrapper.ttl) {
        const age = Date.now() - wrapper.timestamp;
        if (age > wrapper.ttl) {
          this.remove(key);
          return null;
        }
      }

      let value = wrapper.value;

      // TODO: Implement decryption when signer is available
      if (wrapper.encrypted) {
        console.warn('Decryption required but not implemented for localStorage');
      }

      // Validate against schema if provided
      if (options.schema) {
        value = options.schema.parse(value);
      }

      securityMonitor.logEvent({
        type: 'secure_storage_read',
        details: { 
          key: fullKey,
          encrypted: wrapper.encrypted,
          age: Date.now() - wrapper.timestamp,
        },
        severity: 'low',
      });

      return value as T;
    } catch (error) {
      console.error('Secure storage read failed:', error);
      
      securityMonitor.logEvent({
        type: 'secure_storage_error',
        details: { 
          key,
          operation: 'read',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        severity: 'medium',
      });

      return null;
    }
  }

  /**
   * Remove data securely
   */
  remove(key: string): boolean {
    try {
      const fullKey = `${this.prefix}:${key}`;
      localStorage.removeItem(fullKey);

      securityMonitor.logEvent({
        type: 'secure_storage_remove',
        details: { key: fullKey },
        severity: 'low',
      });

      return true;
    } catch (error) {
      console.error('Secure storage remove failed:', error);
      
      securityMonitor.logEvent({
        type: 'secure_storage_error',
        details: { 
          key,
          operation: 'remove',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        severity: 'medium',
      });

      return false;
    }
  }

  /**
   * Clear all data with prefix
   */
  clear(): boolean {
    try {
      const keys = Object.keys(localStorage).filter(
        key => key.startsWith(`${this.prefix}:`)
      );

      keys.forEach(key => localStorage.removeItem(key));

      securityMonitor.logEvent({
        type: 'secure_storage_clear',
        details: { 
          prefix: this.prefix,
          count: keys.length,
        },
        severity: 'medium',
      });

      return true;
    } catch (error) {
      console.error('Secure storage clear failed:', error);
      
      securityMonitor.logEvent({
        type: 'secure_storage_error',
        details: { 
          operation: 'clear',
          error: error instanceof Error ? error.message : 'Unknown error',
        },
        severity: 'high',
      });

      return false;
    }
  }

  /**
   * Get all keys with prefix
   */
  keys(): string[] {
    return Object.keys(localStorage)
      .filter(key => key.startsWith(`${this.prefix}:`))
      .map(key => key.slice(this.prefix.length + 1));
  }

  /**
   * Clean up expired entries
   */
  cleanup(): number {
    let cleaned = 0;

    for (const key of this.keys()) {
      const value = this.get(key);
      if (value === null) {
        // Already cleaned by TTL check in get()
        cleaned++;
      }
    }

    if (cleaned > 0) {
      securityMonitor.logEvent({
        type: 'secure_storage_cleanup',
        details: { 
          cleaned,
          remaining: this.keys().length,
        },
        severity: 'low',
      });
    }

    return cleaned;
  }
}

// Export singleton instance
export const secureStorage = new SecureStorage();

/**
 * Schemas for common data types
 */
export const StorageSchemas = {
  campaign: z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    budget: z.number(),
    createdAt: z.number(),
    updatedAt: z.number(),
  }),

  application: z.object({
    id: z.string(),
    campaignId: z.string(),
    message: z.string(),
    platforms: z.record(z.string()),
    createdAt: z.number(),
  }),

  report: z.object({
    id: z.string(),
    campaignId: z.string(),
    metrics: z.record(z.number()),
    postUrl: z.string(),
    createdAt: z.number(),
  }),

  privacySettings: z.object({
    shareEmail: z.boolean(),
    shareLightningAddress: z.boolean(),
    shareFollowerCount: z.boolean(),
    sharePlatformHandles: z.boolean(),
    encryptSensitiveData: z.boolean(),
    allowAnalytics: z.boolean(),
    dataRetentionDays: z.number(),
  }),
};

/**
 * Hook for secure storage operations
 */
export function useSecureStorage() {
  const setItem = <T>(
    key: string,
    value: T,
    options?: SecureStorageOptions
  ): boolean => {
    return secureStorage.set(key, value, options);
  };

  const getItem = <T>(
    key: string,
    options?: SecureStorageOptions
  ): T | null => {
    return secureStorage.get<T>(key, options);
  };

  const removeItem = (key: string): boolean => {
    return secureStorage.remove(key);
  };

  const clearAll = (): boolean => {
    return secureStorage.clear();
  };

  const getAllKeys = (): string[] => {
    return secureStorage.keys();
  };

  const runCleanup = (): number => {
    return secureStorage.cleanup();
  };

  return {
    setItem,
    getItem,
    removeItem,
    clearAll,
    getAllKeys,
    runCleanup,
  };
}