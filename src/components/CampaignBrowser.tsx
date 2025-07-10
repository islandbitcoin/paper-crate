import { useState } from 'react';
import { Filter, SortAsc } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { CampaignCard } from './CampaignCard';
import { ApplyCampaignDialog } from './ApplyCampaignDialog';
import type { Campaign } from '@/stores/campaignStore';

interface CampaignBrowserProps {
  campaigns: Campaign[];
}

type SortOption = 'newest' | 'budget-high' | 'budget-low' | 'ending-soon';

export function CampaignBrowser({ campaigns }: CampaignBrowserProps) {
  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | null>(null);
  const [showApplyDialog, setShowApplyDialog] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([]);
  const [minBudget, setMinBudget] = useState<number | null>(null);

  // Get all unique platforms
  const allPlatforms = Array.from(
    new Set(campaigns.flatMap(c => c.platforms))
  ).sort();

  // Filter campaigns
  const filteredCampaigns = campaigns.filter(campaign => {
    // Platform filter
    if (selectedPlatforms.length > 0) {
      const hasMatchingPlatform = campaign.platforms.some(p => 
        selectedPlatforms.includes(p)
      );
      if (!hasMatchingPlatform) return false;
    }

    // Budget filter
    if (minBudget !== null) {
      const budgetInSats = campaign.budget / 1000;
      if (budgetInSats < minBudget) return false;
    }

    return true;
  });

  // Sort campaigns
  const sortedCampaigns = [...filteredCampaigns].sort((a, b) => {
    switch (sortBy) {
      case 'newest':
        return b.createdAt - a.createdAt;
      case 'budget-high':
        return b.budget - a.budget;
      case 'budget-low':
        return a.budget - b.budget;
      case 'ending-soon':
        return new Date(a.endDate).getTime() - new Date(b.endDate).getTime();
      default:
        return 0;
    }
  });

  const handleApply = (campaign: Campaign) => {
    setSelectedCampaign(campaign);
    setShowApplyDialog(true);
  };

  const handlePlatformToggle = (platform: string) => {
    setSelectedPlatforms(prev => 
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    );
  };

  const clearFilters = () => {
    setSelectedPlatforms([]);
    setMinBudget(null);
  };

  const activeFiltersCount = selectedPlatforms.length + (minBudget !== null ? 1 : 0);

  return (
    <div className="space-y-6">
      {/* Filters and Sort */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          {/* Filter Popover */}
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-2 h-5 w-5 p-0 text-xs">
                    {activeFiltersCount}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80" align="start">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Filters</h4>
                  {activeFiltersCount > 0 && (
                    <Button variant="ghost" size="sm" onClick={clearFilters}>
                      Clear all
                    </Button>
                  )}
                </div>
                
                <Separator />
                
                {/* Platform Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Platforms</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {allPlatforms.map(platform => (
                      <div key={platform} className="flex items-center space-x-2">
                        <Checkbox
                          id={platform}
                          checked={selectedPlatforms.includes(platform)}
                          onCheckedChange={() => handlePlatformToggle(platform)}
                        />
                        <Label 
                          htmlFor={platform} 
                          className="text-sm capitalize cursor-pointer"
                        >
                          {platform}
                        </Label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <Separator />
                
                {/* Budget Filter */}
                <div className="space-y-3">
                  <Label className="text-sm font-medium">Minimum Budget</Label>
                  <Select 
                    value={minBudget?.toString() || ''} 
                    onValueChange={(value) => setMinBudget(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Any budget" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">Any budget</SelectItem>
                      <SelectItem value="1000">1K+ sats</SelectItem>
                      <SelectItem value="10000">10K+ sats</SelectItem>
                      <SelectItem value="100000">100K+ sats</SelectItem>
                      <SelectItem value="1000000">1M+ sats</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </PopoverContent>
          </Popover>

          {/* Active Filters */}
          {selectedPlatforms.length > 0 && (
            <div className="flex items-center space-x-2">
              {selectedPlatforms.map(platform => (
                <Badge 
                  key={platform} 
                  variant="secondary" 
                  className="cursor-pointer"
                  onClick={() => handlePlatformToggle(platform)}
                >
                  {platform} ×
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Sort */}
        <div className="flex items-center space-x-2">
          <SortAsc className="h-4 w-4 text-muted-foreground" />
          <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest first</SelectItem>
              <SelectItem value="budget-high">Highest budget</SelectItem>
              <SelectItem value="budget-low">Lowest budget</SelectItem>
              <SelectItem value="ending-soon">Ending soon</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        Showing {sortedCampaigns.length} of {campaigns.length} campaigns
      </div>

      {/* Campaign Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedCampaigns.map((campaign) => (
          <CampaignCard
            key={campaign.id}
            campaign={campaign}
            showApplyButton
            onApply={handleApply}
          />
        ))}
      </div>

      {/* Apply Dialog */}
      {selectedCampaign && (
        <ApplyCampaignDialog
          campaign={selectedCampaign}
          open={showApplyDialog}
          onOpenChange={setShowApplyDialog}
        />
      )}
    </div>
  );
}