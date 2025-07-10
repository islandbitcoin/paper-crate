import { useState, useEffect, useCallback } from 'react';
import { Shield, AlertTriangle, CheckCircle, Info, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useEnvironmentSecurity } from '@/lib/security/environment';
import { useRelaySecurity } from '@/lib/security/relay-security';
import { securityMonitor, type SecurityEvent } from '@/lib/security/monitoring';
import type { EnvironmentReport, SecurityCheck } from '@/lib/security/environment';

export function SecurityDashboard() {
  const [auditReport, setAuditReport] = useState<EnvironmentReport | null>(null);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const { runAudit, checkEnvironment } = useEnvironmentSecurity();
  const { getMetrics } = useRelaySecurity();

  const runSecurityAudit = useCallback(async () => {
    setIsLoading(true);
    try {
      const report = runAudit();
      setAuditReport(report);
    } finally {
      setIsLoading(false);
    }
  }, [runAudit]);

  useEffect(() => {
    // Load initial data
    runSecurityAudit();
    loadSecurityEvents();
  }, [runSecurityAudit]);

  const loadSecurityEvents = () => {
    const events = securityMonitor.getRecentEvents();
    setSecurityEvents(events.slice(-50)); // Last 50 events
  };

  const getStatusIcon = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warn':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'fail':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getStatusColor = (status: SecurityCheck['status']) => {
    switch (status) {
      case 'pass':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'fail':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  const getOverallStatusColor = (overall: EnvironmentReport['overall']) => {
    switch (overall) {
      case 'secure':
        return 'text-green-600 bg-green-50 border-green-200';
      case 'warnings':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'insecure':
        return 'text-red-600 bg-red-50 border-red-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const envInfo = checkEnvironment();
  const relayMetrics = getMetrics() as RelayMetric[];

  interface RelayMetric {
    url: string;
    connected: boolean;
    connectionCount: number;
    eventsSent: number;
    eventsReceived: number;
    errors: number;
    trustScore: number;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Shield className="h-6 w-6" />
          <h1 className="text-2xl font-bold">Security Dashboard</h1>
        </div>
        <Button onClick={runSecurityAudit} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          {isLoading ? 'Running Audit...' : 'Run Audit'}
        </Button>
      </div>

      {/* Overall Status */}
      {auditReport && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Security Status
              <Badge className={getOverallStatusColor(auditReport.overall)}>
                {auditReport.overall.toUpperCase()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Overall security assessment based on {auditReport.checks.length} checks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {auditReport.checks.filter(c => c.status === 'pass').length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {auditReport.checks.filter(c => c.status === 'warn').length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {auditReport.checks.filter(c => c.status === 'fail').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>

            {auditReport.recommendations.length > 0 && (
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  <strong>Recommendations:</strong>
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    {auditReport.recommendations.map((rec, index) => (
                      <li key={index} className="text-sm">{rec}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="checks" className="space-y-4">
        <TabsList>
          <TabsTrigger value="checks">Security Checks</TabsTrigger>
          <TabsTrigger value="environment">Environment</TabsTrigger>
          <TabsTrigger value="relays">Relay Security</TabsTrigger>
          <TabsTrigger value="events">Security Events</TabsTrigger>
        </TabsList>

        <TabsContent value="checks" className="space-y-4">
          {auditReport?.checks.map((check, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base flex items-center space-x-2">
                    {getStatusIcon(check.status)}
                    <span>{check.name}</span>
                  </CardTitle>
                  <Badge className={getStatusColor(check.status)}>
                    {check.status.toUpperCase()}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-muted-foreground mb-2">{check.message}</p>
                {check.details && (
                  <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                    {JSON.stringify(check.details, null, 2)}
                  </pre>
                )}
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="environment" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Environment Info</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Mode:</span>
                  <Badge variant={envInfo.isDevelopment ? 'secondary' : 'default'}>
                    {envInfo.isDevelopment ? 'Development' : 'Production'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Protocol:</span>
                  <Badge variant={envInfo.protocol === 'https:' ? 'default' : 'destructive'}>
                    {envInfo.protocol}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">Secure Context:</span>
                  <Badge variant={envInfo.isSecureContext ? 'default' : 'destructive'}>
                    {envInfo.isSecureContext ? 'Yes' : 'No'}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Browser Features</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">WebCrypto:</span>
                  <Badge variant={window.crypto ? 'default' : 'destructive'}>
                    {window.crypto ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">WebSocket:</span>
                  <Badge variant={window.WebSocket ? 'default' : 'destructive'}>
                    {window.WebSocket ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-muted-foreground">LocalStorage:</span>
                  <Badge variant={window.localStorage ? 'default' : 'destructive'}>
                    {window.localStorage ? 'Available' : 'Not Available'}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="relays" className="space-y-4">
          {relayMetrics.length > 0 ? (
            <div className="grid grid-cols-1 gap-4">
              {relayMetrics.map((relay, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-base">{(relay as RelayMetric).url}</CardTitle>
                      <div className="flex items-center space-x-2">
                        <Badge variant={(relay as RelayMetric).connected ? 'default' : 'secondary'}>
                          {(relay as RelayMetric).connected ? 'Connected' : 'Disconnected'}
                        </Badge>
                        <Badge className={
                          (relay as RelayMetric).trustScore >= 8 ? 'text-green-600 bg-green-50 border-green-200' :
                          (relay as RelayMetric).trustScore >= 5 ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                          'text-red-600 bg-red-50 border-red-200'
                        }>
                          Trust: {(relay as RelayMetric).trustScore}/10
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <div className="text-muted-foreground">Connections</div>
                        <div className="font-medium">{(relay as RelayMetric).connectionCount}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Events Sent</div>
                        <div className="font-medium">{(relay as RelayMetric).eventsSent}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Events Received</div>
                        <div className="font-medium">{(relay as RelayMetric).eventsReceived}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Errors</div>
                        <div className="font-medium">{(relay as RelayMetric).errors}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">No relay metrics available</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="events" className="space-y-4">
          <div className="space-y-2">
            {securityEvents.slice(-10).reverse().map((event, index) => (
              <Card key={index}>
                <CardContent className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Badge className={
                        event.severity === 'critical' ? 'text-red-600 bg-red-50 border-red-200' :
                        event.severity === 'high' ? 'text-orange-600 bg-orange-50 border-orange-200' :
                        event.severity === 'medium' ? 'text-yellow-600 bg-yellow-50 border-yellow-200' :
                        'text-blue-600 bg-blue-50 border-blue-200'
                      }>
                        {event.severity}
                      </Badge>
                      <span className="font-medium">{event.type}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      {new Date(event.timestamp).toLocaleString()}
                    </span>
                  </div>
                  {Object.keys(event.details).length > 0 && (
                    <details className="mt-2">
                      <summary className="text-sm cursor-pointer">Details</summary>
                      <pre className="text-xs bg-muted p-2 rounded mt-1 overflow-x-auto">
                        {JSON.stringify(event.details, null, 2)}
                      </pre>
                    </details>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}