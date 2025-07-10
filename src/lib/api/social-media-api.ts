// Social Media API Service
// Handles real API calls to fetch follower counts

import { SocialMediaProfile } from '../social-media-service';

// API Configuration
export interface APIConfig {
  // Direct API Keys
  twitter?: {
    apiKey?: string;
    apiSecret?: string;
    bearerToken?: string;
  };
  youtube?: {
    apiKey?: string;
  };
  instagram?: {
    clientId?: string;
    clientSecret?: string;
    accessToken?: string;
  };
  tiktok?: {
    clientKey?: string;
    clientSecret?: string;
  };
  
  // Third-party services
  rapidApi?: {
    key?: string;
    host?: string;
  };
  scraperApi?: {
    key?: string;
  };
  
  // Proxy configuration
  proxyUrl?: string;
  corsProxy?: string;
}

// Load configuration from environment variables
const config: APIConfig = {
  twitter: {
    apiKey: import.meta.env.VITE_TWITTER_API_KEY,
    apiSecret: import.meta.env.VITE_TWITTER_API_SECRET,
    bearerToken: import.meta.env.VITE_TWITTER_BEARER_TOKEN,
  },
  youtube: {
    apiKey: import.meta.env.VITE_YOUTUBE_API_KEY,
  },
  instagram: {
    clientId: import.meta.env.VITE_INSTAGRAM_CLIENT_ID,
    clientSecret: import.meta.env.VITE_INSTAGRAM_CLIENT_SECRET,
  },
  tiktok: {
    clientKey: import.meta.env.VITE_TIKTOK_CLIENT_KEY,
    clientSecret: import.meta.env.VITE_TIKTOK_CLIENT_SECRET,
  },
  rapidApi: {
    key: import.meta.env.VITE_RAPIDAPI_KEY,
    host: import.meta.env.VITE_RAPIDAPI_HOST,
  },
  scraperApi: {
    key: import.meta.env.VITE_SCRAPER_API_KEY,
  },
  proxyUrl: import.meta.env.VITE_API_PROXY_URL,
  corsProxy: import.meta.env.VITE_CORS_PROXY_URL,
};

