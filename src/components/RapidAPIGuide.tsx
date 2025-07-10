import { ExternalLink } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface RapidAPIInfo {
  name: string;
  author: string;
  url: string;
  description: string;
  recommended?: boolean;
  subscribed?: boolean;
  note?: string;
}

const RAPIDAPI_APIS: RapidAPIInfo[] = [
  {
    name: 'Twitter API',
    author: 'Alexander Vikhorev',
    url: 'https://rapidapi.com/alexanderxbx/api/twitter-api45',
    description: 'Cheap Twitter/X API - Working ✓',
    recommended: true,
    subscribed: true,
  },
  {
    name: 'Instagram Premium API',
    author: 'NikitusLLP',
    url: 'https://rapidapi.com/nikitusllp/api/instagram-premium-api-2023',
    description: 'Instagram API - Working ✓',
    subscribed: true,
    note: 'Successfully returns follower counts',
  },
  {
    name: 'YT-API',
    author: 'ytjar',
    url: 'https://rapidapi.com/ytjar/api/yt-api',
    description: 'YouTube API with search and channel info',
    subscribed: true,
  },
  {
    name: 'YouTube V2',
    author: 'Glavier',
    url: 'https://rapidapi.com/glavier/api/youtube-v2',
    description: 'YouTube Data API v2',
    subscribed: true,
  },
  {
    name: 'YouTube Media Downloader',
    author: 'DataFanatic',
    url: 'https://rapidapi.com/DataFanatic/api/youtube-media-downloader',
    description: 'YouTube API with media capabilities',
    subscribed: true,
  },
  {
    name: 'TikTok API',
    author: 'apibox',
    url: 'https://rapidapi.com/apibox/api/tiktok-api15',
    description: 'TikTok API for user info',
    subscribed: true,
  },
  {
    name: 'TikTok API v2.3',
    author: 'TikAPI',
    url: 'https://rapidapi.com/tikapi/api/tiktok-api23',
    description: 'Alternative TikTok API',
    subscribed: false,
    note: 'Subscribe to this API if the apibox TikTok API is not working',
  },
  {
    name: 'Twttr API',
    author: 'davethebeast',
    url: 'https://rapidapi.com/davethebeast/api/twitter241',
    description: 'Multi-platform API (Twitter/TikTok)',
    subscribed: true,
  },
  {
    name: 'Threads API',
    author: 'prasadbro',
    url: 'https://rapidapi.com/prasadbro/api/threads-api4',
    description: 'Threads (Meta) API for user info',
    subscribed: false,
    note: 'Subscribe to enable Threads follower counts',
  },
];

export function RapidAPIGuide() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>RapidAPI Setup Guide</CardTitle>
        <CardDescription>
          Subscribe to these APIs to enable automatic follower count fetching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            <strong>Steps to enable API access:</strong>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Click on the API links below</li>
              <li>Click "Subscribe to Test" on the API page</li>
              <li>Select the free tier (usually "Basic" or "Free")</li>
              <li>Your RapidAPI key will automatically work with that API</li>
            </ol>
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {RAPIDAPI_APIS.map((api) => (
            <div
              key={api.url}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{api.name}</span>
                  {api.subscribed && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                      Subscribed
                    </span>
                  )}
                  {api.recommended && !api.subscribed && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">
                  by {api.author} • {api.description}
                </p>
                {api.note && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Note: {api.note}
                  </p>
                )}
              </div>
              <Button variant="outline" size="sm" asChild>
                <a href={api.url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Subscribe
                </a>
              </Button>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <p className="text-sm text-muted-foreground">
            <strong>Note:</strong> Each API must be subscribed to individually. The free tiers are usually sufficient for personal use.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}