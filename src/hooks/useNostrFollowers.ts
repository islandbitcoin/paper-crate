import { useNostr } from '@nostrify/react';
import { useQuery } from '@tanstack/react-query';
import { nip19 } from 'nostr-tools';

export function useNostrFollowers(handle: string | null) {
  const { nostr } = useNostr();

  return useQuery({
    queryKey: ['nostr-followers', handle],
    queryFn: async (c) => {
      if (!handle) return { followers: 0, error: 'No handle provided' };

      try {
        let pubkey = handle;
        
        // Check if it's an npub and decode it
        if (handle.startsWith('npub1')) {
          const decoded = nip19.decode(handle);
          if (decoded.type === 'npub') {
            pubkey = decoded.data;
          }
        }
        
        // Validate it's a valid hex pubkey (64 characters)
        if (!/^[a-fA-F0-9]{64}$/.test(pubkey)) {
          return { followers: 0, error: 'Invalid pubkey format' };
        }

        // Query for all kind 3 (follow list) events that include this pubkey in their tags
        const signal = AbortSignal.any([c.signal, AbortSignal.timeout(10000)]); // Increased timeout for larger queries
        
        // Fetch all follow lists that include this pubkey
        // Many popular Nostr users have thousands of followers, so we need a higher limit
        const events = await nostr.query([
          {
            kinds: [3],
            '#p': [pubkey],
            limit: 50000, // Increased limit to handle accounts with many followers
          }
        ], { signal });

        // Count unique authors (followers)
        const uniqueFollowers = new Set(events.map(event => event.pubkey));
        const followerCount = uniqueFollowers.size;

        console.log(`Found ${followerCount} followers for Nostr pubkey ${pubkey} from ${events.length} follow events`);
        
        // If we hit exactly our limit, there might be more followers
        if (events.length === 50000) {
          console.warn(`Hit the query limit of 50,000 events. There may be more followers than ${followerCount}.`);
        }
        
        // Log some stats about the query
        if (followerCount > 0) {
          console.log(`Follower count query stats: ${events.length} events processed, ${followerCount} unique followers found`);
        }

        return {
          followers: followerCount,
          error: null,
        };
      } catch (error) {
        console.error('Failed to fetch Nostr followers:', error);
        return {
          followers: 0,
          error: 'Failed to fetch follower count from Nostr relays',
        };
      }
    },
    enabled: !!handle,
    staleTime: 60000, // Cache for 1 minute
    retry: 1,
  });
}