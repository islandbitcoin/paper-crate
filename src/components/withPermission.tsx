/**
 * Higher-order component for permission protection
 */
import { ReactNode } from 'react';
import { Shield } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';

export function withPermission<P extends object>(
  Component: React.ComponentType<P>,
  permission: string,
  fallback?: ReactNode
) {
  return function ProtectedComponent(props: P & { resourcePubkey?: string }) {
    const { validatePermission } = useAuth();
    const validation = validatePermission(permission, props.resourcePubkey);

    if (!validation.allowed) {
      return (
        <>
          {fallback || (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Shield className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-lg font-semibold">Access Denied</p>
              <p className="text-sm text-muted-foreground mt-2">
                {validation.reason || 'You do not have permission to access this feature.'}
              </p>
            </div>
          )}
        </>
      );
    }

    return <Component {...props} />;
  };
}