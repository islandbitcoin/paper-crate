import type { Campaign, PerformanceReport } from '@/stores/campaignStore';

export function formatSats(millisats: number): string {
  const sats = Math.floor(millisats / 1000);
  if (sats >= 1000000) {
    return `${(sats / 1000000).toFixed(1)}M sats`;
  }
  if (sats >= 1000) {
    return `${(sats / 1000).toFixed(1)}K sats`;
  }
  return `${sats} sats`;
}

export function formatCurrency(millisats: number): string {
  // Rough conversion: 1 sat ≈ $0.0003 (this would be dynamic in production)
  const sats = millisats / 1000;
  const usd = sats * 0.0003;
  
  if (usd >= 1) {
    return `$${usd.toFixed(2)}`;
  }
  return `${Math.round(usd * 100)}¢`;
}

export function calculateEarnings(
  metrics: Record<string, number>,
  rates: Campaign['rates']
): number {
  let total = 0;
  
  if (metrics.likes && rates.like) {
    total += metrics.likes * rates.like;
  }
  if (metrics.reposts && rates.repost) {
    total += metrics.reposts * rates.repost;
  }
  if (metrics.zaps && rates.zap) {
    total += metrics.zaps * rates.zap;
  }
  if (metrics.comments && rates.comment) {
    total += metrics.comments * rates.comment;
  }
  
  return total;
}

export function getCampaignStatus(campaign: Campaign): {
  status: 'upcoming' | 'active' | 'ending-soon' | 'completed' | 'paused';
  daysRemaining?: number;
} {
  if (campaign.status === 'paused') {
    return { status: 'paused' };
  }
  
  if (campaign.status === 'completed') {
    return { status: 'completed' };
  }
  
  const now = new Date();
  const startDate = new Date(campaign.startDate);
  const endDate = new Date(campaign.endDate);
  
  if (now < startDate) {
    return { status: 'upcoming' };
  }
  
  if (now > endDate) {
    return { status: 'completed' };
  }
  
  const msRemaining = endDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(msRemaining / (1000 * 60 * 60 * 24));
  
  if (daysRemaining <= 3) {
    return { status: 'ending-soon', daysRemaining };
  }
  
  return { status: 'active', daysRemaining };
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'active':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'upcoming':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'ending-soon':
      return 'text-orange-600 bg-orange-50 border-orange-200';
    case 'completed':
      return 'text-gray-600 bg-gray-50 border-gray-200';
    case 'paused':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'pending':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    case 'approved':
      return 'text-green-600 bg-green-50 border-green-200';
    case 'rejected':
      return 'text-red-600 bg-red-50 border-red-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
}

export function getPlatformIcon(platform: string): string {
  switch (platform.toLowerCase()) {
    case 'nostr':
      return '⚡';
    case 'twitter':
      return '🐦';
    case 'instagram':
      return '📷';
    case 'tiktok':
      return '🎵';
    case 'facebook':
      return '👥';
    case 'youtube':
      return '📺';
    case 'linkedin':
      return '💼';
    default:
      return '🌐';
  }
}

export function validatePlatformHandle(platform: string, handle: string): boolean {
  switch (platform.toLowerCase()) {
    case 'twitter':
      return /^@?[A-Za-z0-9_]{1,15}$/.test(handle);
    case 'instagram':
      return /^@?[A-Za-z0-9_.]{1,30}$/.test(handle);
    case 'tiktok':
      return /^@?[A-Za-z0-9_.]{1,24}$/.test(handle);
    case 'nostr':
      return handle.startsWith('npub') || /^[a-f0-9]{64}$/.test(handle);
    default:
      return handle.length > 0;
  }
}

export function generateCampaignCoordinate(
  businessPubkey: string,
  campaignId: string
): string {
  return `33851:${businessPubkey}:${campaignId}`;
}

export function parseCampaignCoordinate(coordinate: string): {
  kind: number;
  pubkey: string;
  identifier: string;
} | null {
  const parts = coordinate.split(':');
  if (parts.length !== 3) return null;
  
  const [kindStr, pubkey, identifier] = parts;
  const kind = parseInt(kindStr, 10);
  
  if (isNaN(kind) || !pubkey || !identifier) return null;
  
  return { kind, pubkey, identifier };
}

export function calculateCampaignROI(
  campaign: Campaign,
  reports: PerformanceReport[]
): {
  totalSpent: number;
  totalEngagement: number;
  costPerEngagement: number;
  platformBreakdown: Record<string, { spent: number; engagement: number }>;
} {
  let totalSpent = 0;
  let totalEngagement = 0;
  const platformBreakdown: Record<string, { spent: number; engagement: number }> = {};
  
  reports.forEach(report => {
    totalSpent += report.amountClaimed;
    
    const engagement = Object.values(report.metrics).reduce((sum, count) => sum + count, 0);
    totalEngagement += engagement;
    
    if (!platformBreakdown[report.platform]) {
      platformBreakdown[report.platform] = { spent: 0, engagement: 0 };
    }
    
    platformBreakdown[report.platform].spent += report.amountClaimed;
    platformBreakdown[report.platform].engagement += engagement;
  });
  
  const costPerEngagement = totalEngagement > 0 ? totalSpent / totalEngagement : 0;
  
  return {
    totalSpent,
    totalEngagement,
    costPerEngagement,
    platformBreakdown,
  };
}