/**
 * Example of how to implement security measures in the payment flow
 * This file demonstrates best practices for securing payments
 */

import { useState } from 'react';
import { AlertTriangle, Shield, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  isValidPaymentAmount, 
  paymentRateLimiter,
  isValidLightningAddress 
} from '@/lib/security/validation';
import { 
  logPaymentAttempt, 
  logPaymentFailure,
  logRateLimitExceeded,
  securityMonitor 
} from '@/lib/security/monitoring';
import { SECURITY_CONFIG } from '@/lib/security/config';

interface SecurityCheck {
  name: string;
  passed: boolean;
  message: string;
}

export function SecurePaymentExample() {
  const [securityChecks, setSecurityChecks] = useState<SecurityCheck[]>([]);
  const [isChecking, setIsChecking] = useState(false);
  
  // Example payment data
  const mockPayment = {
    userId: 'user123',
    amount: 50000, // 50k sats
    campaignId: 'campaign456',
    creatorAddress: 'alice@getalby.com',
  };
  
  const performSecurityChecks = async () => {
    setIsChecking(true);
    const checks: SecurityCheck[] = [];
    
    // Check 1: Rate limiting
    const rateLimitKey = `payment:${mockPayment.userId}`;
    const rateLimitPassed = paymentRateLimiter.isAllowed(rateLimitKey);
    
    checks.push({
      name: 'Rate Limiting',
      passed: rateLimitPassed,
      message: rateLimitPassed 
        ? 'Payment frequency within limits' 
        : 'Too many payment attempts',
    });
    
    if (!rateLimitPassed) {
      logRateLimitExceeded(mockPayment.userId, 'payment');
    }
    
    // Check 2: Amount validation
    const amountValid = isValidPaymentAmount(
      mockPayment.amount,
      SECURITY_CONFIG.payment.minAmount,
      SECURITY_CONFIG.payment.maxAmount
    );
    
    checks.push({
      name: 'Amount Validation',
      passed: amountValid,
      message: amountValid
        ? `Amount ${mockPayment.amount} sats is valid`
        : 'Payment amount outside allowed range',
    });
    
    // Check 3: Lightning address validation
    const addressValid = isValidLightningAddress(mockPayment.creatorAddress);
    
    checks.push({
      name: 'Lightning Address',
      passed: addressValid,
      message: addressValid
        ? 'Valid Lightning address format'
        : 'Invalid Lightning address',
    });
    
    // Check 4: Confirmation threshold
    const needsConfirmation = mockPayment.amount > SECURITY_CONFIG.payment.confirmationThreshold;
    
    checks.push({
      name: 'Confirmation Required',
      passed: true,
      message: needsConfirmation
        ? `Amount exceeds ${SECURITY_CONFIG.payment.confirmationThreshold} sats - extra confirmation needed`
        : 'Standard payment - no extra confirmation needed',
    });
    
    // Check 5: Recent suspicious activity
    const suspiciousUsers = securityMonitor.getSuspiciousUsers();
    const userSuspicious = suspiciousUsers.includes(mockPayment.userId);
    
    checks.push({
      name: 'User Trust Score',
      passed: !userSuspicious,
      message: userSuspicious
        ? 'User has suspicious activity - manual review required'
        : 'User has good standing',
    });
    
    // Check 6: Daily limit
    const recentPayments = securityMonitor.getRecentEvents(
      'payment_success',
      mockPayment.userId,
      86400000 // 24 hours
    );
    
    const dailyTotal = recentPayments.reduce((sum, event) => {
      return sum + (event.details.amount as number || 0);
    }, 0);
    
    const withinDailyLimit = dailyTotal + mockPayment.amount <= SECURITY_CONFIG.payment.maxDailyAmount;
    
    checks.push({
      name: 'Daily Limit',
      passed: withinDailyLimit,
      message: withinDailyLimit
        ? `Daily total: ${dailyTotal + mockPayment.amount} / ${SECURITY_CONFIG.payment.maxDailyAmount} sats`
        : 'Daily payment limit exceeded',
    });
    
    setSecurityChecks(checks);
    setIsChecking(false);
    
    // Log the payment attempt
    logPaymentAttempt(
      mockPayment.userId,
      mockPayment.amount,
      mockPayment.campaignId
    );
    
    // If any critical checks failed, log failure
    const criticalChecksFailed = checks.some(c => 
      !c.passed && ['Rate Limiting', 'Amount Validation', 'Lightning Address'].includes(c.name)
    );
    
    if (criticalChecksFailed) {
      logPaymentFailure(
        mockPayment.userId,
        mockPayment.amount,
        'Security checks failed'
      );
    }
  };
  
  const allChecksPassed = securityChecks.length > 0 && 
    securityChecks.every(check => check.passed || check.name === 'Confirmation Required');
  
  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Shield className="h-5 w-5" />
          <span>Secure Payment Example</span>
        </CardTitle>
        <CardDescription>
          This demonstrates security checks performed before processing payments
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Payment Details */}
        <div className="p-4 bg-muted rounded-lg space-y-2">
          <h3 className="font-semibold">Payment Details</h3>
          <div className="text-sm space-y-1">
            <div>Amount: {mockPayment.amount.toLocaleString()} sats</div>
            <div>Creator: {mockPayment.creatorAddress}</div>
            <div>Campaign: {mockPayment.campaignId}</div>
          </div>
        </div>
        
        {/* Security Checks */}
        <div className="space-y-4">
          <Button 
            onClick={performSecurityChecks} 
            disabled={isChecking}
            className="w-full"
          >
            {isChecking ? 'Running Security Checks...' : 'Run Security Checks'}
          </Button>
          
          {securityChecks.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-semibold">Security Check Results</h3>
              
              {securityChecks.map((check, index) => (
                <div 
                  key={index}
                  className="flex items-start space-x-3 p-3 rounded-lg bg-muted/50"
                >
                  {check.passed ? (
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <div className="font-medium">{check.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {check.message}
                    </div>
                  </div>
                  <Badge variant={check.passed ? 'default' : 'destructive'}>
                    {check.passed ? 'PASS' : 'FAIL'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
          
          {securityChecks.length > 0 && (
            <Alert className={allChecksPassed ? 'border-green-200' : 'border-red-200'}>
              <AlertDescription>
                {allChecksPassed ? (
                  <span className="text-green-700">
                    All security checks passed. Payment can proceed safely.
                  </span>
                ) : (
                  <span className="text-red-700">
                    Some security checks failed. Payment blocked for safety.
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}
        </div>
        
        {/* Implementation Notes */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
          <h4 className="font-semibold mb-2">Implementation Notes</h4>
          <ul className="text-sm space-y-1 list-disc list-inside">
            <li>Rate limiting prevents payment spam</li>
            <li>Amount validation ensures payments are within safe ranges</li>
            <li>Address validation prevents sending to invalid destinations</li>
            <li>Daily limits protect against account compromise</li>
            <li>Suspicious activity monitoring detects potential fraud</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}