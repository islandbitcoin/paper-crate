/**
 * Authentication and authorization utilities
 */
import { type NostrEvent, type NostrMetadata } from '@nostrify/nostrify';
import { securityMonitor } from './monitoring';

export type UserRole = 'creator' | 'business' | 'both';

export interface AuthUser {
  pubkey: string;
  role: UserRole;
  loginTime: number;
  lastActivity: number;
  metadata?: {
    name?: string;
    picture?: string;
    nip05?: string;
  };
}

export interface SessionConfig {
  idleTimeout: number; // Time before idle logout
  maxDuration: number; // Maximum session duration
  rememberMeDuration: number; // Extended duration for "remember me"
}

// Default session configuration
export const DEFAULT_SESSION_CONFIG: SessionConfig = {
  idleTimeout: 1800000, // 30 minutes
  maxDuration: 86400000, // 24 hours
  rememberMeDuration: 604800000, // 7 days
};

/**
 * Permission definitions for each role
 */
export const PERMISSIONS = {
  creator: [
    'campaign.view',
    'campaign.apply',
    'application.create',
    'application.view.own',
    'report.create',
    'report.view.own',
    'report.approve',
    'report.pay',
    'profile.edit.own',
    'social.manage.own',
  ] as const,
  business: [
    'campaign.create',
    'campaign.edit.own',
    'campaign.delete.own',
    'campaign.view',
    'application.view.received',
    'application.approve',
    'application.reject',
    'report.view.received',
    'report.verify',
    'report.approve',
    'report.pay',
    'payment.send',
    'profile.edit.own',
  ] as const,
  both: [
    // Users with both roles get combined permissions
  ] as const,
} as const;

export type Permission = 
  | typeof PERMISSIONS.creator[number]
  | typeof PERMISSIONS.business[number];

/**
 * Check if a user has a specific permission
 */
export function hasPermission(
  user: AuthUser | null,
  permission: string
): boolean {
  if (!user) return false;

  const rolePermissions = PERMISSIONS[user.role];
  if (!rolePermissions) return false;

  // Check direct permissions
  if ((rolePermissions as readonly string[]).includes(permission)) return true;

  // Users with 'both' role get all permissions
  if (user.role === 'both') {
    return (
      (PERMISSIONS.creator as readonly string[]).includes(permission) ||
      (PERMISSIONS.business as readonly string[]).includes(permission)
    );
  }

  return false;
}

/**
 * Check if a user owns a resource
 */
export function isResourceOwner(
  user: AuthUser | null,
  resourcePubkey: string
): boolean {
  return user?.pubkey === resourcePubkey;
}

/**
 * Validate permission for a specific action
 */
export function validatePermission(
  user: AuthUser | null,
  permission: string,
  resourcePubkey?: string
): { allowed: boolean; reason?: string } {
  if (!user) {
    return { allowed: false, reason: 'Not authenticated' };
  }

  // Check if permission requires ownership
  if (permission.includes('.own') && resourcePubkey) {
    if (!isResourceOwner(user, resourcePubkey)) {
      return { allowed: false, reason: 'Not resource owner' };
    }
  }

  if (!hasPermission(user, permission)) {
    return { allowed: false, reason: 'Insufficient permissions' };
  }

  return { allowed: true };
}

/**
 * Session management
 */
export class SessionManager {
  private static STORAGE_KEY = 'paper-crate-auth-session';
  private static activityTimer: NodeJS.Timeout | null = null;

  static saveSession(user: AuthUser, rememberMe = false): void {
    const session = {
      ...user,
      loginTime: Date.now(),
      lastActivity: Date.now(),
      rememberMe,
    };

    localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    this.startActivityMonitoring();

    // Log authentication event
    securityMonitor.logEvent({
      type: 'auth_success',
      userId: user.pubkey,
      details: { role: user.role },
      severity: 'low',
    });
  }

  static getSession(): AuthUser | null {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) return null;

      const session = JSON.parse(stored);
      const now = Date.now();

      // Check session expiry
      const config = session.rememberMe
        ? { ...DEFAULT_SESSION_CONFIG, maxDuration: DEFAULT_SESSION_CONFIG.rememberMeDuration }
        : DEFAULT_SESSION_CONFIG;

