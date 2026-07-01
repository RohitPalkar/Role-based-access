import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { CampaignTableFilters } from 'src/types/eoi/eoi';
import type { FiltersResultProps } from 'src/components/filters-result';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<CampaignTableFilters>;
};

export function CampaignTableFiltersResult({
  filters,
  onResetPage,
  totalResults,
  sx,
}: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const initialEmpty: CampaignTableFilters = {
    search: '',
    projectStatus: [],
    city: [],
  };

  // Remove "Search" filter
  const handleRemoveName = useCallback(() => {
    onResetPage();
    updateFilters({ search: '' });
  }, [onResetPage, updateFilters]);

  // Remove "Project Status" filter
  const handleProjectRemove = useCallback(() => {
    updateFilters({ projectStatus: [] });
  }, [updateFilters]);

  // Remove "City" filter
  const handleCityRemove = useCallback(() => {
    updateFilters({ city: [] });
  }, [updateFilters]);

  // Reset all filters
  const handleReset = useCallback(() => {
    updateFilters(initialEmpty);
    onResetPage();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateFilters, onResetPage]);

  const projectSelectedStatus =
    Array.isArray(currentFilters?.projectStatus)
      ? currentFilters.projectStatus.map((project: any) => project?.label)?.join(', ')
      : currentFilters?.projectStatus || '';

  const citySelectedStatus =
    Array.isArray(currentFilters?.city)
      ? currentFilters?.city?.map((city: any) => city?.label)?.join(', ')
      : currentFilters?.city || '';

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      {/* Search Filter */}
      <FiltersBlock label="Search:" isShow={!!currentFilters?.search}>
        <Chip {...chipProps} label={currentFilters?.search} onDelete={handleRemoveName} />
      </FiltersBlock>

      {/* Project Status Filter */}
      <FiltersBlock
        label="Project Status:"
        isShow={currentFilters?.projectStatus?.length!==0}
      >
        <Chip {...chipProps} label={projectSelectedStatus} onDelete={handleProjectRemove} />
      </FiltersBlock>

      {/* City Filter */}
      <FiltersBlock label="City:" isShow={currentFilters?.city?.length!==0}>
        <Chip {...chipProps} label={citySelectedStatus} onDelete={handleCityRemove} />
      </FiltersBlock>
    </FiltersResult>
  );
}
