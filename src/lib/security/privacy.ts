/**
 * Privacy controls and data protection utilities
 */
import { type NostrEvent } from '@nostrify/nostrify';
import { securityMonitor } from './monitoring';

export interface PrivacySettings {
  shareEmail: boolean;
  shareLightningAddress: boolean;
  shareFollowerCount: boolean;
  sharePlatformHandles: boolean;
  encryptSensitiveData: boolean;
  allowAnalytics: boolean;
  dataRetentionDays: number;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  shareEmail: false,
  shareLightningAddress: true, // Needed for payments
  shareFollowerCount: true, // Needed for campaign matching
  sharePlatformHandles: true, // Needed for campaign applications
  encryptSensitiveData: true,
  allowAnalytics: false,
  dataRetentionDays: 90,
};

/**
 * Filter user metadata based on privacy settings
 */
export function filterMetadataByPrivacy(
  metadata: Record<string, unknown>,
  settings: PrivacySettings
): Record<string, unknown> {
  const filtered = { ...metadata };

  // Remove email if not shared
  if (!settings.shareEmail && filtered.email) {
    delete filtered.email;
  }

  // Remove Lightning address if not shared (but warn as it's needed for payments)
  if (!settings.shareLightningAddress) {
    delete filtered.lud06;
    delete filtered.lud16;
  }

  return filtered;
}

/**
 * Filter event content based on privacy settings
 */
export function filterEventByPrivacy(
  event: NostrEvent,
  settings: PrivacySettings,
  userPubkey?: string
): NostrEvent | null {
  // Don't share events from users who have analytics disabled
  if (!settings.allowAnalytics && event.pubkey === userPubkey) {
    return null;
  }

  // Filter based on event kind
  const filteredEvent = { ...event };

  // For kind 0 (metadata), apply privacy filters
  if (event.kind === 0 && event.pubkey === userPubkey) {
    try {
      const metadata = JSON.parse(event.content);
      const filteredMetadata = filterMetadataByPrivacy(metadata, settings);
      filteredEvent.content = JSON.stringify(filteredMetadata);
    } catch {
      // Invalid metadata, return as-is
    }
  }

  // For application events, filter platform handles if not shared
  if (event.kind === 34609 && !settings.sharePlatformHandles) {
    filteredEvent.tags = filteredEvent.tags.filter(
      ([tag]) => tag !== 'platforms'
    );
  }

  // For application events, filter follower counts if not shared
  if (event.kind === 34609 && !settings.shareFollowerCount) {
    filteredEvent.tags = filteredEvent.tags.filter(
      ([tag]) => tag !== 'followers'
    );
  }

  return filteredEvent;
}

/**
 * Check if data should be retained based on privacy settings
 */
export function shouldRetainData(
  createdAt: number,
  settings: PrivacySettings
): boolean {
  const retentionPeriodMs = settings.dataRetentionDays * 24 * 60 * 60 * 1000;
  const dataAge = Date.now() - (createdAt * 1000);
  
  return dataAge < retentionPeriodMs;
}

/**
 * Privacy-aware data minimization
 */
export function minimizeData<T extends Record<string, unknown>>(
  data: T,
  fieldsToKeep: (keyof T)[]
): Partial<T> {
  const minimized: Partial<T> = {};
  
  for (const field of fieldsToKeep) {
    if (field in data) {
      minimized[field] = data[field];
    }
  }

  return minimized;
}

/**
 * Anonymize user data for analytics
 */
export function anonymizeForAnalytics(event: NostrEvent): Partial<NostrEvent> {
  return {
    kind: event.kind,
    created_at: event.created_at,
    tags: event.tags.filter(([tag]) => 
      // Only keep non-identifying tags
      ['t', 'amount', 'status', 'platform'].includes(tag)
    ),
    // Remove content and identifying fields
  };
}

/**
 * Get privacy settings from user's kind 0 event
 */
export function getPrivacySettings(metadata?: Record<string, unknown>): PrivacySettings {
  if (!metadata?.privacy_settings) {
    return DEFAULT_PRIVACY_SETTINGS;
  }

  try {
    const settings = typeof metadata.privacy_settings === 'string'
      ? JSON.parse(metadata.privacy_settings)
      : metadata.privacy_settings;

    return {
      ...DEFAULT_PRIVACY_SETTINGS,
      ...settings,
    };
  } catch {
    return DEFAULT_PRIVACY_SETTINGS;
  }
}

/**
 * Save privacy settings to user metadata
 */
export function setPrivacySettings(
  metadata: Record<string, unknown>,
  settings: PrivacySettings
): Record<string, unknown> {
  return {
    ...metadata,
    privacy_settings: JSON.stringify(settings),
  };
}

/**
 * Hook for managing privacy settings
 */
export function usePrivacy() {
  const loadSettings = (): PrivacySettings => {
    try {
      const stored = localStorage.getItem('privacy-settings');
      if (stored) {
        return { ...DEFAULT_PRIVACY_SETTINGS, ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load privacy settings:', error);
    }
    return DEFAULT_PRIVACY_SETTINGS;
  };

  const saveSettings = (settings: PrivacySettings): void => {
    try {
      localStorage.setItem('privacy-settings', JSON.stringify(settings));
      
      securityMonitor.logEvent({
        type: 'privacy_settings_updated',
        details: { settings },
        severity: 'low',
      });
    } catch (error) {
      console.error('Failed to save privacy settings:', error);
    }
  };

  const clearExpiredData = (): void => {
    const settings = loadSettings();
    const cutoffTime = Date.now() - (settings.dataRetentionDays * 24 * 60 * 60 * 1000);

    // Clear expired security events
    const events = securityMonitor.getRecentEvents();
    const validEvents = events.filter(e => e.timestamp > cutoffTime);
    
    if (validEvents.length < events.length) {
      securityMonitor.clearEvents();
      validEvents.forEach(e => securityMonitor.logEvent(e));
    }

    // Clear other expired data from localStorage
    const keysToCheck = ['campaign-drafts', 'report-drafts', 'application-cache'];
    keysToCheck.forEach(key => {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (parsed.timestamp && parsed.timestamp < cutoffTime) {
            localStorage.removeItem(key);
          }
        }
      } catch {
        // Invalid data, remove it
        localStorage.removeItem(key);
      }
    });
  };

  return {
    loadSettings,
    saveSettings,
    clearExpiredData,
    filterMetadata: (metadata: Record<string, unknown>) => 
      filterMetadataByPrivacy(metadata, loadSettings()),
    shouldRetainData: (createdAt: number) => 
      shouldRetainData(createdAt, loadSettings()),
  };
}