// Helper function to make API calls through proxy if configured
async function fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
  if (config.proxyUrl) {
    // Use backend proxy
    return fetch(`${config.proxyUrl}/api/social-media/fetch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url, options }),
    });
  } else if (config.corsProxy) {
    // Use CORS proxy for development
    return fetch(`${config.corsProxy}${encodeURIComponent(url)}`, options);
  }
  
  // Direct fetch (will fail with CORS in browser)
  return fetch(url, options);
}

// Helper function to find follower count in nested objects
function findFollowerCount(obj: unknown, depth = 0): number {
  if (!obj || typeof obj !== 'object' || depth > 5) return 0;
  
  // Check common follower field names
  const followerFields = [
    'followers_count', 'follower_count', 'followers', 
    'followersCount', 'followerCount', 'normal_followers_count',
    'sub_count', 'subscriber_count', 'subscribers',
    'edge_followed_by', 'followed_by_count',
    'subscriberCount', 'subscriber_count', 'subscriberCountText',
    'statistics', 'subs', 'sub_count',
    'viewCountText', 'subscriberCountText', 'videoCountText'
  ];
  
  const objRecord = obj as Record<string, unknown>;
  
  for (const field of followerFields) {
    const value = objRecord[field];
    if (value !== undefined) {
      // Handle both number and string representations
      if (typeof value === 'number') {
        console.log(`Found follower count at field '${field}':`, value);
        return value;
      } else if (typeof value === 'string') {
        const parsed = parseInt(value);
        if (!isNaN(parsed)) {
          console.log(`Found follower count as string at field '${field}':`, value, '-> parsed:', parsed);
          return parsed;
        }
      } else if (typeof value === 'object' && value !== null) {
        // Handle cases like edge_followed_by: { count: 1234 }
        const nestedValue = (value as Record<string, unknown>).count;
        if (typeof nestedValue === 'number') {
          console.log(`Found follower count in nested object '${field}.count':`, nestedValue);
          return nestedValue;
        } else if (typeof nestedValue === 'string') {
          const parsed = parseInt(nestedValue);
          if (!isNaN(parsed)) {
            console.log(`Found follower count as string in '${field}.count':`, nestedValue, '-> parsed:', parsed);
            return parsed;
          }
        }
      }
    }
  }
  
  // Special handling for statistics object
  if (objRecord.statistics && typeof objRecord.statistics === 'object') {
    const stats = objRecord.statistics as Record<string, unknown>;
    const subCount = stats.subscriberCount || stats.subscriber_count || stats.subscribers;
    if (subCount) {
      if (typeof subCount === 'number') {
        console.log('Found subscriber count in statistics object:', subCount);
        return subCount;
      } else if (typeof subCount === 'string') {
        const parsed = parseInt(subCount.replace(/[^0-9]/g, ''));
        if (!isNaN(parsed) && parsed > 0) {
          console.log('Found subscriber count as string in statistics object:', subCount, '-> parsed:', parsed);
          return parsed;
        }
      }
    }
  }
  
  // Recursively search in nested objects
  for (const key in objRecord) {
    if (objRecord[key] && typeof objRecord[key] === 'object') {
      const found = findFollowerCount(objRecord[key], depth + 1);
      if (found > 0) {
        console.log(`Found follower count in nested object at key '${key}'`);
        return found;
      }
    }
  }
  
  return 0;
}

// Twitter/X API Implementation
export async function fetchTwitterFollowers(handle: string): Promise<SocialMediaProfile | null> {
  const cleanHandle = handle.replace('@', '');
  
  try {
    // Option 1: Official Twitter API v2
    if (config.twitter?.bearerToken) {
      const response = await fetchWithProxy(
        `https://api.twitter.com/2/users/by/username/${cleanHandle}?user.fields=public_metrics,verified`,
        {
          headers: {
            'Authorization': `Bearer ${config.twitter.bearerToken}`,
          },
        }
      );
      
      if (response.ok) {
        const data = await response.json();
        return {
          platform: 'twitter',
          handle: cleanHandle,
          followers: data.data?.public_metrics?.followers_count || 0,
          verified: data.data?.verified || false,
          url: `https://x.com/${cleanHandle}`,
        };
      }
    }
    
    // Option 2: RapidAPI Twitter - Try multiple endpoints
    if (config.rapidApi?.key) {
      console.log('Attempting RapidAPI Twitter call...');
      
      // Try Twitter API v2.0
      try {
        const response = await fetch(
          `https://twitter-api45.p.rapidapi.com/screenname.php?screenname=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'twitter-api45.p.rapidapi.com',
            },
          }
        );
        
        console.log('Twitter API v45 Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Twitter API v45 Full Response:', JSON.stringify(data, null, 2));
          
          // Use the helper function to find follower count
          let followerCount = findFollowerCount(data);
          
          // If not found, try to parse from text fields that might contain formatted numbers
          if (followerCount === 0) {
            // Check for formatted follower counts like "4,138" or "4.1K"
            const possibleFields = ['followers_count_text', 'followersCountText', 'followers_text'];
            for (const field of possibleFields) {
              if (data[field]) {
                const parsed = parseInt(data[field].replace(/[^0-9]/g, ''));
                if (!isNaN(parsed) && parsed > 0) {
                  followerCount = parsed;
                  console.log(`Found follower count in text field '${field}':`, data[field], '-> parsed:', parsed);
                  break;
                }
              }
            }
          }
          
          // Check verification status
          const verified = data.verified || data.blue_verified || data.is_blue_verified || 
                          data.data?.verified || data.data?.blue_verified || false;
          
          // Log what we found
          console.log('Extracted follower count:', followerCount, 'Verified:', verified);
          
          // Always return if we have user data, even with 0 followers (API might have issues)
          if (data.profile || data.rest_id || data.id || data.screen_name) {
            return {
              platform: 'twitter',
              handle: cleanHandle,
              followers: followerCount,
              verified: verified,
              url: `https://x.com/${cleanHandle}`,
            };
          }
        }
      } catch {
        console.log('Twitter API v45 failed, trying another...');
      }
      
      // Try Twttr API (davethebeast) as fallback since user is subscribed
      try {
        const response = await fetch(
          `https://twitter241.p.rapidapi.com/user?username=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'twitter241.p.rapidapi.com',
            },
          }
        );
        
        console.log('Twttr API Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Twttr API Data:', JSON.stringify(data, null, 2));
          
          const followerCount = findFollowerCount(data);
          if (followerCount > 0) {
            return {
              platform: 'twitter',
              handle: cleanHandle,
              followers: followerCount,
              verified: data.verified || data.is_verified || data.blue_verified || false,
              url: `https://x.com/${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('Twttr API failed:', error);
      }
      
      // Try Twitter/X API by apibox as another fallback  
      try {
        const response = await fetch(
          `https://twitter-x.p.rapidapi.com/users/by-username?username=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'twitter-x.p.rapidapi.com',
            },
          }
        );
        
        console.log('Twitter/X API Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Twitter/X API Data:', JSON.stringify(data, null, 2));
          
          const followerCount = findFollowerCount(data);
          if (followerCount > 0) {
            return {
              platform: 'twitter',
              handle: cleanHandle,
              followers: followerCount,
              verified: data.verified || data.is_verified || false,
              url: `https://x.com/${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('Twitter/X API failed:', error);
      }
      
      // If all APIs fail, provide helpful error
      throw new Error('Could not fetch Twitter data. Please subscribe to a Twitter API on RapidAPI (many have free tiers).');
    }
    
    return null;
  } catch (error) {
    console.error('Twitter API error:', error);
    return null;
  }
}