      // Check if session has expired
      if (now - session.loginTime > config.maxDuration) {
        this.clearSession();
        return null;
      }

      // Check idle timeout
      if (now - session.lastActivity > config.idleTimeout) {
        this.clearSession();
        securityMonitor.logEvent({
          type: 'auth_timeout',
          userId: session.pubkey,
          details: { reason: 'idle_timeout' },
          severity: 'low',
        });
        return null;
      }

      return session;
    } catch (error) {
      console.error('Failed to get session:', error);
      return null;
    }
  }

  static updateActivity(): void {
    const session = this.getSession();
    if (session) {
      session.lastActivity = Date.now();
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(session));
    }
  }

  static clearSession(): void {
    const session = this.getSession();
    if (session) {
      securityMonitor.logEvent({
        type: 'auth_logout',
        userId: session.pubkey,
        details: {},
        severity: 'low',
      });
    }

    localStorage.removeItem(this.STORAGE_KEY);
    this.stopActivityMonitoring();
  }

  static startActivityMonitoring(): void {
    this.stopActivityMonitoring();

    // Update activity on user interactions
    const updateActivity = () => this.updateActivity();

    // Monitor user activity
    document.addEventListener('click', updateActivity);
    document.addEventListener('keypress', updateActivity);
    document.addEventListener('scroll', updateActivity);

    // Check session validity every minute
    this.activityTimer = setInterval(() => {
      const session = this.getSession();
      if (!session) {
        this.stopActivityMonitoring();
      }
    }, 60000);
  }

  static stopActivityMonitoring(): void {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
      this.activityTimer = null;
    }

    const updateActivity = () => this.updateActivity();
    document.removeEventListener('click', updateActivity);
    document.removeEventListener('keypress', updateActivity);
    document.removeEventListener('scroll', updateActivity);
  }
}

/**
 * Determine user role from profile or activity
 */
export function determineUserRole(
  userEvents: NostrEvent[],
  metadata?: NostrMetadata
): UserRole {
  // Check if user has created campaigns (business indicator)
  const hasCampaigns = userEvents.some(
    event => event.kind === 34608 && event.tags.some(([tag]) => tag === 'status')
  );

  // Check if user has submitted applications (creator indicator)
  const hasApplications = userEvents.some(
    event => event.kind === 34609
  );

  // Check metadata for role hints (if metadata has tags property)
  const metadataRole = metadata && 'tags' in metadata && Array.isArray(metadata.tags)
    ? metadata.tags.find(([tag]: string[]) => tag === 'role')?.[1]
    : undefined;

  if (metadataRole === 'business' || metadataRole === 'creator') {
    return metadataRole;
  }

  // Determine based on activity
  if (hasCampaigns && hasApplications) {
    return 'both';
  } else if (hasCampaigns) {
    return 'business';
  } else if (hasApplications) {
    return 'creator';
  }

  // Default to creator for new users
  return 'creator';
}

/**
 * Validate NIP-07 signer responses
 */
export function validateSignerResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') {
    return false;
  }

  // For signed events, validate structure
  if ('sig' in response && response) {
    const event = response as Record<string, unknown>;
    return (
      typeof event.id === 'string' &&
      typeof event.pubkey === 'string' &&
      typeof event.sig === 'string' &&
      typeof event.created_at === 'number'
    );
  }

  // For other responses, ensure they're not obviously malicious
  const responseStr = JSON.stringify(response);
  if (responseStr.length > 1000000) { // 1MB limit
    console.error('Signer response too large');
    return false;
  }

  return true;
}

/**
 * Permission guard hook for components
 */
export function usePermissionGuard(
  user: AuthUser | null,
  permission: string,
  resourcePubkey?: string
): { allowed: boolean; reason?: string } {
  const validation = validatePermission(user, permission, resourcePubkey);

  if (!validation.allowed) {
    securityMonitor.logEvent({
      type: 'auth_failed',
      userId: user?.pubkey,
      details: {
        permission,
        reason: validation.reason,
      },
      severity: 'medium',
    });
  }

  return validation;
}