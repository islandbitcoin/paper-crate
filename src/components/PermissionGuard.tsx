/**
 * Permission guard component for protecting UI elements
 */
import { ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/hooks/useAuth';

interface PermissionGuardProps {
  permission: string;
  resourcePubkey?: string;
  children: ReactNode;
  fallback?: ReactNode;
  showError?: boolean;
}

export function PermissionGuard({
  permission,
  resourcePubkey,
  children,
  fallback,
  showError = false,
}: PermissionGuardProps) {
  const { validatePermission } = useAuth();
  const validation = validatePermission(permission, resourcePubkey);

  if (validation.allowed) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  if (showError) {
    return (
      <Alert variant="destructive" className="my-4">
        <Lock className="h-4 w-4" />
        <AlertDescription>
          {validation.reason || 'You do not have permission to access this content.'}
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}

interface RoleGuardProps {
  role: 'creator' | 'business' | 'both';
  children: ReactNode;
  fallback?: ReactNode;
}

export function RoleGuard({ role, children, fallback }: RoleGuardProps) {
  const { user } = useAuth();

  const hasRole = user && (user.role === role || user.role === 'both');

  if (hasRole) {
    return <>{children}</>;
  }

  return <>{fallback || null}</>;
}

interface ResourceOwnerGuardProps {
  resourcePubkey: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ResourceOwnerGuard({
  resourcePubkey,
  children,
  fallback,
}: ResourceOwnerGuardProps) {
  const { user } = useAuth();

  if (user && user.pubkey === resourcePubkey) {
    return <>{children}</>;
  }

  return <>{fallback || null}</>;
}