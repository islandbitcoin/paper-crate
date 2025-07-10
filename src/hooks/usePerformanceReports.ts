import { useQuery } from '@tanstack/react-query';
import { useNostr } from '@nostrify/react';
import type { NostrEvent } from '@nostrify/nostrify';
import { useCampaignStore, type PerformanceReport } from '@/stores/campaignStore';
import { validateReportEvent, validatePaymentEvent, validateNostrEvent } from '@/lib/security/nostr-validation';

// Removed local validateReportEvent - now using the secure version from nostr-validation.ts

function eventToReport(event: NostrEvent): PerformanceReport {
  const getTag = (name: string) => event.tags.find(([n]) => n === name)?.[1] || '';

  // Parse metrics: "type:count,type:count"
  const metricsStr = getTag('metrics');
  const metrics: Record<string, number> = {};
  metricsStr.split(',').forEach(pair => {
    const [type, countStr] = pair.split(':');
    const count = parseInt(countStr, 10);
    if (type && !isNaN(count)) {
      metrics[type] = count;
    }
  });

  const amountClaimed = parseInt(getTag('amount_claimed'), 10) || 0;

  return {
    id: event.id,
    campaignCoordinate: getTag('a'),
    businessPubkey: getTag('p'),
    creatorPubkey: event.pubkey,
    platform: getTag('platform'),
    postUrl: getTag('post_url'),
    nostrEventId: getTag('e') || undefined,
    metrics,
    amountClaimed,
    notes: event.content || undefined,
    createdAt: event.created_at,
    verified: false, // This would be updated by business validation
    paymentHash: undefined, // This would be set after payment
  };
}

export function usePerformanceReports(campaignCoordinate?: string) {
  const { nostr } = useNostr();
  const { addReport } = useCampaignStore();

  return useQuery({
    queryKey: ['performance-reports', campaignCoordinate],
    queryFn: async (c) => {
      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      const baseFilter = {
        kinds: [3387],
        '#t': ['performance-report'],
        limit: 100,
      };

      const filter = campaignCoordinate
        ? { ...baseFilter, '#a': [campaignCoordinate] }
        : baseFilter;

      const events = await nostr.query([filter], { signal });

      const validEvents = events.filter(validateReportEvent);
      const reports = validEvents.map(eventToReport);

      // Update store with fetched reports
      reports.forEach(addReport);

      return reports;
    },
    enabled: !!campaignCoordinate,
    staleTime: 30000,
  });
}