// YouTube API Implementation
export async function fetchYouTubeSubscribers(handle: string): Promise<SocialMediaProfile | null> {
  try {
    // Try RapidAPI YouTube APIs
    if (config.rapidApi?.key) {
      // Try YT-API first (ytjar) - search endpoint
      try {
        const searchTerm = handle.startsWith('@') ? handle.substring(1) : handle;
        const response = await fetch(
          `https://yt-api.p.rapidapi.com/search?query=${encodeURIComponent(searchTerm)}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'yt-api.p.rapidapi.com',
            },
          }
        );
        
        console.log('YT-API Search Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('YT-API Search Data:', JSON.stringify(data, null, 2));
          
          // Find the channel in search results
          const items = data.data || data.items || [];
          const channel = items.find((item: { type: string; channelTitle: string }) => item.type === 'channel' || item.channelTitle === searchTerm);
          
          if (channel && channel.channelId) {
            // Get channel details
            const channelResponse = await fetch(
              `https://yt-api.p.rapidapi.com/channel/about?id=${channel.channelId}`,
              {
                headers: {
                  'X-RapidAPI-Key': config.rapidApi.key,
                  'X-RapidAPI-Host': 'yt-api.p.rapidapi.com',
                },
              }
            );
            
            console.log('YT-API Channel Response:', channelResponse.status);
            
            if (channelResponse.ok) {
              const channelData = await channelResponse.json();
              console.log('YT-API Channel Data:', JSON.stringify(channelData, null, 2));
              
              const subscriberCount = channelData.subscriberCount || channelData.subscribers || 
                                     channelData.meta?.subscriberCount || findFollowerCount(channelData);
              
              if (subscriberCount > 0) {
                return {
                  platform: 'youtube',
                  handle: handle,
                  followers: typeof subscriberCount === 'string' ? parseInt(subscriberCount.replace(/[^0-9]/g, '')) : subscriberCount,
                  verified: channelData.isVerified || channelData.verified || false,
                  url: channelData.channelUrl || `https://youtube.com/channel/${channel.channelId}`,
                };
              }
            }
          }
        }
      } catch (error) {
        console.log('YT-API failed:', error);
      }
      
      // Try YouTube V2 API (Omar M'Haimdat) - using channel endpoint
      try {
        const searchTerm = handle.startsWith('@') ? handle : `@${handle}`;
        // First try to get channel info directly
        const response = await fetch(
          `https://youtube-v2.p.rapidapi.com/channel/search?query=${encodeURIComponent(searchTerm)}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'youtube-v2.p.rapidapi.com',
            },
          }
        );
        
        console.log('YouTube V2 Channel Search Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('YouTube V2 Channel Search Data:', JSON.stringify(data, null, 2));
          
          // Look for subscriber count in the response
          const subscriberCount = findFollowerCount(data);
          
          if (subscriberCount > 0) {
            return {
              platform: 'youtube',
              handle: handle,
              followers: subscriberCount,
              verified: data.is_verified || data.verified || false,
              url: data.channel_url || data.url || `https://youtube.com/${searchTerm}`,
            };
          }
          
          // If not found in main response, check items
          const items = data.channels || data.results || data.items || [];
          for (const item of items) {
            const itemSubscriberCount = findFollowerCount(item);
            if (itemSubscriberCount > 0) {
              return {
                platform: 'youtube',
                handle: handle,
                followers: itemSubscriberCount,
                verified: item.is_verified || item.verified || false,
                url: item.channel_url || item.url || `https://youtube.com/channel/${item.channel_id || item.id}`,
              };
            }
          }
        }
      } catch (error) {
        console.log('YouTube V2 API failed:', error);
      }
      
      // Try YouTube Media Downloader API (DataFanatic) - using search endpoint
      try {
        const searchTerm = handle.startsWith('@') ? handle : `@${handle}`;
        const response = await fetch(
          `https://youtube-media-downloader.p.rapidapi.com/v2/search/channels?q=${encodeURIComponent(searchTerm)}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'youtube-media-downloader.p.rapidapi.com',
            },
          }
        );
        
        console.log('YouTube Media Downloader API Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('YouTube Media Downloader Data:', JSON.stringify(data, null, 2));
          
          const items = data.items || [];
          for (const channel of items) {
            if (channel.snippet) {
              // Try to get subscriber count from statistics or snippet
              const subscriberCount = channel.statistics?.subscriberCount || 
                                     channel.snippet?.subscriberCount ||
                                     findFollowerCount(channel);
              
              if (subscriberCount > 0) {
                return {
                  platform: 'youtube',
                  handle: handle,
                  followers: typeof subscriberCount === 'string' ? parseInt(subscriberCount.replace(/[^0-9]/g, '')) : subscriberCount,
                  verified: false,
                  url: `https://youtube.com/channel/${channel.id || channel.channelId}`,
                };
              }
            }
          }
        }
      } catch (error) {
        console.log('YouTube Media Downloader API failed:', error);
      }
    }
    
    // Fallback to direct YouTube API
    if (config.youtube?.apiKey) {
      let channelId = handle;
      
      // If handle starts with @, search for channel
      if (handle.startsWith('@')) {
        const searchResponse = await fetchWithProxy(
          `https://www.googleapis.com/youtube/v3/search?part=snippet&type=channel&q=${handle}&key=${config.youtube.apiKey}`
        );
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          channelId = searchData.items?.[0]?.id?.channelId;
          if (!channelId) return null;
        }
      }
      
      // Get channel statistics
      const response = await fetchWithProxy(
        `https://www.googleapis.com/youtube/v3/channels?part=statistics,snippet&id=${channelId}&key=${config.youtube.apiKey}`
      );
      
      if (response.ok) {
        const data = await response.json();
        const channel = data.items?.[0];
        
        if (channel) {
          return {
            platform: 'youtube',
            handle: handle,
            followers: parseInt(channel.statistics?.subscriberCount || '0'),
            verified: false, // YouTube doesn't provide verification status via API
            url: `https://youtube.com/channel/${channelId}`,
          };
        }
      }
    }
    
    return null;
  } catch (error) {
    console.error('YouTube API error:', error);
    return null;
  }
}

