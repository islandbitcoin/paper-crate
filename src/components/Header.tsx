import { useState } from 'react';
import { User, Settings, LogOut, Zap, Building2, Users, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useLoginActions } from '@/hooks/useLoginActions';
import { genUserName } from '@/lib/genUserName';
import { LoginArea } from '@/components/auth/LoginArea';
import { useAuth } from '@/hooks/useAuth';

interface HeaderProps {
  currentRole?: 'business' | 'creator';
  onRoleChange?: (role: 'business' | 'creator') => void;
}

export function Header({ currentRole: _currentRole, onRoleChange }: HeaderProps) {
  const { user } = useCurrentUser();
  const { logout } = useLoginActions();
  const { user: authUser, role: authRole, switchRole } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  const { metadata } = useCurrentUser();
  const displayName = metadata?.name ?? (user ? genUserName(user.pubkey) : '');

  const handleProfileClick = () => {
    window.location.href = '/profile';
  };

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-2">
            <Zap className="h-6 w-6 text-purple-600" />
            <span className="font-bold text-xl">Paper Crate</span>
          </div>
          {user && (
            <Badge variant="outline" className="hidden sm:inline-flex">
              Nostr
            </Badge>
          )}
        </div>

        {/* Role Switcher (when logged in) */}
        {authUser && authRole && (
          <div className="hidden md:flex items-center space-x-2">
            {(authRole === 'creator' || authRole === 'both') && (
              <Button
                variant={authRole === 'creator' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  switchRole('creator');
                  onRoleChange?.('creator');
                }}
                className="flex items-center space-x-2"
              >
                <Users className="h-4 w-4" />
                <span>Creator</span>
              </Button>
            )}
            {(authRole === 'business' || authRole === 'both') && (
              <Button
                variant={authRole === 'business' ? 'default' : 'outline'}
                size="sm"
                onClick={() => {
                  switchRole('business');
                  onRoleChange?.('business');
                }}
                className="flex items-center space-x-2"
              >
                <Building2 className="h-4 w-4" />
                <span>Business</span>
              </Button>
            )}
            {authRole === 'both' && (
              <Badge variant="secondary" className="ml-2">
                <Shield className="h-3 w-3 mr-1" />
                Dual Role
              </Badge>
            )}
          </div>
        )}

        {/* User Menu or Login */}
        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu open={showUserMenu} onOpenChange={setShowUserMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center space-x-2 h-auto p-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={metadata?.picture} alt={displayName} />
                    <AvatarFallback className="text-sm">
                      {displayName.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block text-left">
                    <div className="text-sm font-medium">{displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {user.pubkey.slice(0, 8)}...
                    </div>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <div className="font-medium">{displayName}</div>
                  <div className="text-sm text-muted-foreground">
                    {user.pubkey.slice(0, 16)}...
                  </div>
                  {metadata?.nip05 && (
                    <div className="text-xs text-green-600 flex items-center space-x-1">
                      <span>✓</span>
                      <span>{metadata.nip05}</span>
                    </div>
                  )}
                </div>
                <DropdownMenuSeparator />

                {/* Role Switcher (mobile) */}
                {authUser && authRole && (
                  <>
                    <div className="md:hidden">
                      {(authRole === 'creator' || authRole === 'both') && (
                        <DropdownMenuItem onClick={() => {
                          switchRole('creator');
                          onRoleChange?.('creator');
                        }}>
                          <Users className="h-4 w-4 mr-2" />
                          Creator Dashboard
                          {authRole === 'creator' && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Active
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      )}
                      {(authRole === 'business' || authRole === 'both') && (
                        <DropdownMenuItem onClick={() => {
                          switchRole('business');
                          onRoleChange?.('business');
                        }}>
                          <Building2 className="h-4 w-4 mr-2" />
                          Business Dashboard
                          {authRole === 'business' && (
                            <Badge variant="secondary" className="ml-auto text-xs">
                              Active
                            </Badge>
                          )}
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuSeparator />
                    </div>
                  </>
                )}

                <DropdownMenuItem onClick={handleProfileClick}>
                  <User className="h-4 w-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleProfileClick}>
                  <Settings className="h-4 w-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                  <LogOut className="h-4 w-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <LoginArea className="max-w-40" />
          )}
        </div>
      </div>
    </header>
  );
}