export function useCreatorReports(creatorPubkey?: string) {
  const { nostr } = useNostr();
  const { addReport } = useCampaignStore();

  return useQuery({
    queryKey: ['creator-reports', creatorPubkey],
    queryFn: async (c) => {
      if (!creatorPubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Fetch performance reports by creator
      const reportEvents = await nostr.query([
        {
          kinds: [3387],
          authors: [creatorPubkey],
          '#t': ['performance-report'],
          limit: 50,
        }
      ], { signal });

      const validEvents = reportEvents.filter(validateReportEvent);
      const reports = validEvents.map(eventToReport);

      // Extract all business pubkeys from reports
      const businessPubkeys = [...new Set(reports.map(r => r.businessPubkey))];

      // Fetch verification and payment events from all businesses
      const [verificationEvents, paymentEvents] = businessPubkeys.length > 0 
        ? await Promise.all([
            nostr.query([
              {
                kinds: [34612],
                authors: businessPubkeys,
                limit: 100,
              }
            ], { signal }),
            nostr.query([
              {
                kinds: [34611],
                authors: businessPubkeys,
                limit: 100,
              }
            ], { signal })
          ])
        : [[], []];

      // Create a map of report IDs to verification status
      const verificationMap = new Map<string, boolean>();
      verificationEvents.forEach(event => {
        // Validate event signature and timestamp
        if (!validateNostrEvent(event)) {
          console.warn('Invalid verification event:', event.id);
          return;
        }
        
        const reportId = event.tags.find(([name]) => name === 'e')?.[1];
        if (reportId) {
          try {
            const content = JSON.parse(event.content);
            if (content.verified === true) {
              verificationMap.set(reportId, true);
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      });

      // Create a map of report IDs to payment hashes
      const paymentMap = new Map<string, string>();
      paymentEvents.forEach(event => {
        // Validate payment event
        if (!validatePaymentEvent(event)) {
          console.warn('Invalid payment event:', event.id);
          return;
        }
        
        const reportId = event.tags.find(([name]) => name === 'e')?.[1];
        const preimage = event.tags.find(([name]) => name === 'preimage')?.[1];
        if (reportId && preimage) {
          paymentMap.set(reportId, preimage);
        }
      });

      // Update reports with verification status and payment info
      const verifiedReports = reports.map(report => ({
        ...report,
        verified: verificationMap.has(report.id),
        paymentHash: paymentMap.get(report.id)
      }));

      // Update store with fetched reports
      verifiedReports.forEach(addReport);

      return verifiedReports;
    },
    enabled: !!creatorPubkey,
    staleTime: 5000,
    refetchInterval: 10000,
  });
}

export function useBusinessReports(businessPubkey?: string) {
  const { nostr } = useNostr();
  const { addReport } = useCampaignStore();

  return useQuery({
    queryKey: ['business-reports', businessPubkey],
    queryFn: async (c) => {
      if (!businessPubkey) return [];

      const signal = AbortSignal.any([c.signal, AbortSignal.timeout(3000)]);

      // Fetch reports, verification events, and payment events
      const [reportEvents, verificationEvents, paymentEvents] = await Promise.all([
        nostr.query([
          {
            kinds: [3387],
            '#p': [businessPubkey],
            '#t': ['performance-report'],
            limit: 100,
          }
        ], { signal }),
        nostr.query([
          {
            kinds: [34612],
            authors: [businessPubkey],
            limit: 100,
          }
        ], { signal }),
        nostr.query([
          {
            kinds: [34611],
            authors: [businessPubkey],
            limit: 100,
          }
        ], { signal })
      ]);

      const validEvents = reportEvents.filter(validateReportEvent);
      const reports = validEvents.map(eventToReport);

      // Create a map of report IDs to verification status
      const verificationMap = new Map<string, boolean>();
      verificationEvents.forEach(event => {
        // Validate event signature and timestamp
        if (!validateNostrEvent(event)) {
          console.warn('Invalid verification event:', event.id);
          return;
        }
        
        const reportId = event.tags.find(([name]) => name === 'e')?.[1];
        if (reportId) {
          try {
            const content = JSON.parse(event.content);
            if (content.verified === true) {
              verificationMap.set(reportId, true);
            }
          } catch {
            // Invalid JSON, skip
          }
        }
      });

      // Create a map of report IDs to payment hashes
      const paymentMap = new Map<string, string>();
      paymentEvents.forEach(event => {
        // Validate payment event
        if (!validatePaymentEvent(event)) {
          console.warn('Invalid payment event:', event.id);
          return;
        }
        
        const reportId = event.tags.find(([name]) => name === 'e')?.[1];
        const preimage = event.tags.find(([name]) => name === 'preimage')?.[1];
        if (reportId && preimage) {
          paymentMap.set(reportId, preimage);
        }
      });

      // Update reports with verification status and payment info
      const verifiedReports = reports.map(report => ({
        ...report,
        verified: verificationMap.has(report.id),
        paymentHash: paymentMap.get(report.id)
      }));

      // Update store with fetched reports
      verifiedReports.forEach(addReport);

      return verifiedReports;
    },
    enabled: !!businessPubkey,
    staleTime: 5000, // Refresh more frequently to catch verification updates
    refetchInterval: 10000, // Poll every 10 seconds
  });
}