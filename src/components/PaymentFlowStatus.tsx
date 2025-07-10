import { CheckCircle2, Circle, Clock, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface PaymentFlowStatusProps {
  currentStep: 'application' | 'approved' | 'report_submitted' | 'report_approved' | 'paid';
  campaignName?: string;
  amount?: number;
}

export function PaymentFlowStatus({ currentStep, campaignName, amount }: PaymentFlowStatusProps) {
  const steps = [
    {
      id: 'application',
      label: 'Application Submitted',
      icon: Circle,
      description: 'Creator applied to campaign',
    },
    {
      id: 'approved',
      label: 'Application Approved',
      icon: CheckCircle2,
      description: 'Business approved application',
    },
    {
      id: 'report_submitted',
      label: 'Report Submitted',
      icon: Clock,
      description: 'Creator submitted performance report',
    },
    {
      id: 'report_approved',
      label: 'Report Verified',
      icon: CheckCircle2,
      description: 'Business verified the report',
    },
    {
      id: 'paid',
      label: 'Payment Sent',
      icon: Zap,
      description: 'Creator received payment',
    },
  ];

  const currentStepIndex = steps.findIndex(step => step.id === currentStep);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Payment Flow Progress</CardTitle>
        {campaignName && (
          <CardDescription>
            Campaign: {campaignName}
            {amount && ` • ${amount} sats`}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isCompleted = index <= currentStepIndex;
            const isCurrent = index === currentStepIndex;
            
            return (
              <div
                key={step.id}
                className={cn(
                  "flex items-start space-x-3",
                  !isCompleted && "opacity-50"
                )}
              >
                <div className="mt-0.5">
                  <Icon
                    className={cn(
                      "h-5 w-5",
                      isCompleted && "text-green-600",
                      isCurrent && "animate-pulse"
                    )}
                  />
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <p className={cn(
                      "font-medium text-sm",
                      isCompleted && "text-foreground",
                      !isCompleted && "text-muted-foreground"
                    )}>
                      {step.label}
                    </p>
                    {isCurrent && (
                      <Badge variant="secondary" className="text-xs">
                        Current
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        {currentStep === 'report_approved' && (
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              ✨ Ready for payment! The business can now send Lightning payment to the creator.
            </p>
          </div>
        )}
        
        {currentStep === 'paid' && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              🎉 Payment complete! The creator has been paid for their work.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}