// Social media service for fetching follower counts
// Note: Most social media platforms require authentication to access their APIs
// This service uses web scraping as a fallback, which may be rate-limited

export interface SocialMediaProfile {
  platform: string;
  handle: string;
  followers: number;
  verified: boolean;
  url: string;
  error?: string;
}

// Clean and normalize social media handles
export function normalizeHandle(handle: string, platform: string): string {
  // Remove @ symbol and trim whitespace
  const normalized = handle.trim().replace(/^@/, '');
  
  // Platform-specific normalization
  switch (platform) {
    case 'twitter':
    case 'x':
      // Twitter/X handles are case-insensitive
      return normalized.toLowerCase();
    case 'instagram':
      // Instagram handles are case-insensitive and can't have dots at the end
      return normalized.toLowerCase().replace(/\.+$/, '');
    case 'tiktok':
      // TikTok handles are case-insensitive
      return normalized.toLowerCase();
    case 'youtube':
      // YouTube can be a channel ID or custom handle
      return normalized;
    default:
      return normalized;
  }
}

// Generate profile URL from handle
export function getProfileUrl(handle: string, platform: string): string {
  const normalized = normalizeHandle(handle, platform);
  
  switch (platform) {
    case 'twitter':
    case 'x':
      return `https://x.com/${normalized}`;
    case 'instagram':
      return `https://instagram.com/${normalized}`;
    case 'tiktok':
      return `https://tiktok.com/@${normalized}`;
    case 'youtube':
      // YouTube URLs can be channels or custom handles
      if (normalized.startsWith('UC') || normalized.startsWith('@')) {
        return `https://youtube.com/${normalized}`;
      }
      return `https://youtube.com/@${normalized}`;
    case 'threads':
      return `https://threads.net/@${normalized}`;
    case 'nostr':
      return `https://primal.net/p/${normalized}`;
    default:
      return '';
  }
}

import { fetchRealFollowerCount, hasAPIConfiguration } from './api/social-media-api';

// Fetch follower count
export async function fetchFollowerCount(
  handle: string,
  platform: string
): Promise<SocialMediaProfile> {
  const normalizedHandle = normalizeHandle(handle, platform);
  const profileUrl = getProfileUrl(handle, platform);

  try {
    // Check if we have API configuration
    if (hasAPIConfiguration()) {
      // Try to fetch real data
      const result = await fetchRealFollowerCount(handle, platform);
      
      // If we got data, return it
      if (result.followers > 0 || !result.error) {
        return result;
      }
    }
    
    // If no API is configured or API call failed, return placeholder
    return {
      platform,
      handle: normalizedHandle,
      followers: 0,
      verified: false,
      url: profileUrl,
      error: 'Please configure API keys in .env.local or enter follower count manually.',
    };
  } catch (error) {
    console.error(`Failed to fetch ${platform} follower count:`, error);
    
    return {
      platform,
      handle: normalizedHandle,
      followers: 0,
      verified: false,
      url: profileUrl,
      error: `Failed to fetch follower count. Please enter manually.`,
    };
  }
}

// Validate if a handle exists on a platform
export async function validateHandle(
  handle: string,
  platform: string
): Promise<{ valid: boolean; error?: string }> {
  const normalizedHandle = normalizeHandle(handle, platform);
  
  // Basic validation rules
  if (!normalizedHandle) {
    return { valid: false, error: 'Handle cannot be empty' };
  }

  // Platform-specific validation
  switch (platform) {
    case 'twitter':
    case 'x':
      if (normalizedHandle.length > 15) {
        return { valid: false, error: 'Twitter/X handles must be 15 characters or less' };
      }
      if (!/^[a-z0-9_]+$/i.test(normalizedHandle)) {
        return { valid: false, error: 'Twitter/X handles can only contain letters, numbers, and underscores' };
      }
      break;
    case 'instagram':
      if (normalizedHandle.length > 30) {
        return { valid: false, error: 'Instagram handles must be 30 characters or less' };
      }
      if (!/^[a-z0-9._]+$/i.test(normalizedHandle)) {
        return { valid: false, error: 'Instagram handles can only contain letters, numbers, periods, and underscores' };
      }
      break;
    case 'tiktok':
      if (normalizedHandle.length < 2 || normalizedHandle.length > 24) {
        return { valid: false, error: 'TikTok handles must be between 2 and 24 characters' };
      }
      if (!/^[a-z0-9._]+$/i.test(normalizedHandle)) {
        return { valid: false, error: 'TikTok handles can only contain letters, numbers, periods, and underscores' };
      }
      break;
  }

  // In production, you would make an API call to verify the handle exists
  // For now, we'll assume all handles are valid after basic validation
  return { valid: true };
}

// Platform metadata
export const SUPPORTED_PLATFORMS = [
  { id: 'twitter', name: 'X (Twitter)', icon: '𝕏', color: 'black' },
  { id: 'instagram', name: 'Instagram', icon: '📷', color: '#E4405F' },
  { id: 'tiktok', name: 'TikTok', icon: '🎵', color: '#000000' },
  { id: 'youtube', name: 'YouTube', icon: '📺', color: '#FF0000' },
  { id: 'threads', name: 'Threads', icon: '🧵', color: '#000000' },
  { id: 'nostr', name: 'Nostr', icon: '⚡', color: '#9b59b6' },
] as const;

export type SupportedPlatform = typeof SUPPORTED_PLATFORMS[number]['id'];