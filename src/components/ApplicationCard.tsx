import { Calendar, ExternalLink, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { getStatusColor, getPlatformIcon } from '@/lib/campaign-utils';
import type { CampaignApplication } from '@/stores/campaignStore';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCampaignStore } from '@/stores/campaignStore';

interface ApplicationCardProps {
  application: CampaignApplication;
}

export function ApplicationCard({ application }: ApplicationCardProps) {
  const author = useAuthor(application.businessPubkey);
  const metadata = author.data?.metadata;
  const businessName = metadata?.name ?? genUserName(application.businessPubkey);
  
  // Get creator's metadata including Lightning address
  const { metadata: creatorMetadata } = useCurrentUser();
  
  // Get campaign details
  const campaigns = useCampaignStore(state => state.campaigns);
  const campaign = campaigns.find(c => c.id === application.campaignId);
  const campaignTitle = campaign?.title || application.campaignId;
  
  const appliedDate = new Date(application.createdAt * 1000);
  const totalFollowers = Object.values(application.followers).reduce((sum, count) => sum + count, 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback>
                {businessName.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-lg">{campaignTitle}</CardTitle>
              <CardDescription>by {businessName}</CardDescription>
            </div>
          </div>
          <Badge 
            variant="outline" 
            className={getStatusColor(application.status)}
          >
            {application.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Application Message */}
        {application.message && (
          <div>
            <h4 className="text-sm font-medium mb-2">Application Message</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {application.message}
            </p>
          </div>
        )}
        
        {/* Platforms */}
        <div>
          <h4 className="text-sm font-medium mb-2">Platforms</h4>
          <div className="space-y-2">
            {Object.entries(application.platforms).map(([platform, handle]) => (
              <div key={platform} className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-2">
                  <span>{getPlatformIcon(platform)}</span>
                  <span className="capitalize font-medium">{platform}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-muted-foreground">{handle}</span>
                  <span className="font-mono">
                    {application.followers[platform]?.toLocaleString() || '0'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Summary */}
        <div className="flex items-center justify-between text-sm pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Applied {appliedDate.toLocaleDateString()}</span>
          </div>
          <div className="font-medium">
            {totalFollowers.toLocaleString()} total followers
          </div>
        </div>
        
        {/* Lightning Address */}
        {(creatorMetadata?.lud16 || creatorMetadata?.lud06) && (
          <div className="flex items-center text-sm pt-2 border-t">
            <Zap className="h-4 w-4 mr-2 text-yellow-500" />
            <span className="text-muted-foreground">Lightning: </span>
            <span className="font-mono ml-1">{creatorMetadata.lud16 || 'Available'}</span>
          </div>
        )}
        
        {/* Actions */}
        {application.status === 'approved' && (
          <div className="pt-2">
            <Button className="w-full" size="sm">
              <ExternalLink className="h-4 w-4 mr-2" />
              View Campaign Details
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}