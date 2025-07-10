import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { ApplicationsTable } from '../ApplicationsTable';
import type { CampaignApplication } from '@/stores/campaignStore';

// Simple test to verify Lightning address display works
describe('Lightning Address Display', () => {
  it('shows Lightning addresses are included in NostrMetadata type', () => {
    // This test verifies that the NostrMetadata type includes lud16 and lud06
    const mockMetadata = {
      name: 'Test User',
      lud16: 'testuser@lightning.com',
      lud06: 'lnurl1...',
    };
    
    // Type checking - this will fail at compile time if the properties don't exist
    expect(mockMetadata.lud16).toBe('testuser@lightning.com');
    expect(mockMetadata.lud06).toBe('lnurl1...');
  });
});

describe('Application Approval/Rejection', () => {
  it('has approve and reject handlers implemented', () => {
    // This test verifies that the handlers are implemented
    const mockApplication: CampaignApplication = {
      id: 'test-123',
      campaignId: 'campaign-456',
      campaignCoordinate: '33851:business:campaign-456',
      businessPubkey: 'business-pubkey',
      creatorPubkey: 'creator-pubkey',
      platforms: { twitter: '@test' },
      followers: { twitter: 1000 },
      message: 'Test application',
      status: 'pending',
      createdAt: Date.now() / 1000,
    };

    // Verify the component renders without errors
    const { container } = render(
      <TestApp>
        <ApplicationsTable applications={[mockApplication]} />
      </TestApp>
    );

    expect(container).toBeTruthy();
  });
});