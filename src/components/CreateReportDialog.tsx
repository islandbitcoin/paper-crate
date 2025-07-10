import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useCreatorApplications } from '@/hooks/useCampaignApplications';
import { formatSats, calculateEarnings } from '@/lib/campaign-utils';

const reportSchema = z.object({
  campaignCoordinate: z.string().min(1, 'Please select a campaign'),
  platform: z.string().min(1, 'Platform is required'),
  postUrl: z.string().url('Please enter a valid URL'),
  nostrEventId: z.string().optional(),
  metrics: z.record(z.number().min(0)),
  notes: z.string().optional(),
});

type ReportForm = z.infer<typeof reportSchema>;

interface CreateReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const METRIC_TYPES = [
  { key: 'likes', label: 'Likes' },
  { key: 'reposts', label: 'Reposts/Shares' },
  { key: 'comments', label: 'Comments' },
  { key: 'zaps', label: 'Zaps (Nostr only)' },
];

export function CreateReportDialog({ open, onOpenChange }: CreateReportDialogProps) {
  const { user } = useCurrentUser();
  const { mutate: createEvent, isPending } = useNostrPublish();
  const { toast } = useToast();
  const { data: applications } = useCreatorApplications(user?.pubkey);

  const [selectedCampaign, setSelectedCampaign] = useState<string>('');
  const [metrics, setMetrics] = useState<Record<string, number>>({});

  const form = useForm<ReportForm>({
    resolver: zodResolver(reportSchema),
    defaultValues: {
      campaignCoordinate: '',
      platform: '',
      postUrl: '',
      nostrEventId: '',
      metrics: {},
      notes: '',
    },
  });

  // Get approved applications only
  const approvedApplications = applications?.filter(app => app.status === 'approved') || [];

  const updateMetric = (type: string, value: string) => {
    const numValue = parseInt(value) || 0;
    setMetrics(prev => ({
      ...prev,
      [type]: numValue
    }));
  };

  const onSubmit = (data: ReportForm) => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'You must be logged in to submit a report.',
        variant: 'destructive',
      });
      return;
    }

    if (Object.keys(metrics).length === 0) {
      toast({
        title: 'Error',
        description: 'Please add at least one performance metric.',
        variant: 'destructive',
      });
      return;
    }

    // Find the selected application to get campaign details
    const selectedApp = approvedApplications.find(app => app.campaignCoordinate === data.campaignCoordinate);
    if (!selectedApp) {
      toast({
        title: 'Error',
        description: 'Invalid campaign selection.',
        variant: 'destructive',
      });
      return;
    }

    // Calculate earnings based on metrics (this would normally come from campaign rates)
    // For now, we'll use placeholder rates
    const placeholderRates = {
      like: 100,
      repost: 500,
      zap: 1000,
      comment: 200,
    };

    const amountClaimed = calculateEarnings(metrics, placeholderRates);

    // Format metrics for tag
    const metricsStr = Object.entries(metrics)
      .map(([type, count]) => `${type}:${count}`)
      .join(',');

    const tags = [
      ['a', data.campaignCoordinate],
      ['p', selectedApp.businessPubkey],
      ['platform', data.platform],
      ['post_url', data.postUrl],
      ['metrics', metricsStr],
      ['amount_claimed', amountClaimed.toString()],
      ['t', 'performance-report'],
      ['alt', `Performance report for ${data.platform} post - ${formatSats(amountClaimed)} claimed`],
    ];

    if (data.nostrEventId) {
      tags.push(['e', data.nostrEventId]);
    }

    createEvent(
      {
        kind: 3387,
        content: data.notes || '',
        tags,
      },
      {
        onSuccess: () => {
          toast({
            title: 'Report Submitted',
            description: `Your performance report has been submitted. Claimed: ${formatSats(amountClaimed)}`,
          });
          onOpenChange(false);
          form.reset();
          setMetrics({});
          setSelectedCampaign('');
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: 'Failed to submit report. Please try again.',
            variant: 'destructive',
          });
          console.error('Report submission error:', error);
        },
      }
    );
  };

  const selectedApp = approvedApplications.find(app => app.campaignCoordinate === selectedCampaign);
  const availablePlatforms = selectedApp?.platforms ? Object.keys(selectedApp.platforms) : [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Submit Performance Report</DialogTitle>
          <DialogDescription>
            Report the performance of your campaign post to claim your earnings.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Campaign Selection */}
            <FormField
              control={form.control}
              name="campaignCoordinate"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign</FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      field.onChange(value);
                      setSelectedCampaign(value);
                    }}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign you're approved for" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {approvedApplications.map((app) => (
                        <SelectItem key={app.id} value={app.campaignCoordinate}>
                          {app.campaignId}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Only campaigns you've been approved for are shown.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Platform Selection */}
            {selectedApp && (
              <FormField
                control={form.control}
                name="platform"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Platform</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select platform" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {availablePlatforms.map((platform) => (
                          <SelectItem key={platform} value={platform}>
                            {platform.charAt(0).toUpperCase() + platform.slice(1)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Post URL */}
            <FormField
              control={form.control}
              name="postUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Post URL</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="https://twitter.com/username/status/123456789"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Direct link to your campaign post for verification.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Nostr Event ID (optional) */}
            {form.watch('platform') === 'nostr' && (
              <FormField
                control={form.control}
                name="nostrEventId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nostr Event ID (optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Event ID in hex format"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      The event ID of your Nostr post for automatic verification.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            {/* Performance Metrics */}
            <div className="space-y-4">
              <Label>Performance Metrics</Label>
              <div className="grid grid-cols-2 gap-4">
                {METRIC_TYPES.map((metric) => (
                  <div key={metric.key}>
                    <Label className="text-sm">{metric.label}</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={metrics[metric.key] || ''}
                      onChange={(e) => updateMetric(metric.key, e.target.value)}
                    />
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                Enter the current engagement numbers for your post.
              </p>
            </div>

            {/* Earnings Preview */}
            {Object.keys(metrics).length > 0 && (
              <div className="bg-muted/50 rounded-lg p-4">
                <h4 className="font-medium mb-2">Estimated Earnings</h4>
                <div className="text-sm space-y-1">
                  {Object.entries(metrics).map(([type, count]) => (
                    <div key={type} className="flex justify-between">
                      <span className="capitalize">{type}: {count}</span>
                      <span className="font-mono">
                        {formatSats(count * (type === 'likes' ? 100 : type === 'reposts' ? 500 : type === 'zaps' ? 1000 : 200) * 1000)}
                      </span>
                    </div>
                  ))}
                  <div className="flex justify-between font-medium pt-2 border-t">
                    <span>Total:</span>
                    <span className="font-mono">
                      {formatSats(calculateEarnings(metrics, { like: 100, repost: 500, zap: 1000, comment: 200 }))}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Notes */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Any additional notes about the post performance or campaign experience..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

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
              <Button type="submit" disabled={isPending || !selectedCampaign}>
                {isPending ? 'Submitting...' : 'Submit Report'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}