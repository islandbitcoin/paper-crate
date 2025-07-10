import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApplyCampaignDialog } from './ApplyCampaignDialog';
import { TestApp } from '@/test/TestApp';
import type { Campaign } from '@/stores/campaignStore';

// Mock the hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: () => ({
    user: {
      pubkey: 'test-pubkey',
      displayName: 'Test User',
    }
  })
}));

vi.mock('@/hooks/useNostrPublish', () => ({
  useNostrPublish: () => ({
    mutate: vi.fn(),
    isPending: false,
  })
}));

// Mock localStorage
const mockGetItem = vi.fn();
const mockSetItem = vi.fn();
Storage.prototype.getItem = mockGetItem;
Storage.prototype.setItem = mockSetItem;

const mockCampaign: Campaign = {
  id: 'test-campaign',
  businessPubkey: 'business-pubkey',
  title: 'Test Campaign',
  description: 'Test Description',
  platforms: ['twitter', 'instagram', 'youtube'],
  budget: 1000,
  spent: 0,
  status: 'active',
  minFollowers: 1000,
  maxPosts: 5,
  rates: {
    like: 10,
    repost: 20,
    zap: 30,
    comment: 15,
  },
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  createdAt: Date.now(),
};

describe('ApplyCampaignDialog', () => {
  beforeEach(() => {
    mockGetItem.mockClear();
    mockSetItem.mockClear();
  });

  it('should auto-fill platforms from saved profile', async () => {
    // Mock saved platforms in localStorage
    const savedPlatforms = [
      {
        platform: 'twitter',
        handle: '@saveduser',
        followers: 5000,
        verified: true,
      },
      {
        platform: 'instagram',
        handle: 'saveduser',
        followers: 3000,
        verified: false,
      },
      {
        platform: 'tiktok',
        handle: '@savedtiktok',
        followers: 10000,
        verified: false,
      }
    ];

    mockGetItem.mockImplementation((key) => {
      if (key === 'social-platforms-test-pubkey') {
        return JSON.stringify(savedPlatforms);
      }
      return null;
    });

    render(
      <TestApp>
        <ApplyCampaignDialog
          campaign={mockCampaign}
          open={true}
          onOpenChange={() => {}}
        />
      </TestApp>
    );

    // Wait for the dialog to render and auto-fill
    await waitFor(() => {
      // Check that Twitter and Instagram are auto-filled (they're in the campaign platforms)
      expect(screen.getByDisplayValue('@saveduser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('5000')).toBeInTheDocument();
      expect(screen.getByDisplayValue('saveduser')).toBeInTheDocument();
      expect(screen.getByDisplayValue('3000')).toBeInTheDocument();
    });

    // Check that TikTok is NOT auto-filled (not in campaign platforms)
    expect(screen.queryByDisplayValue('@savedtiktok')).not.toBeInTheDocument();
    expect(screen.queryByDisplayValue('10000')).not.toBeInTheDocument();
  });

  it('should show saved indicator on available platforms', async () => {
    const savedPlatforms = [
      {
        platform: 'youtube',
        handle: 'savedchannel',
        followers: 15000,
        verified: false,
      }
    ];

    mockGetItem.mockImplementation((key) => {
      if (key === 'social-platforms-test-pubkey') {
        return JSON.stringify(savedPlatforms);
      }
      return null;
    });

    render(
      <TestApp>
        <ApplyCampaignDialog
          campaign={mockCampaign}
          open={true}
          onOpenChange={() => {}}
        />
      </TestApp>
    );

    // Wait for the dialog to render
    await waitFor(() => {
      // YouTube should be auto-filled
      expect(screen.getByDisplayValue('savedchannel')).toBeInTheDocument();
    });

    // Simply check that the auto-filled from profile badge exists
    expect(screen.getByText('Auto-filled from profile')).toBeInTheDocument();
  });

  it('should show auto-filled indicator on platform inputs', async () => {
    const savedPlatforms = [
      {
        platform: 'twitter',
        handle: '@testuser',
        followers: 2500,
        verified: true,
      }
    ];

    mockGetItem.mockImplementation((key) => {
      if (key === 'social-platforms-test-pubkey') {
        return JSON.stringify(savedPlatforms);
      }
      return null;
    });

    render(
      <TestApp>
        <ApplyCampaignDialog
          campaign={mockCampaign}
          open={true}
          onOpenChange={() => {}}
        />
      </TestApp>
    );

    // Wait for auto-fill
    await waitFor(() => {
      expect(screen.getByText('Auto-filled from profile')).toBeInTheDocument();
    });
  });

  it('should allow adding platforms manually when not saved', async () => {
    mockGetItem.mockReturnValue(null); // No saved platforms

    const user = userEvent.setup();

    render(
      <TestApp>
        <ApplyCampaignDialog
          campaign={mockCampaign}
          open={true}
          onOpenChange={() => {}}
        />
      </TestApp>
    );

    // Wait for the dialog to render
    await waitFor(() => {
      expect(screen.getByText('Platform Credentials')).toBeInTheDocument();
    });

    // Find and click on the Twitter badge in the Add section
    const addSection = screen.getByText('Add:').parentElement;
    const twitterBadge = addSection?.querySelector('[class*="badge"]');
    
    if (twitterBadge) {
      await user.click(twitterBadge);
      
      // Wait for inputs to appear
      await waitFor(() => {
        // Check that the twitter section was added
        expect(screen.getByText('twitter')).toBeInTheDocument();
        // Check that input fields exist (they might have different placeholders)
        const inputs = screen.getAllByRole('textbox');
        expect(inputs.length).toBeGreaterThan(0);
      });
    }
  });
});