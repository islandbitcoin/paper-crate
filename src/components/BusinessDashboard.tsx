import { useState } from 'react';
import { Plus, TrendingUp, Users, DollarSign, BarChart3 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCampaignsByBusiness } from '@/hooks/useCampaigns';
import { useBusinessApplications } from '@/hooks/useCampaignApplications';
import { useBusinessReports } from '@/hooks/usePerformanceReports';
import { formatSats } from '@/lib/campaign-utils';
import { CreateCampaignDialog } from './CreateCampaignDialog';
import { CampaignCard } from './CampaignCard';
import { ApplicationsTable } from './ApplicationsTable';
import { PerformanceChart } from './PerformanceChart';
import { ReportCard } from './ReportCard';

export function BusinessDashboard() {
  const { user } = useCurrentUser();
  const [showCreateDialog, setShowCreateDialog] = useState(false);

  const { data: campaigns, isLoading: campaignsLoading } = useCampaignsByBusiness(user?.pubkey);
  const { data: applications, isLoading: applicationsLoading } = useBusinessApplications(user?.pubkey);
  const { data: reports, isLoading: reportsLoading } = useBusinessReports(user?.pubkey);

  if (!user) {
    return (
      <div className="container mx-auto py-8">
        <Card className="border-dashed">
          <CardContent className="py-12 px-8 text-center">
            <p className="text-muted-foreground">
              Please log in to access your business dashboard.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeCampaigns = campaigns?.filter(c => c.status === 'active') || [];
  const pendingApplications = applications?.filter(a => a.status === 'pending') || [];
  const totalSpent = reports?.reduce((sum, r) => sum + r.amountClaimed, 0) || 0;
  const totalBudget = campaigns?.reduce((sum, c) => sum + c.budget, 0) || 0;

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Business Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your influencer marketing campaigns
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Campaign
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Campaigns</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {campaignsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{activeCampaigns.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {campaigns?.length || 0} total campaigns
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Applications</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {applicationsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{pendingApplications.length}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {applications?.length || 0} total applications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Spent</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <div className="text-2xl font-bold">{formatSats(totalSpent)}</div>
            )}
            <p className="text-xs text-muted-foreground">
              {formatSats(totalBudget)} total budget
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance Reports</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {reportsLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold">{reports?.length || 0}</div>
            )}
            <p className="text-xs text-muted-foreground">
              This month
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="campaigns" className="space-y-6">
        <TabsList>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="reports">Reports & Payments</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="campaigns" className="space-y-6">
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
          ) : campaigns && campaigns.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {campaigns.map((campaign) => (
                <CampaignCard key={campaign.id} campaign={campaign} />
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-12 px-8 text-center">
                <div className="max-w-sm mx-auto space-y-4">
                  <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground" />
                  <div>
                    <h3 className="text-lg font-semibold">No campaigns yet</h3>
                    <p className="text-muted-foreground">
                      Create your first campaign to start working with creators.
                    </p>
                  </div>
                  <Button onClick={() => setShowCreateDialog(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Campaign
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="applications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Campaign Applications</CardTitle>
              <CardDescription>
                Review and manage creator applications to your campaigns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {applicationsLoading ? (
                <div className="space-y-4">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="flex items-center space-x-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="space-y-2 flex-1">
                        <Skeleton className="h-4 w-1/4" />
                        <Skeleton className="h-3 w-1/2" />
                      </div>
                      <Skeleton className="h-6 w-16" />
                    </div>
                  ))}
                </div>
              ) : applications && applications.length > 0 ? (
                <ApplicationsTable applications={applications} />
              ) : (
                <div className="text-center py-8">
                  <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No applications yet. Share your campaigns to attract creators!
                  </p>
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
                Review creator reports and process payments
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
                <div className="space-y-4">
                  {/* Group reports by verification status */}
                  <div className="space-y-6">
                    {/* Verified reports ready for payment */}
                    {reports.filter(r => r.verified && !r.paymentHash).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Ready for Payment</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {reports
                            .filter(r => r.verified && !r.paymentHash)
                            .map((report) => (
                              <ReportCard key={report.id} report={report} showPayButton={true} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Paid reports */}
                    {reports.filter(r => r.paymentHash).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Paid</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {reports
                            .filter(r => r.paymentHash)
                            .map((report) => (
                              <ReportCard key={report.id} report={report} />
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Pending verification */}
                    {reports.filter(r => !r.verified).length > 0 && (
                      <div>
                        <h3 className="text-lg font-semibold mb-4">Pending Verification</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          {reports
                            .filter(r => !r.verified)
                            .map((report) => (
                              <ReportCard key={report.id} report={report} showApproveButton={true} />
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    No performance reports yet. Wait for creators to submit their work!
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Campaign Performance</CardTitle>
                <CardDescription>
                  Track engagement and spending across campaigns
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : reports && reports.length > 0 ? (
                  <PerformanceChart reports={reports} />
                ) : (
                  <div className="h-64 flex items-center justify-center text-muted-foreground">
                    No performance data available
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Platform Breakdown</CardTitle>
                <CardDescription>
                  Performance by social media platform
                </CardDescription>
              </CardHeader>
              <CardContent>
                {reportsLoading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 4 }).map((_, i) => (
                      <div key={i} className="flex items-center justify-between">
                        <Skeleton className="h-4 w-20" />
                        <Skeleton className="h-4 w-16" />
                      </div>
                    ))}
                  </div>
                ) : reports && reports.length > 0 ? (
                  <div className="space-y-4">
                    {Object.entries(
                      reports.reduce((acc, report) => {
                        if (!acc[report.platform]) {
                          acc[report.platform] = { count: 0, spent: 0 };
                        }
                        acc[report.platform].count++;
                        acc[report.platform].spent += report.amountClaimed;
                        return acc;
                      }, {} as Record<string, { count: number; spent: number }>)
                    ).map(([platform, data]) => (
                      <div key={platform} className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="capitalize font-medium">{platform}</span>
                          <Badge variant="secondary">{data.count} posts</Badge>
                        </div>
                        <span className="font-mono text-sm">{formatSats(data.spent)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    No platform data available
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <CreateCampaignDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
      />
    </div>
  );
}