// Instagram API Implementation
export async function fetchInstagramFollowers(handle: string): Promise<SocialMediaProfile | null> {
  const cleanHandle = handle.replace('@', '');
  
  try {
    // Option 1: RapidAPI Instagram (multiple endpoints)
    if (config.rapidApi?.key) {
      // Try Instagram Looter API first (IRROR Systems)
      try {
        const response = await fetch(
          `https://instagram-looter2.p.rapidapi.com/profile/${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'instagram-looter2.p.rapidapi.com',
            },
          }
        );
        
        console.log('Instagram Looter API Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Instagram Looter Data:', JSON.stringify(data, null, 2));
          
          const followerCount = data.follower_count || data.followers || 
                               data.edge_followed_by?.count || findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'instagram',
              handle: cleanHandle,
              followers: followerCount,
              verified: data.is_verified || data.verified || false,
              url: `https://instagram.com/${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('Instagram Looter API failed:', error);
      }
      
      // Try Instagram Scraper Stable API (RockSolid APIs)
      try {
        const response = await fetch(
          `https://instagram-scraper-api2.p.rapidapi.com/v1/info?username_or_id_or_url=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'instagram-scraper-api2.p.rapidapi.com',
            },
          }
        );
        
        console.log('Instagram Scraper API Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Instagram Scraper Data:', JSON.stringify(data, null, 2));
          
          const followerCount = findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'instagram',
              handle: cleanHandle,
              followers: followerCount,
              verified: data.is_verified || data.verified || false,
              url: `https://instagram.com/${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('Instagram Scraper API failed:', error);
      }
      
      // Try Instagram Social API (Social Lens)
      try {
        const response = await fetch(
          `https://instagram-social-api.p.rapidapi.com/username/${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'instagram-social-api.p.rapidapi.com',
            },
          }
        );
        
        console.log('Instagram Social API Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Instagram Social API Data:', JSON.stringify(data, null, 2));
          
          const followerCount = findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'instagram',
              handle: cleanHandle,
              followers: followerCount,
              verified: data.is_verified || data.verified || false,
              url: `https://instagram.com/${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('Instagram Social API failed:', error);
      }
      
      // Try Instagram Premium API (NikitusLLP)
      try {
        const response = await fetch(
          `https://instagram-premium-api-2023.p.rapidapi.com/v1/user/by/username?username=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'instagram-premium-api-2023.p.rapidapi.com',
            },
          }
        );
        
        console.log('Instagram Premium API Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Instagram Premium API Data:', JSON.stringify(data, null, 2));
          
          const followerCount = findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'instagram',
              handle: cleanHandle,
              followers: followerCount,
              verified: data.is_verified || data.verified || false,
              url: `https://instagram.com/${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('Instagram Premium API failed:', error);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Instagram API error:', error);
    return null;
  }
}

// Threads API Implementation
export async function fetchThreadsFollowers(handle: string): Promise<SocialMediaProfile | null> {
  const cleanHandle = handle.replace('@', '');
  
  try {
    if (config.rapidApi?.key) {
      // Try Threads API4
      try {
        const response = await fetch(
          `https://threads-api4.p.rapidapi.com/api/user/info?username=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'threads-api4.p.rapidapi.com',
            },
          }
        );
        
        console.log('Threads API4 Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('Threads API4 Data:', JSON.stringify(data, null, 2));
          
          // Look for follower count in various possible locations
          const followerCount = 
            data.follower_count || 
            data.followers ||
            data.user?.follower_count ||
            data.user?.followers ||
            data.data?.follower_count ||
            data.data?.followers ||
            findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'threads',
              handle: cleanHandle,
              followers: typeof followerCount === 'string' ? parseInt(followerCount.replace(/[^0-9]/g, '')) : followerCount,
              verified: data.is_verified || data.verified || data.user?.is_verified || false,
              url: `https://threads.net/@${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('Threads API4 failed:', error);
      }
    }
    
    return null;
  } catch (error) {
    console.error('Threads API error:', error);
    return null;
  }
}

// Nostr API Implementation - Direct query from relays
export async function fetchNostrFollowers(handle: string): Promise<SocialMediaProfile | null> {
  // Handle can be npub or hex pubkey
  const _pubkey = handle;
  
  try {
    // Import nip19 dynamically to decode npub if needed
    const { nip19 } = await import('nostr-tools');
    
    // Check if it's an npub
    if (handle.startsWith('npub1')) {
      const decoded = nip19.decode(handle);
      if (decoded.type === 'npub') {
        // pubkey would be used here if we could connect to relays directly
        // but we delegate this to the hook instead
        void decoded.data;
      }
    }
    
    // For Nostr, we need to query relays directly
    // Since we're in a browser environment and can't connect to websockets directly from this file,
    // we'll return null here and handle Nostr follower counts in the component using the useNostr hook
    console.log('Nostr follower count should be fetched using useNostr hook in the component');
    
    return null;
  } catch (error) {
    console.error('Nostr follower fetch error:', error);
    return null;
  }
}

// TikTok API Implementation
export async function fetchTikTokFollowers(handle: string): Promise<SocialMediaProfile | null> {
  const cleanHandle = handle.replace('@', '');
  
  try {
    // Option 1: RapidAPI TikTok (multiple endpoints)
    if (config.rapidApi?.key) {
      // Try TikTok API 23 (different provider) - user info endpoint
      try {
        const response = await fetch(
          `https://tiktok-api23.p.rapidapi.com/api/user/info?uniqueId=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'tiktok-api23.p.rapidapi.com',
            },
          }
        );
        
        console.log('TikTok API23 User Info Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('TikTok API23 User Info Data:', JSON.stringify(data, null, 2));
          
          // Look for follower count in various possible locations
          const followerCount = 
            data.stats?.followerCount || 
            data.user?.stats?.followerCount ||
            data.userInfo?.stats?.followerCount ||
            data.data?.stats?.followerCount ||
            findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'tiktok',
              handle: cleanHandle,
              followers: typeof followerCount === 'string' ? parseInt(followerCount.replace(/[^0-9]/g, '')) : followerCount,
              verified: data.user?.verified || data.userInfo?.verified || data.verified || false,
              url: `https://tiktok.com/@${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('TikTok API23 failed:', error);
      }

      // Try TikTok API by apibox - different endpoint structure
      try {
        // First try the user info endpoint
        const response = await fetch(
          `https://tiktok-api15.p.rapidapi.com/index/Tiktok/getUserInfoByName?unique_id=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'tiktok-api15.p.rapidapi.com',
            },
          }
        );
        
        console.log('TikTok API15 getUserInfoByName Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('TikTok API15 getUserInfoByName Data:', JSON.stringify(data, null, 2));
          
          // Look for follower count in various possible locations
          const followerCount = 
            data.data?.stats?.followerCount || 
            data.data?.follower_count ||
            data.data?.followers ||
            data.userInfo?.stats?.followerCount ||
            data.userInfo?.user?.follower_count ||
            data.followerCount || 
            data.followers || 
            findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'tiktok',
              handle: cleanHandle,
              followers: typeof followerCount === 'string' ? parseInt(followerCount.replace(/[^0-9]/g, '')) : followerCount,
              verified: data.data?.verified || data.userInfo?.user?.verified || data.verified || false,
              url: `https://tiktok.com/@${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('TikTok API15 getUserInfoByName failed:', error);
      }
      
      // Try another endpoint format
      try {
        const response = await fetch(
          `https://tiktok-api15.p.rapidapi.com/index/Tiktok/getUserInfo?unique_id=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'tiktok-api15.p.rapidapi.com',
            },
          }
        );
        
        console.log('TikTok API15 getUserInfo Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('TikTok API15 getUserInfo Data:', JSON.stringify(data, null, 2));
          
          const followerCount = findFollowerCount(data);
          
          if (followerCount > 0) {
            return {
              platform: 'tiktok',
              handle: cleanHandle,
              followers: followerCount,
              verified: data.verified || false,
              url: `https://tiktok.com/@${cleanHandle}`,
            };
          }
        }
      } catch (error) {
        console.log('TikTok API15 getUserInfo failed:', error);
      }
      
      // Try search endpoint as last resort
      try {
        const response = await fetch(
          `https://tiktok-api15.p.rapidapi.com/index/Tiktok/searchUser?keywords=${cleanHandle}`,
          {
            headers: {
              'X-RapidAPI-Key': config.rapidApi.key,
              'X-RapidAPI-Host': 'tiktok-api15.p.rapidapi.com',
            },
          }
        );
        
        console.log('TikTok API15 searchUser Response:', response.status);
        
        if (response.ok) {
          const data = await response.json();
          console.log('TikTok API15 searchUser Data:', JSON.stringify(data, null, 2));
          
          // Find the matching user in search results
          const users = data.data?.user_list || data.user_list || data.users || [];
          for (const user of users) {
            if (user.unique_id === cleanHandle || user.username === cleanHandle) {
              const followerCount = user.follower_count || user.followers || findFollowerCount(user);
              if (followerCount > 0) {
                return {
                  platform: 'tiktok',
                  handle: cleanHandle,
                  followers: typeof followerCount === 'string' ? parseInt(followerCount.replace(/[^0-9]/g, '')) : followerCount,
                  verified: user.verified || false,
                  url: `https://tiktok.com/@${cleanHandle}`,
                };
              }
            }
          }
        }
      } catch (error) {
        console.log('TikTok API15 searchUser failed:', error);
      }
    }
    
    return null;
  } catch (error) {
    console.error('TikTok API error:', error);
    return null;
  }
}

// ScraperAPI Implementation (web scraping service)
export async function fetchWithScraperAPI(url: string): Promise<string | null> {
  if (!config.scraperApi?.key) return null;
  
  try {
    const response = await fetch(
      `https://api.scraperapi.com?api_key=${config.scraperApi.key}&url=${encodeURIComponent(url)}`
    );
    
    if (response.ok) {
      return await response.text();
    }
    
    return null;
  } catch (error) {
    console.error('ScraperAPI error:', error);
    return null;
  }
}

// Main function to fetch follower count
export async function fetchRealFollowerCount(
  handle: string,
  platform: string
): Promise<SocialMediaProfile> {
  let result: SocialMediaProfile | null = null;
  
  // Try platform-specific APIs
  switch (platform) {
    case 'twitter':
    case 'x':
      result = await fetchTwitterFollowers(handle);
      break;
    case 'youtube':
      result = await fetchYouTubeSubscribers(handle);
      break;
    case 'instagram':
      result = await fetchInstagramFollowers(handle);
      break;
    case 'tiktok':
      result = await fetchTikTokFollowers(handle);
      break;
    case 'threads':
      result = await fetchThreadsFollowers(handle);
      break;
    case 'nostr':
      result = await fetchNostrFollowers(handle);
      break;
  }
  
  // If API call succeeded, return the result
  if (result) {
    return result;
  }
  
  // Fallback response
  return {
    platform,
    handle: handle.replace('@', ''),
    followers: 0,
    verified: false,
    url: '',
    error: platform === 'nostr' 
      ? 'Nostr follower count requires direct relay connection. Please enter manually.' 
      : 'API not configured. Please add API keys or use manual entry.',
  };
}

// Check if any API is configured
export function hasAPIConfiguration(): boolean {
  return !!(
    config.twitter?.bearerToken ||
    config.youtube?.apiKey ||
    config.rapidApi?.key ||
    config.scraperApi?.key ||
    config.proxyUrl
  );
}