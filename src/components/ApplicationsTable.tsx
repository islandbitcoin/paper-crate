import { useState } from 'react';
import { MoreHorizontal, Check, X, Eye, Zap } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useAuthor } from '@/hooks/useAuthor';
import { genUserName } from '@/lib/genUserName';
import { getStatusColor, getPlatformIcon } from '@/lib/campaign-utils';
import type { CampaignApplication } from '@/stores/campaignStore';
import { useNostrPublish } from '@/hooks/useNostrPublish';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useToast } from '@/hooks/useToast';
import { useQueryClient } from '@tanstack/react-query';

interface ApplicationsTableProps {
  applications: CampaignApplication[];
}

export function ApplicationsTable({ applications }: ApplicationsTableProps) {
  const [_selectedApplication, setSelectedApplication] = useState<CampaignApplication | null>(null);
  const { mutateAsync: createEvent } = useNostrPublish();
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleApprove = async (application: CampaignApplication) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to approve applications.', variant: 'destructive' });
      return;
    }

    try {
      // Update the application status by publishing a new event
      await createEvent({
        kind: 34609,
        content: application.message,
        tags: [
          ['d', application.id],
          ['a', application.campaignCoordinate],
          ['p', application.businessPubkey],
          ['platforms', Object.entries(application.platforms).map(([p, h]) => `${p}:${h}`).join(',')],
          ['followers', Object.entries(application.followers).map(([p, c]) => `${p}:${c}`).join(',')],
          ['t', 'campaign-application'],
          ['status', 'approved']
        ]
      });

      toast({ title: 'Success', description: 'Application approved successfully.' });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['campaign-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['business-applications'] });
    } catch (error) {
      console.error('Error approving application:', error);
      toast({ title: 'Error', description: 'Failed to approve application.', variant: 'destructive' });
    }
  };

  const handleReject = async (application: CampaignApplication) => {
    if (!user) {
      toast({ title: 'Error', description: 'You must be logged in to reject applications.', variant: 'destructive' });
      return;
    }

    try {
      // Update the application status by publishing a new event
      await createEvent({
        kind: 34609,
        content: application.message,
        tags: [
          ['d', application.id],
          ['a', application.campaignCoordinate],
          ['p', application.businessPubkey],
          ['platforms', Object.entries(application.platforms).map(([p, h]) => `${p}:${h}`).join(',')],
          ['followers', Object.entries(application.followers).map(([p, c]) => `${p}:${c}`).join(',')],
          ['t', 'campaign-application'],
          ['status', 'rejected']
        ]
      });

      toast({ title: 'Success', description: 'Application rejected.' });
      
      // Invalidate queries to refresh data
      await queryClient.invalidateQueries({ queryKey: ['campaign-applications'] });
      await queryClient.invalidateQueries({ queryKey: ['business-applications'] });
    } catch (error) {
      console.error('Error rejecting application:', error);
      toast({ title: 'Error', description: 'Failed to reject application.', variant: 'destructive' });
    }
  };

  const handleView = (application: CampaignApplication) => {
    setSelectedApplication(application);
    // TODO: Open application details dialog
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Creator</TableHead>
            <TableHead>Campaign</TableHead>
            <TableHead>Platforms</TableHead>
            <TableHead>Followers</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Applied</TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {applications.map((application) => (
            <ApplicationRow
              key={application.id}
              application={application}
              onApprove={handleApprove}
              onReject={handleReject}
              onView={handleView}
            />
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

interface ApplicationRowProps {
  application: CampaignApplication;
  onApprove: (application: CampaignApplication) => void;
  onReject: (application: CampaignApplication) => void;
  onView: (application: CampaignApplication) => void;
}

function ApplicationRow({ application, onApprove, onReject, onView }: ApplicationRowProps) {
  const author = useAuthor(application.creatorPubkey);
  const metadata = author.data?.metadata;
  const displayName = metadata?.name ?? genUserName(application.creatorPubkey);

  const totalFollowers = Object.values(application.followers).reduce((sum, count) => sum + count, 0);
  const appliedDate = new Date(application.createdAt * 1000);

  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center space-x-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {displayName.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">{displayName}</div>
            <div className="text-sm text-muted-foreground">
              {application.creatorPubkey.slice(0, 8)}...
            </div>
            {(metadata?.lud16 || metadata?.lud06) && (
              <div className="flex items-center text-xs text-muted-foreground mt-1">
                <Zap className="h-3 w-3 mr-1" />
                {metadata.lud16 || 'Lightning enabled'}
              </div>
            )}
          </div>
        </div>
      </TableCell>

      <TableCell>
        <div className="font-medium">{application.campaignId}</div>
      </TableCell>

      <TableCell>
        <div className="flex items-center space-x-1">
          {Object.keys(application.platforms).map(platform => (
            <Badge key={platform} variant="secondary" className="text-xs">
              {getPlatformIcon(platform)} {platform}
            </Badge>
          ))}
        </div>
      </TableCell>

      <TableCell>
        <div className="font-medium">{totalFollowers.toLocaleString()}</div>
        <div className="text-sm text-muted-foreground">total</div>
      </TableCell>

      <TableCell>
        <Badge variant="outline" className={getStatusColor(application.status)}>
          {application.status}
        </Badge>
      </TableCell>

      <TableCell>
        <div className="text-sm">{appliedDate.toLocaleDateString()}</div>
      </TableCell>

      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onView(application)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            {application.status === 'pending' && (
              <>
                <DropdownMenuItem onClick={() => onApprove(application)}>
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onReject(application)}>
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </TableRow>
  );
}