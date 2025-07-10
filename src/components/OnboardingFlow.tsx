import { useState } from "react";
import { ChevronRight, ChevronLeft, Check, User, Link, Zap } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { EditProfileForm } from "@/components/EditProfileForm";
import { SocialPlatformManager } from "@/components/SocialPlatformManager";

interface OnboardingFlowProps {
  open: boolean;
  onOpenChange: (completed: boolean) => void;
  userRole: "business" | "creator";
}

const ONBOARDING_STEPS = {
  business: [
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Add your business information and branding",
      icon: User,
    },
    {
      id: "setup",
      title: "Platform Setup",
      description: "Configure your payment and relay settings",
      icon: Zap,
    },
  ],
  creator: [
    {
      id: "profile",
      title: "Complete Your Profile",
      description: "Add your personal information and bio",
      icon: User,
    },
    {
      id: "platforms",
      title: "Connect Social Platforms",
      description: "Link your social media accounts for campaigns",
      icon: Link,
    },
    {
      id: "setup",
      title: "Platform Setup",
      description: "Configure your payment and relay settings",
      icon: Zap,
    },
  ],
};

export function OnboardingFlow({ open, onOpenChange, userRole }: OnboardingFlowProps) {
  const { user } = useCurrentUser();
  const [currentStep, setCurrentStep] = useState(0);
  const [socialPlatforms, setSocialPlatforms] = useState<Array<{ platform: string; handle: string; followers: number; verified: boolean; url?: string }>>([]);

  const steps = ONBOARDING_STEPS[userRole];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      // Complete onboarding
      onOpenChange(true);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const { metadata } = useCurrentUser();

  const isProfileComplete = () => {
    return metadata?.name && metadata?.about;
  };

  const arePlatformsConnected = () => {
    return socialPlatforms.length > 0;
  };

  const canProceed = () => {
    const step = steps[currentStep];
    switch (step.id) {
      case "profile":
        return isProfileComplete();
      case "platforms":
        return arePlatformsConnected();
      case "setup":
        return true; // Always allow proceeding from setup
      default:
        return true;
    }
  };

  const renderStepContent = () => {
    const step = steps[currentStep];

    switch (step.id) {
      case "profile":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Complete Your Profile</h3>
              <p className="text-muted-foreground">
                {userRole === "business"
                  ? "Help creators understand your brand and what you're looking for."
                  : "Show businesses who you are and what makes you unique."}
              </p>
            </div>
            <EditProfileForm />
          </div>
        );

      case "platforms":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Connect Your Social Platforms</h3>
              <p className="text-muted-foreground">Link your social media accounts to apply for campaigns and showcase your reach.</p>
            </div>
            <SocialPlatformManager platforms={socialPlatforms} onPlatformsChange={setSocialPlatforms} />
          </div>
        );

      case "setup":
        return (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h3 className="text-lg font-semibold">Platform Setup</h3>
              <p className="text-muted-foreground">Configure your settings to get the most out of the platform.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Lightning Wallet</CardTitle>
                  <CardDescription className="text-sm">
                    {userRole === "business" ? "Set up payments to creators" : "Receive payments from campaigns"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">NWC Connection</span>
                      <Badge variant="outline">Optional</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Connect your Lightning wallet for automatic payments</p>
                    <Button variant="outline" size="sm" className="w-full">
                      Connect Wallet
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Relay Settings</CardTitle>
                  <CardDescription className="text-sm">Choose which Nostr relays to use</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Default Relay</span>
                      <Badge variant="secondary">Connected</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">Using relay.nostr.band for optimal performance</p>
                    <Button variant="outline" size="sm" className="w-full">
                      Manage Relays
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-muted/50 rounded-lg p-4">
              <h4 className="font-medium mb-2">{userRole === "business" ? "Ready to Create Campaigns!" : "Ready to Start Earning!"}</h4>
              <p className="text-sm text-muted-foreground">
                {userRole === "business"
                  ? "You can now create campaigns and connect with creators. Start by setting your budget and payment rates."
                  : "You can now browse campaigns and apply to start earning. Look for campaigns that match your audience and interests."}
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  // Only show onboarding for logged in users
  if (user || !open) return null;

  const handleSkip = () => {
    onOpenChange(false); // false indicates skipped, not completed
  };

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) {
      handleSkip();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <span>Welcome to Paper Crate</span>
            <Badge variant="outline" className="capitalize">
              {userRole}
            </Badge>
          </DialogTitle>
          <DialogDescription>
            Let's get your account set up so you can start {userRole === "business" ? "creating campaigns" : "earning from your content"}.
          </DialogDescription>
        </DialogHeader>

        {/* Progress */}
        <div className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>
              Step {currentStep + 1} of {steps.length}
            </span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-center space-x-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`
                  flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors
                  ${
                    isActive
                      ? "border-primary bg-primary text-primary-foreground"
                      : isCompleted
                      ? "border-green-500 bg-green-500 text-white"
                      : "border-muted-foreground/30 text-muted-foreground"
                  }
                `}
                >
                  {isCompleted ? <Check className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                </div>
                {index < steps.length - 1 && <div className={`w-12 h-0.5 mx-2 ${isCompleted ? "bg-green-500" : "bg-muted-foreground/30"}`} />}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-[400px]">{renderStepContent()}</div>

        {/* Navigation Buttons */}
        <div className="flex items-center justify-between pt-6 border-t">
          <Button variant="outline" onClick={prevStep} disabled={currentStep === 0}>
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          <div className="flex items-center space-x-2">
            <Button variant="ghost" onClick={handleSkip}>
              Skip for now
            </Button>
            <Button onClick={nextStep} disabled={!canProceed()}>
              {currentStep === steps.length - 1 ? "Complete Setup" : "Continue"}
              {currentStep < steps.length - 1 && <ChevronRight className="h-4 w-4 ml-2" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
