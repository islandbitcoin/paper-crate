/**
 * Data retention policies and automated cleanup
 */
import { securityMonitor, logDataDeletion } from './monitoring';
import { secureStorage } from './storage';
import { DEFAULT_PRIVACY_SETTINGS, type PrivacySettings } from './privacy';

export interface RetentionPolicy {
  dataType: string;
  retentionDays: number;
  deleteAfterUse?: boolean;
  exceptions?: string[];
}

export const DATA_RETENTION_POLICIES: RetentionPolicy[] = [
  {
    dataType: 'payment_data',
    retentionDays: 90, // Keep for 3 months for accounting
    exceptions: ['invoice_id', 'amount', 'timestamp'],
  },
  {
    dataType: 'campaign_analytics',
    retentionDays: 180, // Keep for 6 months
  },
  {
    dataType: 'user_activity',
    retentionDays: 30, // Keep for 1 month
  },
  {
    dataType: 'security_events',
    retentionDays: 365, // Keep for 1 year for security audits
  },
  {
    dataType: 'draft_content',
    retentionDays: 7, // Keep drafts for 1 week
    deleteAfterUse: true,
  },
  {
    dataType: 'temporary_data',
    retentionDays: 1, // Delete after 1 day
    deleteAfterUse: true,
  },
];

/**
 * Get retention policy for a data type
 */
export function getRetentionPolicy(dataType: string): RetentionPolicy {
  const policy = DATA_RETENTION_POLICIES.find(p => p.dataType === dataType);
  
  // Default policy if not found
  return policy || {
    dataType,
    retentionDays: DEFAULT_PRIVACY_SETTINGS.dataRetentionDays,
  };
}

/**
 * Check if data should be retained based on policy
 */
export function shouldRetain(
  dataType: string,
  createdAt: number,
  settings?: PrivacySettings
): boolean {
  const policy = getRetentionPolicy(dataType);
  const userRetentionDays = settings?.dataRetentionDays || DEFAULT_PRIVACY_SETTINGS.dataRetentionDays;
  
  // Use the more restrictive policy
  const retentionDays = Math.min(policy.retentionDays, userRetentionDays);
  const dataAgeMs = Date.now() - (createdAt * 1000);
  const retentionPeriodMs = retentionDays * 24 * 60 * 60 * 1000;
  
  return dataAgeMs < retentionPeriodMs;
}

/**
 * Clean expired data based on retention policies
 */
export async function cleanExpiredData(userId?: string): Promise<number> {
  let deletedCount = 0;

  try {
    // Clean localStorage data
    const storageKeys = secureStorage.keys();
    
    for (const key of storageKeys) {
      const data = secureStorage.get<Record<string, unknown>>(key);
      
      if (data && typeof data === 'object' && 'timestamp' in data && typeof data.timestamp === 'number') {
        const dataType = key.split(':')[0] || 'unknown';
        const createdAt = Math.floor(data.timestamp / 1000);
        
        if (!shouldRetain(dataType, createdAt)) {
          secureStorage.remove(key);
          deletedCount++;
        }
      }
    }

    // Clean security events
    const events = securityMonitor.getRecentEvents();
    const validEvents = events.filter(event => 
      shouldRetain('security_events', Math.floor(event.timestamp / 1000))
    );
    
    if (validEvents.length < events.length) {
      const deletedEvents = events.length - validEvents.length;
      securityMonitor.clearEvents();
      validEvents.forEach(e => securityMonitor.logEvent(e));
      deletedCount += deletedEvents;
    }

    // Log the cleanup
    if (deletedCount > 0 && userId) {
      logDataDeletion(userId, 'expired_data', deletedCount, true);
    }

    return deletedCount;
  } catch (error) {
    console.error('Data cleanup failed:', error);
    
    securityMonitor.logEvent({
      type: 'data_deletion',
      userId,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'cleanup',
      },
      severity: 'high',
    });

    return 0;
  }
}

/**
 * Export user data for GDPR compliance
 */
export async function exportUserData(
  userId: string,
  includeTypes: string[] = []
): Promise<Record<string, unknown>> {
  const exportData: Record<string, unknown> = {
    userId,
    exportedAt: new Date().toISOString(),
    data: {},
  };

  try {
    // Export localStorage data
    const storageKeys = secureStorage.keys();
    const userStorageData: Record<string, unknown> = {};
    
    for (const key of storageKeys) {
      if (key.includes(userId) || includeTypes.some(type => key.startsWith(type))) {
        const data = secureStorage.get<unknown>(key);
        if (data) {
          userStorageData[key] = data;
        }
      }
    }
    
    (exportData.data as Record<string, unknown>).localStorage = userStorageData;

    // Export security events
    const userEvents = securityMonitor.getRecentEvents(undefined, userId);
    (exportData.data as Record<string, unknown>).securityEvents = userEvents;

    // Log the export
    securityMonitor.logEvent({
      type: 'data_export',
      userId,
      details: { 
        dataTypes: Object.keys(exportData.data as Record<string, unknown>),
        format: 'json',
      },
      severity: 'medium',
    });

    return exportData;
  } catch (error) {
    console.error('Data export failed:', error);
    
    securityMonitor.logEvent({
      type: 'data_export',
      userId,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        failed: true,
      },
      severity: 'high',
    });

    throw error;
  }
}

/**
 * Delete all user data (right to be forgotten)
 */
export async function deleteAllUserData(
  userId: string,
  permanent = false
): Promise<number> {
  let deletedCount = 0;

  try {
    // Delete from localStorage
    const storageKeys = secureStorage.keys();
    
    for (const key of storageKeys) {
      if (key.includes(userId)) {
        secureStorage.remove(key);
        deletedCount++;
      }
    }

    // Clear user's security events if permanent
    if (permanent) {
      const allEvents = securityMonitor.getRecentEvents();
      const otherEvents = allEvents.filter(e => e.userId !== userId);
      
      if (otherEvents.length < allEvents.length) {
        securityMonitor.clearEvents();
        otherEvents.forEach(e => securityMonitor.logEvent(e));
        deletedCount += allEvents.length - otherEvents.length;
      }
    }

    // Log the deletion
    logDataDeletion(userId, 'all_user_data', deletedCount, permanent);

    return deletedCount;
  } catch (error) {
    console.error('User data deletion failed:', error);
    
    securityMonitor.logEvent({
      type: 'data_deletion',
      userId,
      details: { 
        error: error instanceof Error ? error.message : 'Unknown error',
        operation: 'delete_all',
        permanent,
      },
      severity: 'critical',
    });

    throw error;
  }
}

/**
 * Hook for data retention management
 */
export function useDataRetention() {
  const cleanupExpired = async (): Promise<number> => {
    return cleanExpiredData();
  };

  const exportMyData = async (userId: string): Promise<Record<string, unknown>> => {
    return exportUserData(userId);
  };

  const deleteMyData = async (userId: string, permanent = false): Promise<number> => {
    return deleteAllUserData(userId, permanent);
  };

  const checkRetention = (dataType: string, createdAt: number): boolean => {
    return shouldRetain(dataType, createdAt);
  };

  const getPolicy = (dataType: string): RetentionPolicy => {
    return getRetentionPolicy(dataType);
  };

  return {
    cleanupExpired,
    exportMyData,
    deleteMyData,
    checkRetention,
    getPolicy,
  };
}