import { useState, useEffect } from 'react';
import { Plus, X, ExternalLink, Check, AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/useToast';
import { 
  fetchFollowerCount, 
  normalizeHandle, 
  getProfileUrl, 
  validateHandle,
  SUPPORTED_PLATFORMS 
} from '@/lib/social-media-service';
import { hasAPIConfiguration } from '@/lib/api/social-media-api';
import { useNostrFollowers } from '@/hooks/useNostrFollowers';

interface SocialPlatform {
  platform: string;
  handle: string;
  followers: number;
  verified: boolean;
  url?: string;
  isManualEntry?: boolean; // Track if followers were entered manually
}

interface SocialPlatformManagerProps {
  platforms: SocialPlatform[];
  onPlatformsChange: (platforms: SocialPlatform[]) => void;
  readonly?: boolean;
}

// Add placeholder information for supported platforms
const PLATFORM_PLACEHOLDERS: Record<string, string> = {
  twitter: '@username',
  instagram: '@username',
  tiktok: '@username',
  youtube: '@channel or channel name',
  threads: '@username',
  nostr: 'npub1... or hex pubkey',
};

export function SocialPlatformManager({ platforms, onPlatformsChange, readonly = false }: SocialPlatformManagerProps) {
  const { toast } = useToast();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPlatform, setNewPlatform] = useState({
    platform: '',
    handle: '',
    followers: 0,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [loadingPlatform, setLoadingPlatform] = useState<string | null>(null);
  
  // Track the current Nostr handle for fetching followers
  const nostrPlatform = platforms.find(p => p.platform === 'nostr');
  const currentNostrHandle = nostrPlatform?.handle || null;
  
  // Use the Nostr followers hook
  const { data: nostrData, isLoading: isLoadingNostrFollowers, refetch: refetchNostrFollowers } = useNostrFollowers(currentNostrHandle);
  
  // Update Nostr follower count when data is fetched
  useEffect(() => {
    if (nostrData && nostrData.followers > 0 && nostrPlatform) {
      const updatedPlatforms = platforms.map(p =>
        p.platform === 'nostr' ? { ...p, followers: nostrData.followers, isManualEntry: false } : p
      );
      if (JSON.stringify(updatedPlatforms) !== JSON.stringify(platforms)) {
        onPlatformsChange(updatedPlatforms);
      }
    }
  }, [nostrData, nostrPlatform, platforms, onPlatformsChange]);

  const addPlatform = async () => {
    if (!newPlatform.platform || !newPlatform.handle) {
      toast({
        title: 'Error',
        description: 'Please select a platform and enter your handle.',
        variant: 'destructive',
      });
      return;
    }

    // Validate handle format
    const validation = await validateHandle(newPlatform.handle, newPlatform.platform);
    if (!validation.valid) {
      toast({
        title: 'Error',
        description: validation.error || 'Invalid handle format for this platform.',
        variant: 'destructive',
      });
      return;
    }

    // Check if platform already exists
    if (platforms.some(p => p.platform === newPlatform.platform)) {
      toast({
        title: 'Error',
        description: 'You already have this platform added.',
        variant: 'destructive',
      });
      return;
    }

    setIsLoading(true);

    try {
      // Use manual follower count if provided, otherwise try to fetch
      let followers = newPlatform.followers || 0;
      let verified = false;
      let isManualEntry = !!newPlatform.followers; // If user provided followers, it's manual
      
      // For Nostr, we'll rely on the hook to fetch followers after adding
      if (newPlatform.platform === 'nostr') {
        // Don't fetch here, the hook will handle it
        isManualEntry = false; // Nostr always fetches automatically
        toast({
          title: 'Nostr Account Added',
          description: 'Fetching follower count from Nostr relays...',
        });
      } else if (!newPlatform.followers && hasAPIConfiguration()) {
        // Try to fetch real follower count for other platforms
        const profileData = await fetchFollowerCount(newPlatform.handle, newPlatform.platform);
        
        if (profileData.error && !profileData.followers) {
          // Check if it's a RapidAPI subscription error
          const isRapidAPIError = profileData.error.includes('RapidAPI');
          isManualEntry = true; // Failed to fetch, so any value is manual
          
          toast({
            title: isRapidAPIError ? 'API Subscription Required' : 'Note',
            description: profileData.error || 'Please update your follower count manually.',
            variant: isRapidAPIError ? 'destructive' : 'default',
          });
        } else if (profileData.followers > 0) {
          isManualEntry = false; // Successfully fetched
          toast({
            title: 'Success',
            description: `Fetched ${profileData.followers.toLocaleString()} followers from ${newPlatform.platform}`,
          });
        }
        
        followers = profileData.followers || 0;
        verified = profileData.verified || false;
      } else if (!hasAPIConfiguration() && newPlatform.platform !== 'nostr') {
        // No API configuration, so it's manual
        isManualEntry = true;
      }

      const platform: SocialPlatform = {
        platform: newPlatform.platform,
        handle: normalizeHandle(newPlatform.handle, newPlatform.platform),
        followers,
        verified,
        url: getProfileUrl(newPlatform.handle, newPlatform.platform),
        isManualEntry,
      };

      onPlatformsChange([...platforms, platform]);
      setNewPlatform({ platform: '', handle: '', followers: 0 });
      setShowAddDialog(false);

      toast({
        title: 'Platform Added',
        description: `${SUPPORTED_PLATFORMS.find(p => p.id === newPlatform.platform)?.name || newPlatform.platform} account has been added${followers ? ` with ${followers.toLocaleString()} followers` : ''}.`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to add platform. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const removePlatform = (platformToRemove: string) => {
    onPlatformsChange(platforms.filter(p => p.platform !== platformToRemove));
    toast({
      title: 'Platform Removed',
      description: 'Platform has been removed from your profile.',
    });
  };

  const updateFollowers = (platform: string, followers: number) => {
    onPlatformsChange(
      platforms.map(p =>
        p.platform === platform ? { ...p, followers } : p
      )
    );
  };


  const refreshFollowerCount = async (platform: SocialPlatform) => {
    setLoadingPlatform(platform.platform);
    
    try {
      // For Nostr, use the refetch function from the hook
      if (platform.platform === 'nostr') {
        const result = await refetchNostrFollowers();
        if (result.data && result.data.followers > 0) {
          onPlatformsChange(
            platforms.map(p =>
              p.platform === platform.platform 
                ? { ...p, followers: result.data.followers, isManualEntry: false }
                : p
            )
          );
          toast({
            title: 'Success',
            description: `Updated follower count: ${result.data.followers.toLocaleString()}`,
          });
        } else if (result.data?.error) {
          toast({
            title: 'Error',
            description: result.data.error,
            variant: 'destructive',
          });
        }
        return;
      }
      
      // For other platforms, use the existing API
      const profileData = await fetchFollowerCount(platform.handle, platform.platform);
      
      if (profileData.error) {
        // Check if it's a RapidAPI subscription error
        const isRapidAPIError = profileData.error.includes('RapidAPI');
        
        toast({
          title: isRapidAPIError ? 'API Subscription Required' : 'Error',
          description: profileData.error,
          variant: 'destructive',
          action: isRapidAPIError ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://rapidapi.com/search/twitter', '_blank')}
            >
              Subscribe to API
            </Button>
          ) : undefined,
        });
      } else if (profileData.followers > 0) {
        onPlatformsChange(
          platforms.map(p =>
            p.platform === platform.platform
              ? { ...p, followers: profileData.followers, verified: profileData.verified, isManualEntry: false }
              : p
          )
        );
        
        toast({
          title: 'Updated',
          description: `${platform.platform} followers updated to ${profileData.followers.toLocaleString()}`,
        });
      }
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to update follower count.',
        variant: 'destructive',
      });
    } finally {
      setLoadingPlatform(null);
    }
  };

  const availablePlatforms = SUPPORTED_PLATFORMS.filter(
    p => !platforms.some(existing => existing.platform === p.id)
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Social Media Platforms</CardTitle>
            <CardDescription>
              Manage your social media accounts for campaign applications
            </CardDescription>
          </div>
          {!readonly && availablePlatforms.length > 0 && (
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Platform
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Social Platform</DialogTitle>
                  <DialogDescription>
                    Add a social media platform to your creator profile
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Platform</Label>
                    <Select
                      value={newPlatform.platform}
                      onValueChange={(value) => setNewPlatform(prev => ({ ...prev, platform: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a platform" />
                      </SelectTrigger>
                      <SelectContent>
                        {availablePlatforms.map((platform) => (
                          <SelectItem key={platform.id} value={platform.id}>
                            <div className="flex items-center space-x-2">
                              <span>{platform.icon}</span>
                              <span>{platform.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {newPlatform.platform && (
                    <>
                      <div>
                        <Label>Handle/Username</Label>
                        <Input
                          placeholder={
                            PLATFORM_PLACEHOLDERS[newPlatform.platform] || 'Enter your handle'
                          }
                          value={newPlatform.handle}
                          onChange={(e) => setNewPlatform(prev => ({ ...prev, handle: e.target.value }))}
                        />
                      </div>

                      <div>
                        <Label>Followers (optional)</Label>
                        <Input
                          type="number"
                          placeholder="Enter your follower count"
                          value={newPlatform.followers || ''}
                          onChange={(e) => setNewPlatform(prev => ({
                            ...prev,
                            followers: parseInt(e.target.value) || 0
                          }))}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Enter your current follower count. You can update it later.
                        </p>
                      </div>
                    </>
                  )}

                  <div className="flex justify-end space-x-2">
                    <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addPlatform} disabled={isLoading}>
                      {isLoading ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Fetching...
                        </>
                      ) : (
                        'Add Platform'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {platforms.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <div className="space-y-2">
              <p>No social platforms added yet.</p>
              {!readonly && (
                <p className="text-sm">Add your social media accounts to apply for campaigns.</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {platforms.map((platform) => (
              <div key={platform.platform} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-lg">
                      {SUPPORTED_PLATFORMS.find(p => p.id === platform.platform)?.icon || '🌐'}
                    </span>
                    <div>
                      <div className="font-medium capitalize flex items-center space-x-2">
                        <span>{SUPPORTED_PLATFORMS.find(p => p.id === platform.platform)?.name || platform.platform}</span>
                        {platform.verified && (
                          <Check className="h-4 w-4 text-green-500" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {platform.handle}
                      </div>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="font-medium">
                      {platform.platform === 'nostr' && isLoadingNostrFollowers && platform.followers === 0 ? (
                        <span className="text-muted-foreground">Loading...</span>
                      ) : (
                        `${platform.followers.toLocaleString()} followers`
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {platform.url && (
                    <Button variant="ghost" size="sm" asChild>
                      <a href={platform.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </Button>
                  )}

                  {!readonly && (
                    <>
                      {/* Only show editable input if follower count was manually entered */}
                      {platform.isManualEntry ? (
                        <div className="flex items-center space-x-2">
                          <Input
                            type="number"
                            value={platform.followers}
                            onChange={(e) => updateFollowers(platform.platform, parseInt(e.target.value) || 0)}
                            className="w-24 h-8 text-sm"
                            placeholder="0"
                          />
                          <div className="flex items-center text-xs text-yellow-600">
                            <AlertCircle className="h-3 w-3 mr-1" />
                            <span>Unverified</span>
                          </div>
                        </div>
                      ) : (
                        // Show refresh button for platforms where we successfully fetched data
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => refreshFollowerCount(platform)}
                          disabled={loadingPlatform === platform.platform || (platform.platform === 'nostr' && isLoadingNostrFollowers)}
                          title="Refresh follower count"
                        >
                          {loadingPlatform === platform.platform || (platform.platform === 'nostr' && isLoadingNostrFollowers) ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="h-4 w-4" />
                          )}
                        </Button>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlatform(platform.platform)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {platforms.length > 0 && (
          <div className="mt-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-start space-x-2">
              <AlertCircle className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Keep Your Data Updated</p>
                <p>
                  Regularly update your follower counts to qualify for campaigns.
                  Businesses use this information to match creators with appropriate opportunities.
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}