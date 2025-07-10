import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Campaign {
  id: string;
  title: string;
  description: string;
  budget: number; // millisats
  rates: {
    like: number;
    repost: number;
    zap: number;
    comment: number;
  };
  platforms: string[];
  startDate: string;
  endDate: string;
  minFollowers?: number;
  maxPosts?: number;
  status: 'active' | 'paused' | 'completed';
  businessPubkey: string;
  createdAt: number;
  spent: number; // millisats spent so far
}

export interface CampaignApplication {
  id: string;
  campaignId: string;
  campaignCoordinate: string;
  businessPubkey: string;
  creatorPubkey: string;
  platforms: Record<string, string>; // platform -> handle
  followers: Record<string, number>; // platform -> count
  message: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: number;
}

export interface PerformanceReport {
  id: string;
  campaignCoordinate: string;
  businessPubkey: string;
  creatorPubkey: string;
  platform: string;
  postUrl: string;
  nostrEventId?: string;
  metrics: Record<string, number>; // type -> count
  amountClaimed: number; // millisats
  notes?: string;
  createdAt: number;
  verified: boolean;
  paymentHash?: string;
}

interface CampaignStore {
  // State
  campaigns: Campaign[];
  applications: CampaignApplication[];
  reports: PerformanceReport[];
  
  // Actions
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  updateCampaignSpent: (id: string, amount: number) => void;
  addApplication: (application: CampaignApplication) => void;
  updateApplication: (id: string, updates: Partial<CampaignApplication>) => void;
  addReport: (report: PerformanceReport) => void;
  updateReport: (id: string, updates: Partial<PerformanceReport>) => void;
  
  // Getters
  getCampaignsByBusiness: (pubkey: string) => Campaign[];
  getApplicationsByCampaign: (campaignId: string) => CampaignApplication[];
  getApplicationsByCreator: (pubkey: string) => CampaignApplication[];
  getReportsByCampaign: (campaignCoordinate: string) => PerformanceReport[];
  getReportsByCreator: (pubkey: string) => PerformanceReport[];
}

export const useCampaignStore = create<CampaignStore>()(
  persist(
    (set, get) => ({
      campaigns: [],
      applications: [],
      reports: [],
      
      addCampaign: (campaign) =>
        set((state) => ({
          campaigns: [...state.campaigns, campaign],
        })),
      
      updateCampaign: (id, updates) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id ? { ...c, ...updates } : c
          ),
        })),
      
      updateCampaignSpent: (id, amount) =>
        set((state) => ({
          campaigns: state.campaigns.map((c) =>
            c.id === id ? { ...c, spent: c.spent + amount } : c
          ),
        })),
      
      addApplication: (application) =>
        set((state) => ({
          applications: [...state.applications, application],
        })),
      
      updateApplication: (id, updates) =>
        set((state) => ({
          applications: state.applications.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          ),
        })),
      
      addReport: (report) =>
        set((state) => ({
          reports: [...state.reports, report],
        })),
      
      updateReport: (id, updates) =>
        set((state) => ({
          reports: state.reports.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        })),
      
      getCampaignsByBusiness: (pubkey) =>
        get().campaigns.filter((c) => c.businessPubkey === pubkey),
      
      getApplicationsByCampaign: (campaignId) =>
        get().applications.filter((a) => a.campaignId === campaignId),
      
      getApplicationsByCreator: (pubkey) =>
        get().applications.filter((a) => a.creatorPubkey === pubkey),
      
      getReportsByCampaign: (campaignCoordinate) =>
        get().reports.filter((r) => r.campaignCoordinate === campaignCoordinate),
      
      getReportsByCreator: (pubkey) =>
        get().reports.filter((r) => r.creatorPubkey === pubkey),
    }),
    {
      name: 'campaign-store',
    }
  )
);