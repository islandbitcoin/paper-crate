import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { v4 as uuidv4 } from 'uuid';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { formatSats } from '@/lib/campaign-utils';
import { sanitizeTitle, sanitizeDescription } from '@/lib/security/sanitization';
import { isValidBudget, isValidPlatform } from '@/lib/security/validation';
import { useAuth } from '@/hooks/useAuth';
import { logDataAccess } from '@/lib/security/monitoring';

const campaignSchema = z.object({
  title: z.string().min(1, 'Title is required').max(100, 'Title too long')
    .transform(val => sanitizeTitle(val)),
  description: z.string().min(1, 'Description is required').max(500, 'Description too long')
    .transform(val => sanitizeDescription(val)),
  budget: z.number().min(1000, 'Minimum budget is 1000 sats')
    .refine(val => isValidBudget(val), 'Budget must be between 1,000 and 10,000,000 sats'),
  rateLike: z.number().min(0, 'Rate must be positive'),
  rateRepost: z.number().min(0, 'Rate must be positive'),
  rateZap: z.number().min(0, 'Rate must be positive'),
  rateComment: z.number().min(0, 'Rate must be positive'),
  startDate: z.date(),
  endDate: z.date(),
  minFollowers: z.number().optional(),
  maxPosts: z.number().optional(),
});

type CampaignForm = z.infer<typeof campaignSchema>;

interface CreateCampaignDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PLATFORM_OPTIONS = [
  'nostr',
  'twitter',
  'instagram',
  'tiktok',
  'facebook',
  'youtube',
  'linkedin'
];

export function CreateCampaignDialog({ open, onOpenChange }: CreateCampaignDialogProps) {
  const { user } = useCurrentUser();
  const { hasPermission } = useAuth();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['nostr']);

  const form = useForm<CampaignForm>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      description: '',
      budget: 10000, // 10k sats default
      rateLike: 100,
      rateRepost: 500,
      rateZap: 1000,
      rateComment: 200,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      minFollowers: undefined,
      maxPosts: undefined,
    },
  });

  const onSubmit = (data: CampaignForm) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to create a campaign.',
        variant: 'destructive',
      });
      return;
    }

    // Check permission to create campaigns
    if (!hasPermission('campaign.create')) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to create campaigns.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedPlatforms.length === 0) {
      toast({
        title: 'Error',
        description: 'Please select at least one platform.',
        variant: 'destructive',
      });
      return;
    }
    
    // Validate platforms
    const invalidPlatforms = selectedPlatforms.filter(p => !isValidPlatform(p));
    if (invalidPlatforms.length > 0) {
      toast({
        title: 'Invalid Platforms',
        description: `Invalid platforms: ${invalidPlatforms.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (data.endDate <= data.startDate) {
      toast({
        title: 'Error',
        description: 'End date must be after start date.',
        variant: 'destructive',
      });
      return;
    }

    const campaignId = uuidv4();
    const budgetMillisats = data.budget * 1000;

    const tags = [
      ['d', campaignId],
      ['title', data.title],
      ['description', data.description],
      ['budget', budgetMillisats.toString()],
      ['rate_like', (data.rateLike * 1000).toString()],
      ['rate_repost', (data.rateRepost * 1000).toString()],
      ['rate_zap', (data.rateZap * 1000).toString()],
      ['rate_comment', (data.rateComment * 1000).toString()],
      ['platforms', selectedPlatforms.join(',')],
      ['start_date', data.startDate.toISOString()],
      ['end_date', data.endDate.toISOString()],
      ['t', 'campaign'],
      ['status', 'active'],
      ['alt', `Campaign: ${data.title} - Budget: ${formatSats(budgetMillisats)}`],
    ];

    if (data.minFollowers) {
      tags.push(['min_followers', data.minFollowers.toString()]);
    }

    if (data.maxPosts) {
      tags.push(['max_posts', data.maxPosts.toString()]);
    }

    // Log campaign creation
    logDataAccess(user.pubkey, 'campaign', 'write', campaignId);

    createEvent(
      {
        kind: 33851,
        content: '',
        tags,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Campaign Created',
            description: 'Your campaign has been published successfully!',
          });
          onOpenChange(false);
          form.reset();
          setSelectedPlatforms(['nostr']);
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: 'Failed to create campaign. Please try again.',
            variant: 'destructive',
          });
          console.error('Campaign creation error:', error);
        },
      }
    );
  };

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const totalRates = form.watch(['rateLike', 'rateRepost', 'rateZap', 'rateComment']);
  const estimatedCostPer100Engagements = (totalRates[0] + totalRates[1] + totalRates[2] + totalRates[3]) * 25; // Rough estimate

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Campaign</DialogTitle>
          <DialogDescription>
            Set up a new influencer marketing campaign with custom payment rates.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Summer Product Launch" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe your campaign goals, requirements, and any specific guidelines for creators..."
                        className="min-h-20"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Provide clear guidelines for creators about what content you're looking for.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Platforms */}
            <div className="space-y-3">
              <Label>Supported Platforms</Label>
              <div className="flex flex-wrap gap-2">
                {PLATFORM_OPTIONS.map(platform => (
                  <Badge
                    key={platform}
                    variant={selectedPlatforms.includes(platform) ? 'default' : 'outline'}
                    className="cursor-pointer capitalize"
                    onClick={() => togglePlatform(platform)}
                  >
                    {platform}
                    {selectedPlatforms.includes(platform) && (
                      <X className="h-3 w-3 ml-1" />
                    )}
                  </Badge>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Select the platforms where creators can promote your campaign.
              </p>
            </div>

            {/* Budget */}
            <FormField
              control={form.control}
              name="budget"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Total Budget (sats)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      placeholder="10000"
                      {...field}
                      onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                    />
                  </FormControl>
                  <FormDescription>
                    Total budget in satoshis. Current value: {formatSats(field.value * 1000)}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Payment Rates */}
            <div className="space-y-4">
              <Label>Payment Rates (sats per engagement)</Label>
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="rateLike"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Like</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="100"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rateRepost"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Repost/Share</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="500"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rateZap"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Zap (Nostr)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="1000"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="rateComment"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Per Comment</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          placeholder="200"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <p className="text-sm text-muted-foreground">
                Estimated cost per 100 engagements: {formatSats(estimatedCostPer100Engagements * 1000)}
              </p>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Start Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>End Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className="w-full pl-3 text-left font-normal"
                          >
                            {field.value ? (
                              format(field.value, "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date < new Date(new Date().setHours(0, 0, 0, 0))
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Requirements */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="minFollowers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Min Followers (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="1000"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxPosts"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Max Posts per Creator (optional)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="3"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

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
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Creating...' : 'Create Campaign'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}