import { useState } from 'react';
import { ArrowLeft, Settings, ExternalLink, Copy, Check, TestTube } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { useTestMode } from '@/hooks/useTestMode';
import { genUserName } from '@/lib/genUserName';
import { EditProfileForm } from '@/components/EditProfileForm';
import { RelaySelector } from '@/components/RelaySelector';
import { SocialPlatformManager } from '@/components/SocialPlatformManager';
import { useNavigate } from 'react-router-dom';

interface SocialPlatform {
  platform: string;
  handle: string;
  followers: number;
  verified: boolean;
  url?: string;
}
import { WalletConnection } from '@/components/WalletConnection';
import { PaymentTest } from '@/components/PaymentTest';
import { APIConfiguration } from '@/components/APIConfiguration';
import { RapidAPIGuide } from '@/components/RapidAPIGuide';
import { hasAPIConfiguration } from '@/lib/api/social-media-api';
import { useCampaignsByBusiness } from '@/hooks/useCampaigns';
import { useCreatorApplications } from '@/hooks/useCampaignApplications';
import { useCreatorReports } from '@/hooks/usePerformanceReports';
import { formatSats } from '@/lib/campaign-utils';


export function Profile() {
  const { user, metadata } = useCurrentUser();
  const { toast } = useToast();
  const { isTestMode, toggleTestMode } = useTestMode();
  const navigate = useNavigate();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  // Load social platforms from localStorage based on user's pubkey
  const storageKey = user ? `social-platforms-${user.pubkey}` : 'social-platforms-anonymous';
  const [socialPlatforms, setSocialPlatforms] = useLocalStorage<SocialPlatform[]>(storageKey, []);

  // Get user's activity data
  const { data: campaigns } = useCampaignsByBusiness(user?.pubkey);
  const { data: applications } = useCreatorApplications(user?.pubkey);
  const { data: reports } = useCreatorReports(user?.pubkey);

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <p className="text-muted-foreground">
              Please log in to view your profile.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  const displayName = metadata?.name ?? genUserName(user.pubkey);

  // Calculate stats
  const activeCampaigns = campaigns?.filter(c => c.status === 'active').length || 0;
  const approvedApplications = applications?.filter(a => a.status === 'approved').length || 0;
  const totalEarnings = reports?.reduce((sum, r) => sum + r.amountClaimed, 0) || 0;
  const totalSpent = campaigns?.reduce((sum, c) => sum + c.spent, 0) || 0;

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

  const formatPubkey = (pubkey: string) => {
    return `${pubkey.slice(0, 8)}...${pubkey.slice(-8)}`;
  };

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Profile</h1>
      </div>

      {/* Profile Header */}
      <Card>
        <CardContent className="p-6">
          {/* Banner */}
          {metadata?.banner && (
            <div className="w-full h-32 md:h-48 rounded-lg overflow-hidden mb-6">
              <img
                src={metadata.banner}
                alt="Profile banner"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            {/* Avatar */}
            <Avatar className="h-24 w-24">
              <AvatarImage src={metadata?.picture} alt={displayName} />
              <AvatarFallback className="text-2xl">
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>

            {/* Profile Info */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center space-x-3">
                <h2 className="text-2xl font-bold">{displayName}</h2>
                {metadata?.bot && (
                  <Badge variant="secondary">Bot</Badge>
                )}
              </div>

              {metadata?.about && (
                <p className="text-muted-foreground max-w-2xl">
                  {metadata.about}
                </p>
              )}

              {/* Links */}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {metadata?.website && (
                  <a
                    href={metadata.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center space-x-1 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Website</span>
                  </a>
                )}

                {metadata?.nip05 && (
                  <div className="flex items-center space-x-1">
                    <span className="text-muted-foreground">✓</span>
                    <span className="text-green-600">{metadata.nip05}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex space-x-2">
              <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
                <DialogTrigger asChild>
                  <Button>
                    <Settings className="h-4 w-4 mr-2" />
                    Edit Profile
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Profile</DialogTitle>
                    <DialogDescription>
                      Update your Nostr profile information. Changes will be published to the network.
                    </DialogDescription>
                  </DialogHeader>
                  <EditProfileForm />
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCampaigns}</div>
            <p className="text-xs text-muted-foreground">
              {campaigns?.length || 0} total created
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Approved Applications</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{approvedApplications}</div>
            <p className="text-xs text-muted-foreground">
              {applications?.length || 0} total applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSats(totalEarnings)}</div>
            <p className="text-xs text-muted-foreground">
              From {reports?.length || 0} reports
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSats(totalSpent)}</div>
            <p className="text-xs text-muted-foreground">
              On campaigns
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Information */}
      <Tabs defaultValue="identity" className="space-y-6">
        <TabsList>
          <TabsTrigger value="identity">Identity</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="identity" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nostr Identity</CardTitle>
              <CardDescription>
                Your unique Nostr identifiers and verification status
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Public Key */}
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">Public Key</div>
                  <div className="text-sm text-muted-foreground font-mono">
                    {formatPubkey(user.pubkey)}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => copyToClipboard(user.pubkey, 'Public Key')}
                >
                  {copiedField === 'Public Key' ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {/* NIP-05 Verification */}
              {metadata?.nip05 && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">NIP-05 Identifier</div>
                    <div className="text-sm text-muted-foreground">
                      {metadata.nip05}
                    </div>
                  </div>
                  <Badge variant="outline" className="text-green-600 border-green-200">
                    ✓ Verified
                  </Badge>
                </div>
              )}

              {/* Lightning Address */}
              {(metadata?.lud06 || metadata?.lud16) && (
                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <div className="font-medium">Lightning Address</div>
                    <div className="text-sm text-muted-foreground font-mono">
                      {metadata.lud16 || metadata.lud06}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(metadata.lud16 || metadata.lud06 || '', 'Lightning Address')}
                  >
                    {copiedField === 'Lightning Address' ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <SocialPlatformManager
            platforms={socialPlatforms}
            onPlatformsChange={(platforms) => setSocialPlatforms(platforms)}
          />

          <APIConfiguration />
          
          {hasAPIConfiguration() && (
            <RapidAPIGuide />
          )}

          <WalletConnection userRole="creator" />

          <PaymentTest />

          <Card>
            <CardHeader>
              <CardTitle>Developer Settings</CardTitle>
              <CardDescription>
                Options for testing and development
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <TestTube className="h-4 w-4 text-orange-600" />
                    <Label htmlFor="test-mode" className="font-medium">
                      Test Mode
                    </Label>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Enable test mode to simulate Lightning payments without real transactions
                  </p>
                </div>
                <Switch
                  id="test-mode"
                  checked={isTestMode}
                  onCheckedChange={toggleTestMode}
                />
              </div>
              
              {isTestMode && (
                <div className="p-3 bg-orange-50 dark:bg-orange-950 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    Test mode is active. All payments will be simulated. Perfect for testing the complete flow!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Relay Settings</CardTitle>
              <CardDescription>
                Manage your Nostr relay connections
              </CardDescription>
            </CardHeader>
            <CardContent>
              <RelaySelector className="w-full" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Account Type</CardTitle>
              <CardDescription>
                Configure how your account appears to others
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div>
                  <div className="font-medium">Bot Account</div>
                  <div className="text-sm text-muted-foreground">
                    {metadata?.bot ? 'This account is marked as automated' : 'This account is operated by a human'}
                  </div>
                </div>
                <Badge variant={metadata?.bot ? 'secondary' : 'outline'}>
                  {metadata?.bot ? 'Bot' : 'Human'}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="activity" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Business Activity */}
            {campaigns && campaigns.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Business Activity</CardTitle>
                  <CardDescription>
                    Your campaign management history
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {campaigns.slice(0, 5).map((campaign) => (
                    <div key={campaign.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{campaign.title}</div>
                        <div className="text-muted-foreground">
                          {new Date(campaign.createdAt * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        campaign.status === 'active' ? 'text-green-600 border-green-200' :
                        campaign.status === 'paused' ? 'text-yellow-600 border-yellow-200' :
                        'text-gray-600 border-gray-200'
                      }>
                        {campaign.status}
                      </Badge>
                    </div>
                  ))}
                  {campaigns.length > 5 && (
                    <div className="text-sm text-muted-foreground text-center pt-2">
                      +{campaigns.length - 5} more campaigns
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Creator Activity */}
            {applications && applications.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Creator Activity</CardTitle>
                  <CardDescription>
                    Your application and earnings history
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {applications.slice(0, 5).map((application) => (
                    <div key={application.id} className="flex items-center justify-between text-sm">
                      <div>
                        <div className="font-medium">{application.campaignId}</div>
                        <div className="text-muted-foreground">
                          {new Date(application.createdAt * 1000).toLocaleDateString()}
                        </div>
                      </div>
                      <Badge variant="outline" className={
                        application.status === 'approved' ? 'text-green-600 border-green-200' :
                        application.status === 'pending' ? 'text-blue-600 border-blue-200' :
                        'text-red-600 border-red-200'
                      }>
                        {application.status}
                      </Badge>
                    </div>
                  ))}
                  {applications.length > 5 && (
                    <div className="text-sm text-muted-foreground text-center pt-2">
                      +{applications.length - 5} more applications
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}