import { useState } from 'react';
import { Search, TrendingUp, DollarSign, FileText, Plus, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';

import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useCreatorApplications } from '@/hooks/useCampaignApplications';
import { useCreatorReports } from '@/hooks/usePerformanceReports';
import { formatSats } from '@/lib/campaign-utils';
import { CampaignBrowser } from './CampaignBrowser';
import { ApplicationCard } from './ApplicationCard';
import { ReportCard } from './ReportCard';
import { CreateReportDialog } from './CreateReportDialog';
import { useLocalStorage } from '@/hooks/useLocalStorage';
import { SUPPORTED_PLATFORMS } from '@/lib/social-media-service';

interface SocialPlatform {
  platform: string;
  handle: string;
  followers: number;
  verified: boolean;
  url?: string;
}

export function CreatorDashboard() {
  const { user, metadata } = useCurrentUser();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateReport, setShowCreateReport] = useState(false);

  // Load social platforms from localStorage based on user's pubkey
  const storageKey = user ? `social-platforms-${user.pubkey}` : 'social-platforms-anonymous';
  const [socialPlatforms] = useLocalStorage<SocialPlatform[]>(storageKey, []);

  const { data: allCampaigns, isLoading: campaignsLoading } = useCampaigns();
  const { data: applications, isLoading: applicationsLoading } = useCreatorApplications(user?.pubkey);
  const { data: reports, isLoading: reportsLoading } = useCreatorReports(user?.pubkey);

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <p className="text-muted-foreground">
              Please log in to access your creator dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCampaigns = allCampaigns?.filter(c => c.status === 'active') || [];
  const approvedApplications = applications?.filter(a => a.status === 'approved') || [];
  const totalEarnings = reports?.reduce((sum, r) => sum + r.amountClaimed, 0) || 0;
  const pendingReports = reports?.filter(r => !r.verified) || [];

  // Filter campaigns based on search
  const filteredCampaigns = activeCampaigns.filter(campaign =>
    campaign.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    campaign.platforms.some(p => p.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Creator Dashboard</h1>
          <p className="text-muted-foreground">
            Discover campaigns and track your earnings
          </p>
          {/* Social Media Badges and Lightning Address */}
          <div className="flex items-center gap-2 mt-3 flex-wrap">
            {socialPlatforms.length > 0 && (
              <>
                <span className="text-sm text-muted-foreground">Connected:</span>
                {socialPlatforms.map((platform) => {
                  const platformInfo = SUPPORTED_PLATFORMS.find(p => p.id === platform.platform);
                  return (
                    <Badge key={platform.platform} variant="secondary" className="text-xs">
                      <span className="mr-1">{platformInfo?.icon || '🌐'}</span>
                      {platformInfo?.name || platform.platform}
                    </Badge>
                  );
                })}
              </>
            )}
            {(metadata?.lud16 || metadata?.lud06) && (
              <Badge variant="outline" className="text-xs">
                <Zap className="h-3 w-3 mr-1" />
                {metadata.lud16 || 'Lightning enabled'}
              </Badge>
            )}
          </div>
        </div>
        <Button onClick={() => setShowCreateReport(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Submit Report
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Available to join
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">My Applications</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {applicationsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{approvedApplications.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {applications?.length || 0} total applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatSats(totalEarnings)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              All time
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Reports</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{pendingReports.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              Awaiting verification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="discover" className="space-y-6">
        <TabsList>
          <TabsTrigger value="discover">Discover Campaigns</TabsTrigger>
          <TabsTrigger value="applications">My Applications</TabsTrigger>
          <TabsTrigger value="reports">Performance Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="discover" className="space-y-6">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search campaigns by title, description, or platform..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Campaign Browser */}
          {campaignsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : filteredCampaigns.length > 0 ? (
            <CampaignBrowser campaigns={filteredCampaigns} />
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <Search className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      {searchQuery ? 'No campaigns found' : 'No active campaigns'}
                    </h3>
                    <p className="text-muted-foreground">
                      {searchQuery
                        ? 'Try adjusting your search terms.'
                        : 'Check back later for new opportunities!'
                      }
                    </p>
                  </div>
                  {searchQuery && (
                    <Button variant="outline" onClick={() => setSearchQuery('')}>
                      Clear search
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>My Applications</CardTitle>
              <CardDescription>
                Track your campaign applications and their status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : applications && applications.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {applications.map((application) => (
                    <ApplicationCard key={application.id} application={application} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No applications yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Browse campaigns and apply to start earning!
                  </p>
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const tabsList = document.querySelector('[role="tablist"]');
                      const discoverTab = tabsList?.querySelector('[value="discover"]') as HTMLButtonElement;
                      discoverTab?.click();
                    }}
                  >
                    Browse Campaigns
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Performance Reports</CardTitle>
              <CardDescription>
                Track your submitted reports and earnings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={i}>
                      <CardHeader>
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : reports && reports.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {reports.map((report) => (
                    <ReportCard key={report.id} report={report} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No reports yet</h3>
                  <p className="text-muted-foreground mb-4">
                    Submit performance reports to track your earnings.
                  </p>
                  <Button onClick={() => setShowCreateReport(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Submit Report
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateReportDialog
        open={showCreateReport}
        onOpenChange={setShowCreateReport}
      />
    </div>
  );
}