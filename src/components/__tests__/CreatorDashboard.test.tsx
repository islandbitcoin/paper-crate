import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TestApp } from '@/test/TestApp';
import { CreatorDashboard } from '../CreatorDashboard';
import type { NUser } from '@nostrify/react/login';

// Mock the hooks
vi.mock('@/hooks/useCurrentUser', () => ({
  useCurrentUser: vi.fn(),
}));

vi.mock('@/hooks/useCampaigns', () => ({
  useCampaigns: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useCampaignApplications', () => ({
  useCreatorApplications: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/usePerformanceReports', () => ({
  useCreatorReports: vi.fn(() => ({
    data: [],
    isLoading: false,
  })),
}));

vi.mock('@/hooks/useLocalStorage', () => ({
  useLocalStorage: vi.fn(() => [[],]),
}));

import { useCurrentUser } from '@/hooks/useCurrentUser';
const mockUseCurrentUser = vi.mocked(useCurrentUser);

describe('CreatorDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default mock implementation
    const mockUser = { 
      pubkey: 'test-pubkey',
      method: 'test',
      signer: {
        getPublicKey: vi.fn().mockResolvedValue('test-pubkey'),
        signEvent: vi.fn(),
        nip44: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        },
      },
    } as unknown as NUser;
    
    mockUseCurrentUser.mockReturnValue({
      user: mockUser,
      users: [mockUser],
      metadata: {
        name: 'Test Creator',
        lud16: 'testcreator@lightning.com',
      },
    });
  });

  it('displays Lightning address when available', () => {
    render(
      <TestApp>
        <CreatorDashboard />
      </TestApp>
    );

    // Check if Lightning address is displayed
    expect(screen.getByText('testcreator@lightning.com')).toBeInTheDocument();
  });

  it('displays Lightning enabled badge when only lud06 is available', () => {
    // Update mock to return only lud06
    const mockUser = { 
      pubkey: 'test-pubkey',
      method: 'test',
      signer: {
        getPublicKey: vi.fn().mockResolvedValue('test-pubkey'),
        signEvent: vi.fn(),
        nip44: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        },
      },
    } as unknown as NUser;
    
    mockUseCurrentUser.mockReturnValue({
      user: mockUser,
      users: [mockUser],
      metadata: {
        name: 'Test Creator',
        lud06: 'lnurl1...',
      },
    });

    render(
      <TestApp>
        <CreatorDashboard />
      </TestApp>
    );

    // Check if "Lightning enabled" is displayed
    expect(screen.getByText('Lightning enabled')).toBeInTheDocument();
  });

  it('does not display Lightning badge when no Lightning address is available', () => {
    // Update mock to return no Lightning address
    const mockUser = { 
      pubkey: 'test-pubkey',
      method: 'test',
      signer: {
        getPublicKey: vi.fn().mockResolvedValue('test-pubkey'),
        signEvent: vi.fn(),
        nip44: {
          encrypt: vi.fn(),
          decrypt: vi.fn(),
        },
      },
    } as unknown as NUser;
    
    mockUseCurrentUser.mockReturnValue({
      user: mockUser,
      users: [mockUser],
      metadata: {
        name: 'Test Creator',
      },
    });

    render(
      <TestApp>
        <CreatorDashboard />
      </TestApp>
    );

    // Check that Lightning related text is not displayed
    expect(screen.queryByText('Lightning enabled')).not.toBeInTheDocument();
    expect(screen.queryByText(/lightning\.com/)).not.toBeInTheDocument();
  });
});