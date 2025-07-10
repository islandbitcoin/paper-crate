import { useState } from 'react';
import { Key, Shield, AlertCircle, Check, ExternalLink, Copy } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/useToast';
import { Badge } from '@/components/ui/badge';
import { hasAPIConfiguration } from '@/lib/api/social-media-api';

export function APIConfiguration() {
  const { toast } = useToast();
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const hasConfig = hasAPIConfiguration();

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
      toast({
        title: 'Copied!',
        description: `${label} copied to clipboard`,
      });
    } catch {
      toast({
        title: 'Error',
        description: 'Failed to copy to clipboard',
        variant: 'destructive',
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Key className="h-5 w-5" />
            <div>
              <CardTitle>API Configuration</CardTitle>
              <CardDescription>
                Configure social media APIs for automatic follower count fetching
              </CardDescription>
            </div>
          </div>
          {hasConfig && (
            <Badge variant="secondary" className="text-green-600">
              <Check className="h-3 w-3 mr-1" />
              Configured
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Setup Instructions</AlertTitle>
          <AlertDescription className="space-y-2 mt-2">
            <p>To enable automatic follower count fetching:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm">
              <li>Copy <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.example</code> to <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code></li>
              <li>Add your API keys to the .env.local file</li>
              <li>Restart your development server</li>
              <li>Optional: Run the proxy server for direct API access</li>
            </ol>
          </AlertDescription>
        </Alert>

        <Tabs defaultValue="option1" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="option1">Direct APIs</TabsTrigger>
            <TabsTrigger value="option2">RapidAPI</TabsTrigger>
            <TabsTrigger value="option3">Proxy Server</TabsTrigger>
          </TabsList>

          <TabsContent value="option1" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Official API Access</h4>
              <p className="text-sm text-muted-foreground">
                Use official APIs directly (requires backend proxy to handle CORS)
              </p>

              <div className="space-y-4">
                {/* Twitter/X */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">Twitter/X API v2</h5>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://developer.twitter.com/en/portal/dashboard" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Get API Keys
                      </a>
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Required: Bearer Token</p>
                    <code className="block bg-muted p-2 rounded text-xs">
                      VITE_TWITTER_BEARER_TOKEN=your_bearer_token_here
                    </code>
                  </div>
                </div>

                {/* YouTube */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">YouTube Data API v3</h5>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://console.cloud.google.com/apis/library/youtube.googleapis.com" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Get API Key
                      </a>
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Required: API Key</p>
                    <code className="block bg-muted p-2 rounded text-xs">
                      VITE_YOUTUBE_API_KEY=your_api_key_here
                    </code>
                  </div>
                </div>

                {/* Instagram */}
                <div className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h5 className="font-medium">Instagram Basic Display API</h5>
                    <Button variant="outline" size="sm" asChild>
                      <a href="https://developers.facebook.com/docs/instagram-basic-display-api" target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-3 w-3 mr-2" />
                        Documentation
                      </a>
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>Requires OAuth authentication and app review</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="option2" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">RapidAPI Integration</h4>
              <p className="text-sm text-muted-foreground">
                Easier setup with a single API key for multiple platforms
              </p>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h5 className="font-medium">RapidAPI Key</h5>
                  <Button variant="outline" size="sm" asChild>
                    <a href="https://rapidapi.com/hub" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="h-3 w-3 mr-2" />
                      Get API Key
                    </a>
                  </Button>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Add to your .env.local file:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    VITE_RAPIDAPI_KEY=your_rapidapi_key_here
                  </code>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Subscribe to these APIs on RapidAPI:</p>
                  <ul className="text-sm space-y-2">
                    <li className="flex items-start space-x-2">
                      <span className="text-muted-foreground">•</span>
                      <div>
                        <span className="font-medium">Twitter API</span>
                        <span className="text-muted-foreground"> - Search for "Twitter API" and subscribe to:</span>
                        <ul className="text-xs text-muted-foreground ml-4 mt-1">
                          <li>- Twitter API v2.0 by alexanderxbx (Free tier available)</li>
                          <li>- Twitter154 by Pujjaa (Free tier available)</li>
                        </ul>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-muted-foreground">•</span>
                      <div>
                        <span className="font-medium">Instagram Profile API</span>
                        <span className="text-muted-foreground"> - by yuananf (Free tier)</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-muted-foreground">•</span>
                      <div>
                        <span className="font-medium">TikTok API</span>
                        <span className="text-muted-foreground"> - Multiple options with free tiers</span>
                      </div>
                    </li>
                    <li className="flex items-start space-x-2">
                      <span className="text-muted-foreground">•</span>
                      <div>
                        <span className="font-medium">YouTube Data API</span>
                        <span className="text-muted-foreground"> - Direct Google API recommended</span>
                      </div>
                    </li>
                  </ul>
                </div>
                
                <Alert className="mt-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Important:</strong> You must subscribe to each API individually on RapidAPI, even if they have free tiers. 
                    Click "Subscribe to Test" on each API's page.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="option3" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Backend Proxy Server</h4>
              <p className="text-sm text-muted-foreground">
                Run a local proxy server to handle CORS and secure API keys
              </p>

              <div className="border rounded-lg p-4 space-y-4">
                <div className="space-y-2">
                  <h5 className="font-medium">Quick Start</h5>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                        cd server && npm install
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('cd server && npm install', 'Install command')}
                      >
                        {copiedText === 'Install command' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center space-x-2">
                      <code className="bg-muted px-2 py-1 rounded text-sm flex-1">
                        npm run dev
                      </code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => copyToClipboard('npm run dev', 'Run command')}
                      >
                        {copiedText === 'Run command' ? (
                          <Check className="h-4 w-4" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">Configure in .env.local:</p>
                  <code className="block bg-muted p-2 rounded text-xs">
                    VITE_API_PROXY_URL=http://localhost:3001
                  </code>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    The proxy server keeps your API keys secure on the backend and handles CORS issues.
                  </AlertDescription>
                </Alert>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="pt-4 border-t">
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Additional Options</h4>
            <ul className="text-sm space-y-1 text-muted-foreground">
              <li className="flex items-center space-x-2">
                <span>• ScraperAPI:</span>
                <a href="https://scraperapi.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Web scraping service
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <span>• Bright Data:</span>
                <a href="https://brightdata.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Enterprise scraping
                </a>
              </li>
              <li className="flex items-center space-x-2">
                <span>• CORS Proxy:</span>
                <code className="text-xs bg-muted px-1 py-0.5 rounded">https://corsproxy.io</code>
                <span className="text-xs">(dev only)</span>
              </li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}