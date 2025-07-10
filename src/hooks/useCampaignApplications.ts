import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCampaignStore, type CampaignApplication } from '@/stores/campaignStore';

function validateApplicationEvent(event: NostrEvent): boolean {
  if (event.kind !== 34609) return false;

  const requiredTags = ['d', 'a', 'p', 'platforms', 'followers', 't', 'status'];

  for (const tagName of requiredTags) {
    const tag = event.tags.find(([name]) => name === tagName);
    if (!tag || !tag[1]) return false;
  }

  // Validate status
  const status = event.tags.find(([name]) => name === 'status')?.[1];
  if (!['pending', 'approved', 'rejected'].includes(status || '')) return false;

  return true;
}

function eventToApplication(event: NostrEvent): CampaignApplication {
  const getTag = (name: string) => event.tags.find(([n]) => n === name)?.[1] || '';

  // Parse platforms: "platform:handle,platform:handle"
  const platformsStr = getTag('platforms');
  const platforms: Record<string, string> = {};
  platformsStr.split(',').forEach(pair => {
    const [platform, handle] = pair.split(':');
    if (platform && handle) {
      platforms[platform] = handle;
    }
  });

  // Parse followers: "platform:count,platform:count"
  const followersStr = getTag('followers');
  const followers: Record<string, number> = {};
  followersStr.split(',').forEach(pair => {
    const [platform, countStr] = pair.split(':');
    const count = parseInt(countStr, 10);
    if (platform && !isNaN(count)) {
      followers[platform] = count;
    }
  });

  const campaignCoordinate = getTag('a');
  const campaignId = campaignCoordinate.split(':')[2] || '';

  return {
    id: getTag('d'),
    campaignId,
    campaignCoordinate,
    businessPubkey: getTag('p'),
    creatorPubkey: event.pubkey,
    platforms,
    followers,
    message: event.content,
    status: getTag('status') as 'pending' | 'approved' | 'rejected',
    createdAt: event.created_at,
  };
}

export function useCampaignApplications(campaignCoordinate?: string) {
  const { nostr } = useNostr();
  const { addApplication } = useCampaignStore();

  return useQuery({
    queryKey: ['campaign-applications', campaignCoordinate],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const baseFilter = {
        kinds: [34609],
        '#t': ['campaign-application'],
        limit: 100,
      };

      const filter = campaignCoordinate
        ? { ...baseFilter, '#a': [campaignCoordinate] }
        : baseFilter;

      const events = await nostr.query([filter], { signal });

      const validEvents = events.filter(validateApplicationEvent);
      const applications = validEvents.map(eventToApplication);

      // Update store with fetched applications
      applications.forEach(addApplication);

      return applications;
    },
    enabled: !!campaignCoordinate,
    staleTime: 30000,
  });
}

export function useCreatorApplications(creatorPubkey?: string) {
  const { nostr } = useNostr();
  const { addApplication } = useCampaignStore();

  return useQuery({
    queryKey: ['creator-applications', creatorPubkey],
    queryFn: async (c) => {
      if (!creatorPubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const events = await nostr.query([
        {
          kinds: [34609],
          authors: [creatorPubkey],
          '#t': ['campaign-application'],
          limit: 50,
        }
      ], { signal });

      const validEvents = events.filter(validateApplicationEvent);
      const applications = validEvents.map(eventToApplication);

      // Update store with fetched applications
      applications.forEach(addApplication);

      return applications;
    },
    enabled: !!creatorPubkey,
    staleTime: 30000,
  });
}

export function useBusinessApplications(businessPubkey?: string) {
  const { nostr } = useNostr();
  const { addApplication } = useCampaignStore();

  return useQuery({
    queryKey: ['business-applications', businessPubkey],
    queryFn: async (c) => {
      if (!businessPubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const events = await nostr.query([
        {
          kinds: [34609],
          '#p': [businessPubkey],
          '#t': ['campaign-application'],
          limit: 100,
        }
      ], { signal });

      const validEvents = events.filter(validateApplicationEvent);
      const applications = validEvents.map(eventToApplication);

      // Update store with fetched applications
      applications.forEach(addApplication);

      return applications;
    },
    enabled: !!businessPubkey,
    staleTime: 30000,
  });
}