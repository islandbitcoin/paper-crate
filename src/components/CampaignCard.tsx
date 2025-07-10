import { Calendar, DollarSign, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { formatSats, getCampaignStatus, getStatusColor, getPlatformIcon } from '@/lib/campaign-utils';
import type { Campaign } from '@/stores/campaignStore';

interface CampaignCardProps {
  campaign: Campaign;
  showApplyButton?: boolean;
  onApply?: (campaign: Campaign) => void;
  onView?: (campaign: Campaign) => void;
}

export function CampaignCard({
  campaign,
  showApplyButton = false,
  onApply,
  onView
}: CampaignCardProps) {
  const author = useAuthor(campaign.businessPubkey);
  const metadata = author.data?.metadata;

  const displayName = metadata?.name ?? genUserName(campaign.businessPubkey);
  const { status, daysRemaining } = getCampaignStatus(campaign);

  const endDate = new Date(campaign.endDate);

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="space-y-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {displayName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{campaign.title}</CardTitle>
              <CardDescription className="text-sm">
                by {displayName}
              </CardDescription>
            </div>
          </div>
          <Badge
            variant="outline"
            className={`${getStatusColor(status)} text-xs`}
          >
            {status === 'ending-soon' && daysRemaining
              ? `${daysRemaining}d left`
              : status.replace('-', ' ')
            }
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground line-clamp-2">
          {campaign.description}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Platforms */}
        <div className="space-y-2">
          <span className="text-sm font-medium">Platforms:</span>
          <div className="flex flex-wrap gap-1">
            {campaign.platforms.map((platform) => (
              <Badge key={platform} variant="secondary" className="text-xs">
                {getPlatformIcon(platform)} {platform}
              </Badge>
            ))}
          </div>
        </div>

        {/* Payment Rates */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          {campaign.rates.like > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Like:</span>
              <span className="font-mono">{formatSats(campaign.rates.like)}</span>
            </div>
          )}
          {campaign.rates.repost > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Repost:</span>
              <span className="font-mono">{formatSats(campaign.rates.repost)}</span>
            </div>
          )}
          {campaign.rates.zap > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Zap:</span>
              <span className="font-mono">{formatSats(campaign.rates.zap)}</span>
            </div>
          )}
          {campaign.rates.comment > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-muted-foreground">Comment:</span>
              <span className="font-mono">{formatSats(campaign.rates.comment)}</span>
            </div>
          )}
        </div>

        {/* Campaign Details */}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center space-x-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">{formatSats(campaign.budget)}</div>
              <div className="text-muted-foreground">Budget</div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <div className="font-medium">
                {endDate.toLocaleDateString()}
              </div>
              <div className="text-muted-foreground">Ends</div>
            </div>
          </div>
        </div>

        {/* Requirements */}
        {(campaign.minFollowers || campaign.maxPosts) && (
          <div className="text-sm space-y-1">
            <div className="font-medium">Requirements:</div>
            <div className="text-muted-foreground space-y-1">
              {campaign.minFollowers && (
                <div className="flex items-center space-x-2">
                  <Users className="h-3 w-3" />
                  <span>Min {campaign.minFollowers.toLocaleString()} followers</span>
                </div>
              )}
              {campaign.maxPosts && (
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-3 w-3" />
                  <span>Max {campaign.maxPosts} posts</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex space-x-2 pt-2">
          {showApplyButton && onApply && (
            <Button
              onClick={() => onApply(campaign)}
              disabled={status !== 'active'}
              className="flex-1"
            >
              Apply Now
            </Button>
          )}
          {onView && (
            <Button
              variant="outline"
              onClick={() => onView(campaign)}
              className={showApplyButton ? '' : 'flex-1'}
            >
              View Details
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}