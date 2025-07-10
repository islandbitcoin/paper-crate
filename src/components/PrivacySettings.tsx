import { useState, useEffect } from 'react';
import { Shield, Info, Download, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/useToast';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { usePrivacy, DEFAULT_PRIVACY_SETTINGS, type PrivacySettings } from '@/lib/security/privacy';
import { useDataRetention } from '@/lib/security/data-retention';
import { logDataAccess } from '@/lib/security/monitoring';

export function PrivacySettingsComponent() {
  const { user } = useCurrentUser();
  const { toast } = useToast();
  const { loadSettings, saveSettings, clearExpiredData } = usePrivacy();
  const { exportMyData, deleteMyData, cleanupExpired } = useDataRetention();
  
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS);
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loaded = loadSettings();
    setSettings(loaded);
    
    if (user) {
      logDataAccess(user.pubkey, 'privacy_settings', 'read');
    }
  }, [user, loadSettings]);

  const handleToggle = (field: keyof PrivacySettings) => {
    const newSettings = {
      ...settings,
      [field]: !settings[field],
    };
    
    setSettings(newSettings);
    saveSettings(newSettings);
    
    toast({
      title: 'Privacy Settings Updated',
      description: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} preference saved.`,
    });
  };

  const handleRetentionChange = (value: number[]) => {
    const newSettings = {
      ...settings,
      dataRetentionDays: value[0],
    };
    
    setSettings(newSettings);
    saveSettings(newSettings);
  };

  const handleExportData = async () => {
    if (!user) return;
    
    setIsExporting(true);
    try {
      const exportData = await exportMyData(user.pubkey);
      
      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `paper-crate-data-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: 'Data Exported',
        description: 'Your data has been downloaded successfully.',
      });
    } catch {
      toast({
        title: 'Export Failed',
        description: 'Failed to export your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleDeleteData = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete all your data? This action cannot be undone.'
    );
    
    if (!confirmed) return;
    
    setIsDeleting(true);
    try {
      const count = await deleteMyData(user.pubkey, true);
      
      toast({
        title: 'Data Deleted',
        description: `Permanently deleted ${count} data items.`,
      });
    } catch {
      toast({
        title: 'Deletion Failed',
        description: 'Failed to delete your data. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCleanup = async () => {
    const count = await cleanupExpired();
    clearExpiredData();
    
    toast({
      title: 'Cleanup Complete',
      description: `Removed ${count} expired data items.`,
    });
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Privacy Settings
          </CardTitle>
          <CardDescription>
            Control how your data is shared and stored
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Data Sharing */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium">Data Sharing</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email">Share Email Address</Label>
                  <p className="text-sm text-muted-foreground">
                    Allow others to see your email address
                  </p>
                </div>
                <Switch
                  id="email"
                  checked={settings.shareEmail}
                  onCheckedChange={() => handleToggle('shareEmail')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="lightning">Share Lightning Address</Label>
                  <p className="text-sm text-muted-foreground">
                    Required for receiving payments
                  </p>
                </div>
                <Switch
                  id="lightning"
                  checked={settings.shareLightningAddress}
                  onCheckedChange={() => handleToggle('shareLightningAddress')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="followers">Share Follower Count</Label>
                  <p className="text-sm text-muted-foreground">
                    Show your follower counts to businesses
                  </p>
                </div>
                <Switch
                  id="followers"
                  checked={settings.shareFollowerCount}
                  onCheckedChange={() => handleToggle('shareFollowerCount')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="platforms">Share Platform Handles</Label>
                  <p className="text-sm text-muted-foreground">
                    Display your social media usernames
                  </p>
                </div>
                <Switch
                  id="platforms"
                  checked={settings.sharePlatformHandles}
                  onCheckedChange={() => handleToggle('sharePlatformHandles')}
                />
              </div>
            </div>
          </div>

          {/* Security */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium">Security</h3>
            
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="encrypt">Encrypt Sensitive Data</Label>
                  <p className="text-sm text-muted-foreground">
                    Use end-to-end encryption for private data
                  </p>
                </div>
                <Switch
                  id="encrypt"
                  checked={settings.encryptSensitiveData}
                  onCheckedChange={() => handleToggle('encryptSensitiveData')}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="analytics">Allow Analytics</Label>
                  <p className="text-sm text-muted-foreground">
                    Help improve the platform with anonymous usage data
                  </p>
                </div>
                <Switch
                  id="analytics"
                  checked={settings.allowAnalytics}
                  onCheckedChange={() => handleToggle('allowAnalytics')}
                />
              </div>
            </div>
          </div>

          {/* Data Retention */}
          <div className="space-y-4 pt-4 border-t">
            <h3 className="text-sm font-medium">Data Retention</h3>
            
            <div className="space-y-3">
              <Label>Data Retention Period: {settings.dataRetentionDays} days</Label>
              <Slider
                value={[settings.dataRetentionDays]}
                onValueChange={handleRetentionChange}
                min={7}
                max={365}
                step={7}
                className="w-full"
              />
              <p className="text-sm text-muted-foreground">
                Data older than this will be automatically deleted
              </p>
            </div>
          </div>

          {/* Warning for payment-related settings */}
          {!settings.shareLightningAddress && (
            <Alert>
              <Info className="h-4 w-4" />
              <AlertDescription>
                Lightning address sharing is disabled. You won't be able to receive payments from campaigns.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card>
        <CardHeader>
          <CardTitle>Data Management</CardTitle>
          <CardDescription>
            Export or delete your personal data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={isExporting || !user}
              className="flex-1"
            >
              <Download className="h-4 w-4 mr-2" />
              {isExporting ? 'Exporting...' : 'Export My Data'}
            </Button>
            
            <Button
              variant="destructive"
              onClick={handleDeleteData}
              disabled={isDeleting || !user}
              className="flex-1"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              {isDeleting ? 'Deleting...' : 'Delete All Data'}
            </Button>
          </div>

          <Button
            variant="secondary"
            onClick={handleCleanup}
            className="w-full"
          >
            Clean Up Expired Data
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Data deletion is permanent and cannot be undone. Export your data first if you want to keep a copy.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}