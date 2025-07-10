import { ExternalLink, CheckCircle, Clock, Check } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { formatSats, getPlatformIcon } from '@/lib/campaign-utils';
import type { PerformanceReport } from '@/stores/campaignStore';
import { PayCreatorButton } from './PayCreatorButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useToast } from '@/hooks/useToast';
import { useCampaignStore } from '@/stores/campaignStore';
import { useQueryClient } from '@tanstack/react-query';

interface ReportCardProps {
  report: PerformanceReport;
  showPayButton?: boolean;
  showApproveButton?: boolean;
}

export function ReportCard({ report, showPayButton = false, showApproveButton = false }: ReportCardProps) {
  const { user } = useCurrentUser();
  const { mutate: publishEvent } = useNostrPublish();
  const { toast } = useToast();
  const updateReport = useCampaignStore(state => state.updateReport);
  const queryClient = useQueryClient();
  
  const reportDate = new Date(report.createdAt * 1000);
  const totalEngagement = Object.values(report.metrics).reduce((sum, count) => sum + count, 0);
  
  // Extract campaign ID from coordinate (format: "kind:pubkey:identifier")
  const campaignId = report.campaignCoordinate.split(':')[2];
  
  const handleApprove = () => {
    if (!user) return;
    
    // Update local state
    updateReport(report.id, { verified: true });
    
    // Publish verification event
    publishEvent({
      kind: 34612, // Report verification event
      content: JSON.stringify({
        reportId: report.id,
        verified: true,
        timestamp: Math.floor(Date.now() / 1000),
      }),
      tags: [
        ['d', `verification-${report.id}`],
        ['e', report.id],
        ['p', report.creatorPubkey],
        ['a', report.campaignCoordinate],
        ['status', 'verified'],
      ],
    }, {
      onSuccess: () => {
        // Invalidate queries to refetch with updated verification status
        queryClient.invalidateQueries({ queryKey: ['business-reports'] });
        queryClient.invalidateQueries({ queryKey: ['creator-reports'] });
      }
    });
    
    toast({
      title: 'Report Approved',
      description: 'The performance report has been verified.',
    });
  };

  const getVerificationIcon = () => {
    if (report.verified) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Clock className="h-4 w-4 text-yellow-500" />;
  };

  const getVerificationStatus = () => {
    if (report.verified) {
      return { text: 'Verified', color: 'text-green-600 bg-green-50 border-green-200' };
    }
    return { text: 'Pending', color: 'text-yellow-600 bg-yellow-50 border-yellow-200' };
  };

  const status = getVerificationStatus();

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="text-lg">{getPlatformIcon(report.platform)}</span>
            <div>
              <CardTitle className="text-lg capitalize">{report.platform} Post</CardTitle>
              <CardDescription>
                {reportDate.toLocaleDateString()} • {formatSats(report.amountClaimed)} claimed
              </CardDescription>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {getVerificationIcon()}
            <Badge variant="outline" className={status.color}>
              {status.text}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Post Link */}
        <div>
          <Button variant="outline" size="sm" className="w-full" asChild>
            <a href={report.postUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Post
            </a>
          </Button>
        </div>

        {/* Metrics */}
        <div>
          <h4 className="text-sm font-medium mb-2">Performance Metrics</h4>
          <div className="grid grid-cols-2 gap-3 text-sm">
            {Object.entries(report.metrics).map(([type, count]) => (
              <div key={type} className="flex items-center justify-between">
                <span className="text-muted-foreground capitalize">{type}:</span>
                <span className="font-mono">{count.toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between text-sm pt-2 border-t mt-2">
            <span className="font-medium">Total Engagement:</span>
            <span className="font-mono font-medium">{totalEngagement.toLocaleString()}</span>
          </div>
        </div>

        {/* Notes */}
        {report.notes && (
          <div>
            <h4 className="text-sm font-medium mb-2">Notes</h4>
            <p className="text-sm text-muted-foreground">
              {report.notes}
            </p>
          </div>
        )}

        {/* Payment Status */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <span className="text-muted-foreground">Amount Claimed:</span>
          <div className="flex items-center space-x-2">
            <span className="font-mono font-medium">{formatSats(report.amountClaimed)}</span>
            {report.paymentHash && (
              <Badge variant="secondary" className="text-xs">
                Paid
              </Badge>
            )}
          </div>
        </div>

        {/* Campaign Info */}
        <div className="text-xs text-muted-foreground">
          Campaign: {report.campaignCoordinate.split(':')[2]}
        </div>

        {/* Approve Button - Only show for business users on unverified reports */}
        {showApproveButton && user && !report.verified && (
          <div className="pt-2">
            <Button 
              onClick={handleApprove}
              className="w-full"
              variant="outline"
            >
              <Check className="h-4 w-4 mr-2" />
              Approve Report
            </Button>
          </div>
        )}

        {/* Pay Creator Button - Only show for business users on verified reports */}
        {showPayButton && user && report.verified && !report.paymentHash && (
          <div className="pt-2">
            <PayCreatorButton report={report} campaignId={campaignId} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}