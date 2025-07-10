import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCampaignStore, type Campaign } from '@/stores/campaignStore';

function validateCampaignEvent(event: NostrEvent): boolean {
  if (event.kind !== 33851) return false;
  
  const requiredTags = ['d', 'title', 'description', 'budget', 'platforms', 'start_date', 'end_date', 't', 'status'];
  
  for (const tagName of requiredTags) {
    const tag = event.tags.find(([name]) => name === tagName);
    if (!tag || !tag[1]) return false;
  }
  
  // Validate status
  const status = event.tags.find(([name]) => name === 'status')?.[1];
  if (!['active', 'paused', 'completed'].includes(status || '')) return false;
  
  // Validate dates
  const startDate = event.tags.find(([name]) => name === 'start_date')?.[1];
  const endDate = event.tags.find(([name]) => name === 'end_date')?.[1];
  
  try {
    if (startDate) new Date(startDate).toISOString();
    if (endDate) new Date(endDate).toISOString();
  } catch {
    return false;
  }
  
  return true;
}

function eventToCampaign(event: NostrEvent): Campaign {
  const getTag = (name: string) => event.tags.find(([n]) => n === name)?.[1] || '';
  const getNumericTag = (name: string, defaultValue = 0) => {
    const value = getTag(name);
    return value ? parseInt(value, 10) : defaultValue;
  };
  
  return {
    id: getTag('d'),
    title: getTag('title'),
    description: getTag('description'),
    budget: getNumericTag('budget'),
    rates: {
      like: getNumericTag('rate_like'),
      repost: getNumericTag('rate_repost'),
      zap: getNumericTag('rate_zap'),
      comment: getNumericTag('rate_comment'),
    },
    platforms: getTag('platforms').split(',').filter(Boolean),
    startDate: getTag('start_date'),
    endDate: getTag('end_date'),
    minFollowers: getNumericTag('min_followers') || undefined,
    maxPosts: getNumericTag('max_posts') || undefined,
    status: getTag('status') as 'active' | 'paused' | 'completed',
    businessPubkey: event.pubkey,
    createdAt: event.created_at,
    spent: 0, // This would be calculated from performance reports
  };
}

export function useCampaigns() {
  const { nostr } = useNostr();
  const { addCampaign } = useCampaignStore();

  return useQuery({
    queryKey: ['campaigns'],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query([
        {
          kinds: [33851],
          '#t': ['campaign'],
          limit: 100,
        }
      ], { signal });

      const validEvents = events.filter(validateCampaignEvent);
      const campaigns = validEvents.map(eventToCampaign);
      
      // Update store with fetched campaigns
      campaigns.forEach(addCampaign);
      
      return campaigns;
    },
    staleTime: 30000, // 30 seconds
  });
}

export function useCampaignsByBusiness(businessPubkey?: string) {
  const { nostr } = useNostr();
  const { addCampaign } = useCampaignStore();

  return useQuery({
    queryKey: ['campaigns', 'business', businessPubkey],
    queryFn: async (c) => {
      if (!businessPubkey) return [];
      
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query([
        {
          kinds: [33851],
          authors: [businessPubkey],
          '#t': ['campaign'],
          limit: 50,
        }
      ], { signal });

      const validEvents = events.filter(validateCampaignEvent);
      const campaigns = validEvents.map(eventToCampaign);
      
      // Update store with fetched campaigns
      campaigns.forEach(addCampaign);
      
      return campaigns;
    },
    enabled: !!businessPubkey,
    staleTime: 30000,
  });
}

export function useCampaign(businessPubkey: string, campaignId: string) {
  const { nostr } = useNostr();
  const { addCampaign } = useCampaignStore();

  return useQuery({
    queryKey: ['campaign', businessPubkey, campaignId],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);
      
      const events = await nostr.query([
        {
          kinds: [33851],
          authors: [businessPubkey],
          '#d': [campaignId],
          limit: 1,
        }
      ], { signal });

      const event = events[0];
      if (!event || !validateCampaignEvent(event)) {
        return null;
      }
      
      const campaign = eventToCampaign(event);
      addCampaign(campaign);
      
      return campaign;
    },
    enabled: !!businessPubkey && !!campaignId,
    staleTime: 30000,
  });
}