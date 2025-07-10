import { useState } from 'react';
import { Wallet, Zap, Copy, Check, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNWC } from '@/hooks/useNWCContext';

interface WalletConnectionProps {
  userRole: 'business' | 'creator';
}

export function WalletConnection({ userRole }: WalletConnectionProps) {
  const { user: _user } = useCurrentUser();
  const { toast } = useToast();
  const [showConnectDialog, setShowConnectDialog] = useState(false);
  const [inputNwcString, setInputNwcString] = useState('');
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const {
    walletInfo,
    isConnected,
    isConnecting,
    connectWallet,
    disconnectWallet,
    refreshBalance,
    testConnection,
    validateNWCString,
  } = useNWC();

  const handleConnect = async () => {
    const success = await connectWallet(inputNwcString);
    if (success) {
      setShowConnectDialog(false);
      setInputNwcString('');
    } else {
      // Keep the dialog open so user can see the error and troubleshooting tips
      toast({
        title: 'Connection Tips',
        description: 'Please check the troubleshooting tips above and try again.',
      });
    }
  };

  const handleTestConnection = async () => {
    await testConnection();
  };

  const handleRefreshBalance = async () => {
    await refreshBalance();
  };

  const copyToClipboard = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2000);
      toast({
        title: 'Copied!',
        description: `${field} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  const formatSats = (sats: number) => {
    if (sats >= 1000000) {
      return `${(sats / 1000000).toFixed(1)}M sats`;
    }
    if (sats >= 1000) {
      return `${(sats / 1000).toFixed(1)}K sats`;
    }
    return `${sats} sats`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="h-5 w-5" />
            <div>
              <CardTitle>Lightning Wallet</CardTitle>
              <CardDescription>
                {userRole === 'business'
                  ? 'Connect your wallet to pay creators automatically'
                  : 'Connect your wallet to receive payments from campaigns'
                }
              </CardDescription>
            </div>
          </div>
          {isConnected && (
            <Badge variant="secondary" className="text-green-600">
              <Zap className="h-3 w-3 mr-1" />
              Connected
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isConnected ? (
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {userRole === 'business'
                  ? 'Connect a Lightning wallet to automatically pay creators based on their performance metrics.'
                  : 'Connect a Lightning wallet to receive instant payments when your content performs well.'
                }
              </AlertDescription>
            </Alert>

            <div className="space-y-3">
              <h4 className="font-medium">Supported Wallets</h4>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { name: 'Alby', url: 'https://getalby.com' },
                  { name: 'Mutiny', url: 'https://mutinywallet.com' },
                  { name: 'Zeus', url: 'https://zeusln.app' },
                  { name: 'Cashu', url: 'https://cashu.space' },
                ].map((wallet) => (
                  <div key={wallet.name} className="flex items-center justify-between p-2 border rounded">
                    <span className="text-sm font-medium">{wallet.name}</span>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={wallet.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <Dialog open={showConnectDialog} onOpenChange={setShowConnectDialog}>
              <DialogTrigger asChild>
                <Button className="w-full">
                  <Wallet className="h-4 w-4 mr-2" />
                  Connect Wallet
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect Lightning Wallet</DialogTitle>
                  <DialogDescription>
                    Enter your Nostr Wallet Connect (NWC) connection string to link your Lightning wallet.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>NWC Connection String</Label>
                    <Input
                      placeholder="nostr+walletconnect://..."
                      value={inputNwcString}
                      onChange={(e) => setInputNwcString(e.target.value)}
                      className="font-mono text-sm"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Get this from your wallet's NWC settings or connection page.
                    </p>
                  </div>

                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-xs">
                      Your connection string contains sensitive information. Never share it with anyone.
                      We use it only to communicate with your wallet for payments.
                    </AlertDescription>
                  </Alert>

                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <h4 className="text-sm font-medium">Troubleshooting Tips:</h4>
                    <ul className="text-xs space-y-1 text-muted-foreground list-disc list-inside">
                      <li>Make sure your wallet app is open and online</li>
                      <li>Check if the connection string has expired (regenerate if needed)</li>
                      <li>Verify the permissions include "get_info" and "get_balance"</li>
                      <li>Try disconnecting and reconnecting in your wallet app</li>
                    </ul>
                  </div>

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowConnectDialog(false)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleConnect}
                      disabled={isConnecting || !validateNWCString(inputNwcString)}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Wallet Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium">Balance</div>
                <div className="text-lg font-bold text-green-600">
                  {formatSats(walletInfo!.balance)}
                </div>
              </div>
              <div className="p-3 bg-muted/50 rounded-lg">
                <div className="text-sm font-medium">Wallet</div>
                <div className="text-sm">{walletInfo!.alias}</div>
              </div>
            </div>

            {/* Wallet Details */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">Node Pubkey</div>
                  <div className="text-xs text-muted-foreground font-mono">
                    {walletInfo!.pubkey}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(walletInfo!.pubkey, 'Node Pubkey')}
                >
                  {copiedField === 'Node Pubkey' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium text-sm">Network</div>
                  <div className="text-xs text-muted-foreground capitalize">
                    {walletInfo!.network}
                  </div>
                </div>
                <Badge variant="outline" className="text-green-600 border-green-200">
                  Active
                </Badge>
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Button variant="outline" onClick={handleTestConnection} className="flex-1">
                Test Connection
              </Button>
              <Button
                variant="outline"
                onClick={handleRefreshBalance}
                size="sm"
              >
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={disconnectWallet} className="text-red-600">
                Disconnect
              </Button>
            </div>

            {/* Usage Info */}
            <Alert>
              <Zap className="h-4 w-4" />
              <AlertDescription className="text-sm">
                {userRole === 'business'
                  ? 'Payments will be automatically sent to creators when they submit verified performance reports.'
                  : 'You\'ll receive payments directly to this wallet when businesses approve your performance reports.'
                }
              </AlertDescription>
            </Alert>
          </div>
        )}
      </CardContent>
    </Card>
  );
}