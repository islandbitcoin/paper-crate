import React, { useState } from 'react';
import { Building2, Users, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { Tabs, TabsContent } from '@/components/ui/tabs';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { BusinessDashboard } from '@/components/BusinessDashboard';
import { CreatorDashboard } from '@/components/CreatorDashboard';
import { Header } from '@/components/Header';
import { OnboardingFlow } from '@/components/OnboardingFlow';
import { LoginArea } from '@/components/auth/LoginArea';
import { useLocalStorage } from '@/hooks/useLocalStorage';

export function Dashboard() {
  const { user, metadata } = useCurrentUser();
  const [selectedRole, setSelectedRole] = useState<'business' | 'creator'>('creator');
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Track onboarding completion status per user
  const [onboardingCompleted, setOnboardingCompleted] = useLocalStorage<Record<string, boolean>>('onboarding-completed', {});

  // Check if user needs onboarding (logged in user without complete profile and hasn't completed/skipped onboarding)
  const needsOnboarding = user && (!metadata?.name || !metadata?.about) && !onboardingCompleted[user.pubkey];

  // Show onboarding for logged in users who haven't completed profile or skipped onboarding
  React.useEffect(() => {
    if (needsOnboarding) {
      setShowOnboarding(true);
    } else if (user && showOnboarding) {
      // Hide onboarding if user has completed profile or previously skipped
      setShowOnboarding(false);
    }
  }, [needsOnboarding, user, showOnboarding]);

  // Handle onboarding completion or skip
  const handleOnboardingClose = (_completed: boolean) => {
    setShowOnboarding(false);
    if (user) {
      setOnboardingCompleted(prev => ({
        ...prev,
        [user.pubkey]: true
      }));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-100">
        <div className="container mx-auto py-16">
          {/* Hero Section */}
          <div className="text-center space-y-8 mb-16">
            <div className="space-y-4">
              <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Paper Crate
              </h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                Connect businesses with creators for authentic social media campaigns.
                Powered by Bitcoin micropayments and the Nostr protocol.
              </p>
            </div>

            <div className="flex items-center justify-center space-x-4">
              <Zap className="h-6 w-6 text-orange-500" />
              <span className="text-sm text-muted-foreground">
                Instant payments • Transparent metrics • Decentralized platform
              </span>
            </div>
          </div>

          {/* Role Selection */}
          <div className="max-w-4xl mx-auto space-y-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold mb-2">Choose Your Role</h2>
              <p className="text-muted-foreground">
                Are you a business looking to promote your products, or a creator ready to earn?
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Business Card */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedRole === 'business'
                    ? 'ring-2 ring-purple-500 bg-purple-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRole('business')}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-purple-100 rounded-full w-fit">
                    <Building2 className="h-8 w-8 text-purple-600" />
                  </div>
                  <CardTitle className="text-xl">For Businesses</CardTitle>
                  <CardDescription>
                    Launch campaigns and connect with authentic creators
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      <span>Create targeted campaigns</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      <span>Set custom payment rates</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      <span>Track performance metrics</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      <span>Pay only for results</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>

              {/* Creator Card */}
              <Card
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedRole === 'creator'
                    ? 'ring-2 ring-blue-500 bg-blue-50'
                    : 'hover:bg-gray-50'
                }`}
                onClick={() => setSelectedRole('creator')}
              >
                <CardHeader className="text-center">
                  <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
                    <Users className="h-8 w-8 text-blue-600" />
                  </div>
                  <CardTitle className="text-xl">For Creators</CardTitle>
                  <CardDescription>
                    Monetize your content across multiple platforms
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span>Browse active campaigns</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span>Earn Bitcoin micropayments</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span>Cross-platform support</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                      <span>Instant payment verification</span>
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Login Section */}
            <Card className="max-w-md mx-auto">
              <CardHeader className="text-center">
                <CardTitle>Get Started</CardTitle>
                <CardDescription>
                  Connect your Nostr account to access the {selectedRole} dashboard
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <LoginArea className="w-full max-w-60" />
              </CardContent>
            </Card>

            {/* Features */}
            <div className="text-center space-y-4 pt-8">
              <h3 className="text-lg font-semibold">Why Choose Our Platform?</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                <div className="space-y-2">
                  <div className="font-medium">⚡ Lightning Fast</div>
                  <div className="text-muted-foreground">
                    Instant Bitcoin payments via Lightning Network
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">🔒 Decentralized</div>
                  <div className="text-muted-foreground">
                    Built on Nostr protocol for censorship resistance
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="font-medium">📊 Transparent</div>
                  <div className="text-muted-foreground">
                    Real-time metrics and verifiable performance data
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center text-sm text-muted-foreground pt-8 border-t">
              <p>
                Vibed with{' '}
                <a
                  href="https://soapbox.pub/mkstack"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-600 hover:underline"
                >
                  MKStack
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header currentRole={selectedRole} onRoleChange={setSelectedRole} />

      <Tabs value={selectedRole} onValueChange={(value) => setSelectedRole(value as 'business' | 'creator')}>
        <TabsContent value="creator" className="mt-0">
          <CreatorDashboard />
        </TabsContent>

        <TabsContent value="business" className="mt-0">
          <BusinessDashboard />
        </TabsContent>
      </Tabs>

      {/* Onboarding Flow */}
      <OnboardingFlow
        open={showOnboarding}
        onOpenChange={handleOnboardingClose}
        userRole={selectedRole}
      />
    </div>
  );
}