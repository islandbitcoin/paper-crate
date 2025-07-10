import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, X } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { generateCampaignCoordinate, validatePlatformHandle } from '@/lib/campaign-utils';
import type { Campaign } from '@/stores/campaignStore';

interface SocialPlatform {
  platform: string;
  handle: string;
  followers: number;
  verified: boolean;
  url?: string;
  isManualEntry?: boolean;
}

const applicationSchema = z.object({
  message: z.string().min(1, 'Application message is required').max(1000, 'Message too long'),
});

type ApplicationForm = z.infer<typeof applicationSchema>;

interface ApplyCampaignDialogProps {
  campaign: Campaign;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ApplyCampaignDialog({ campaign, open, onOpenChange }: ApplyCampaignDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [platformInputs, setPlatformInputs] = useState<Record<string, { handle: string; followers: string }>>({});
  
  // Load saved social platforms from localStorage
  const storageKey = user ? `social-platforms-${user.pubkey}` : 'social-platforms-anonymous';
  const [savedPlatforms] = useLocalStorage<SocialPlatform[]>(storageKey, []);

  const form = useForm<ApplicationForm>({
    resolver: zodResolver(applicationSchema),
    defaultValues: {
      message: '',
      platforms: {},
      followers: {},
    },
  });

  // Auto-fill platforms from saved profile when dialog opens
  useEffect(() => {
    if (open && savedPlatforms.length > 0) {
      const autoFilledPlatforms: Record<string, { handle: string; followers: string }> = {};
      
      // Only auto-fill platforms that the campaign is looking for
      savedPlatforms.forEach(savedPlatform => {
        if (campaign.platforms.includes(savedPlatform.platform)) {
          autoFilledPlatforms[savedPlatform.platform] = {
            handle: savedPlatform.handle,
            followers: savedPlatform.followers.toString(),
          };
        }
      });
      
      // Only update if we have platforms to auto-fill
      if (Object.keys(autoFilledPlatforms).length > 0) {
        setPlatformInputs(autoFilledPlatforms);
      }
    }
  }, [open, savedPlatforms, campaign.platforms]);

  const addPlatform = (platform: string) => {
    if (!campaign.platforms.includes(platform)) return;
    
    // Check if this platform is saved in the user's profile
    const savedPlatform = savedPlatforms.find(p => p.platform === platform);
    
    setPlatformInputs(prev => ({
      ...prev,
      [platform]: {
        handle: savedPlatform?.handle || '',
        followers: savedPlatform?.followers.toString() || ''
      }
    }));
  };

  const removePlatform = (platform: string) => {
    setPlatformInputs(prev => {
      const newInputs = { ...prev };
      delete newInputs[platform];
      return newInputs;
    });
  };

  const updatePlatformData = (platform: string, field: 'handle' | 'followers', value: string) => {
    setPlatformInputs(prev => ({
      ...prev,
      [platform]: {
        ...prev[platform],
        [field]: value
      }
    }));
  };

  const onSubmit = (data: ApplicationForm) => {
    console.log('Form submitted with data:', data);
    console.log('Platform inputs:', platformInputs);
    console.log('User:', user);
    
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to apply.',
        variant: 'destructive',
      });
      return;
    }

    // Check if any platforms have been added
    if (Object.keys(platformInputs).length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one social media platform.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate platform data
    const platforms: Record<string, string> = {};
    const followers: Record<string, number> = {};
    
    for (const [platform, input] of Object.entries(platformInputs)) {
      if (!input.handle.trim()) {
        toast({
          title: 'Error',
          description: `Please enter your ${platform} handle.`,
          variant: 'destructive',
        });
        return;
      }
      
      if (!validatePlatformHandle(platform, input.handle)) {
        toast({
          title: 'Error',
          description: `Invalid ${platform} handle format.`,
          variant: 'destructive',
        });
        return;
      }
      
      const followerCount = parseInt(input.followers);
      if (isNaN(followerCount) || followerCount < 0) {
        toast({
          title: 'Error',
          description: `Please enter a valid follower count for ${platform}.`,
          variant: 'destructive',
        });
        return;
      }
      
      platforms[platform] = input.handle;
      followers[platform] = followerCount;
    }

    // Check minimum followers requirement
    if (campaign.minFollowers) {
      const totalFollowers = Object.values(followers).reduce((sum, count) => sum + count, 0);
      if (totalFollowers < campaign.minFollowers) {
        toast({
          title: 'Error',
          description: `This campaign requires at least ${campaign.minFollowers.toLocaleString()} followers.`,
          variant: 'destructive',
        });
        return;
      }
    }

    const campaignCoordinate = generateCampaignCoordinate(campaign.businessPubkey, campaign.id);
    const applicationId = `${campaign.id}:${user.pubkey}`;
    
    // Format platform and follower data for tags
    const platformsStr = Object.entries(platforms).map(([platform, handle]) => `${platform}:${handle}`).join(',');
    const followersStr = Object.entries(followers).map(([platform, count]) => `${platform}:${count}`).join(',');
    
    const tags = [
      ['d', applicationId],
      ['a', campaignCoordinate],
      ['p', campaign.businessPubkey],
      ['platforms', platformsStr],
      ['followers', followersStr],
      ['t', 'campaign-application'],
      ['status', 'pending'],
      ['alt', `Application to campaign: ${campaign.title}`],
    ];

    createEvent(
      {
        kind: 34609,
        content: data.message,
        tags,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Application Submitted',
            description: 'Your application has been sent to the business!',
          });
          onOpenChange(false);
          form.reset();
          setPlatformInputs({});
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: 'Failed to submit application. Please try again.',
            variant: 'destructive',
          });
          console.error('Application submission error:', error);
        },
      }
    );
  };

  const availablePlatforms = campaign.platforms.filter(p => !platformInputs[p]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to Campaign</DialogTitle>
          <DialogDescription>
            Apply to "{campaign.title}" and showcase your social media presence.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Application Message */}
            <FormField
              control={form.control}
              name="message"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Application Message</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="Tell the business why you're perfect for this campaign. Include links to your best work, your audience demographics, and how you plan to promote their product..."
                      className="min-h-24"
                      {...field} 
                    />
                  </FormControl>
                  <FormDescription>
                    Make a compelling case for why you should be selected for this campaign.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform Credentials */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label>Platform Credentials</Label>
                {availablePlatforms.length > 0 && (
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-muted-foreground">Add:</span>
                    {availablePlatforms.map(platform => {
                      const isSaved = savedPlatforms.some(p => p.platform === platform);
                      return (
                        <Badge
                          key={platform}
                          variant={isSaved ? "default" : "outline"}
                          className="cursor-pointer capitalize"
                          onClick={() => addPlatform(platform)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          {platform}
                          {isSaved && <span className="ml-1 text-xs">(saved)</span>}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </div>

              {Object.keys(platformInputs).length === 0 && (
                <p className="text-sm text-muted-foreground">
                  Add your platform credentials to show your reach and engagement.
                </p>
              )}

              {Object.entries(platformInputs).map(([platform, input]) => {
                const savedPlatform = savedPlatforms.find(p => p.platform === platform);
                const isAutoFilled = savedPlatform && 
                  savedPlatform.handle === input.handle && 
                  savedPlatform.followers.toString() === input.followers;
                
                return (
                  <div key={platform} className="border rounded-lg p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <h4 className="font-medium capitalize">{platform}</h4>
                        {isAutoFilled && (
                          <Badge variant="secondary" className="text-xs">
                            Auto-filled from profile
                          </Badge>
                        )}
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removePlatform(platform)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-sm">Handle/Username</Label>
                      <Input
                        placeholder={platform === 'nostr' ? 'npub1...' : '@username'}
                        value={input.handle}
                        onChange={(e) => updatePlatformData(platform, 'handle', e.target.value)}
                      />
                    </div>
                    <div>
                      <Label className="text-sm">Followers</Label>
                      <Input
                        type="number"
                        placeholder="1000"
                        value={input.followers}
                        onChange={(e) => updatePlatformData(platform, 'followers', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                );
              })}
            </div>

            {/* Campaign Requirements */}
            {(campaign.minFollowers || campaign.maxPosts) && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Campaign Requirements</h4>
                <div className="text-sm text-muted-foreground space-y-1">
                  {campaign.minFollowers && (
                    <div>• Minimum {campaign.minFollowers.toLocaleString()} total followers</div>
                  )}
                  {campaign.maxPosts && (
                    <div>• Maximum {campaign.maxPosts} posts per creator</div>
                  )}
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button 
                type="submit" 
                disabled={isPending}
                variant={Object.keys(platformInputs).length === 0 ? "outline" : "default"}
              >
                {isPending ? 'Submitting...' : 
                 Object.keys(platformInputs).length === 0 ? 'Add Platforms First' : 'Submit Application'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}