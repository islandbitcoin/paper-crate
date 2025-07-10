/**
 * Enhanced authentication hook with security features
 */
import { useState, useEffect, useCallback } from 'react';
import { useCurrentUser } from './useCurrentUser';
import { useNostr } from '@nostrify/react';
import { useToast } from './useToast';
import {
  SessionManager,
  determineUserRole,
  hasPermission,
  validatePermission,
  type AuthUser,
  type UserRole,
} from '@/lib/security/auth';
import { securityMonitor } from '@/lib/security/monitoring';

interface UseAuthReturn {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  role: UserRole | null;
  login: (rememberMe?: boolean) => Promise<void>;
  logout: () => void;
  hasPermission: (permission: string) => boolean;
  validatePermission: (permission: string, resourcePubkey?: string) => {
    allowed: boolean;
    reason?: string;
  };
  switchRole: (newRole: UserRole) => void;
}

export function useAuth(): UseAuthReturn {
  const { user: currentUser, metadata } = useCurrentUser();
  const { nostr } = useNostr();
  const { toast } = useToast();
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize session on mount
  useEffect(() => {
    const initSession = async () => {
      try {
        // Check for existing session
        const existingSession = SessionManager.getSession();
        
        if (existingSession && currentUser?.pubkey === existingSession.pubkey) {
          setAuthUser(existingSession);
          SessionManager.updateActivity();
        } else if (currentUser) {
          // Determine user role from activity
          const userEvents = await nostr.query([
            {
              kinds: [34608, 34609], // Campaign and application events
              authors: [currentUser.pubkey],
              limit: 100,
            }
          ], { signal: AbortSignal.timeout(5000) });

          const role = determineUserRole(userEvents, metadata);
          
          const newAuthUser: AuthUser = {
            pubkey: currentUser.pubkey,
            role,
            loginTime: Date.now(),
            lastActivity: Date.now(),
            metadata: {
              name: metadata?.name,
              picture: metadata?.picture,
              nip05: metadata?.nip05,
            },
          };

          setAuthUser(newAuthUser);
          SessionManager.saveSession(newAuthUser);
        } else {
          setAuthUser(null);
        }
      } catch (error) {
        console.error('Session initialization error:', error);
        setAuthUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initSession();
  }, [currentUser, metadata, nostr]);

  // Monitor session validity
  useEffect(() => {
    if (!authUser) return;

    const checkSession = () => {
      const session = SessionManager.getSession();
      if (!session) {
        setAuthUser(null);
        toast({
          title: 'Session Expired',
          description: 'Your session has expired. Please log in again.',
          variant: 'destructive',
        });
      }
    };

    // Check session every minute
    const interval = setInterval(checkSession, 60000);

    return () => clearInterval(interval);
  }, [authUser, toast]);

  const login = useCallback(async (rememberMe = false) => {
    if (!currentUser) {
      throw new Error('No user to authenticate');
    }

    try {
      // Determine user role
      const userEvents = await nostr.query([
        {
          kinds: [34608, 34609],
          authors: [currentUser.pubkey],
          limit: 100,
        }
      ], { signal: AbortSignal.timeout(5000) });

      const role = determineUserRole(userEvents, metadata);

      const newAuthUser: AuthUser = {
        pubkey: currentUser.pubkey,
        role,
        loginTime: Date.now(),
        lastActivity: Date.now(),
        metadata: {
          name: metadata?.name,
          picture: metadata?.picture,
          nip05: metadata?.nip05,
        },
      };

      setAuthUser(newAuthUser);
      SessionManager.saveSession(newAuthUser, rememberMe);

      toast({
        title: 'Logged In',
        description: `Welcome back${metadata?.name ? `, ${metadata.name}` : ''}!`,
      });
    } catch (error) {
      console.error('Login error:', error);
      securityMonitor.logEvent({
        type: 'auth_failed',
        userId: currentUser.pubkey,
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        severity: 'medium',
      });
      throw error;
    }
  }, [currentUser, metadata, nostr, toast]);

  const logout = useCallback(() => {
    SessionManager.clearSession();
    setAuthUser(null);
    toast({
      title: 'Logged Out',
      description: 'You have been logged out successfully.',
    });
  }, [toast]);

  const hasPermissionCallback = useCallback((permission: string): boolean => {
    return hasPermission(authUser, permission);
  }, [authUser]);

  const validatePermissionCallback = useCallback(
    (permission: string, resourcePubkey?: string) => {
      return validatePermission(authUser, permission, resourcePubkey);
    },
    [authUser]
  );

  const switchRole = useCallback((newRole: UserRole) => {
    if (!authUser) return;

    // Check if user can switch to this role
    if (newRole === 'both' || authUser.role === 'both' || authUser.role === newRole) {
      const updatedUser = { ...authUser, role: newRole };
      setAuthUser(updatedUser);
      SessionManager.saveSession(updatedUser);

      toast({
        title: 'Role Switched',
        description: `Switched to ${newRole} mode`,
      });

      securityMonitor.logEvent({
        type: 'auth_role_switch',
        userId: authUser.pubkey,
        details: { from: authUser.role, to: newRole },
        severity: 'low',
      });
    } else {
      toast({
        title: 'Cannot Switch Role',
        description: 'You do not have access to this role.',
        variant: 'destructive',
      });
    }
  }, [authUser, toast]);

  return {
    user: authUser,
    isAuthenticated: !!authUser,
    isLoading,
    role: authUser?.role || null,
    login,
    logout,
    hasPermission: hasPermissionCallback,
    validatePermission: validatePermissionCallback,
    switchRole,
  };
}