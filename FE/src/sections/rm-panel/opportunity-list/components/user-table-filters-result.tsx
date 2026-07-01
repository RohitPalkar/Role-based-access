import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IOpportunityListTableFilters } from 'src/types/rm-panel/user';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IOpportunityListTableFilters>;
};

export function UserTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;

  // Remove Name filter
  const handleRemoveName = useCallback(() => {
    onResetPage();
    updateFilters({ name: '' }); // Reset name filter
  }, [onResetPage, updateFilters]);

  // Remove ID filter

  // Reset all filters
  const handleReset = useCallback(() => {
    updateFilters({ name: '' }); // Reset name filter
    updateFilters({ id: '' }); // Reset ID filter
  }, [updateFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      {/* Name Filter */}
      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip {...chipProps} label={currentFilters?.name} onDelete={handleRemoveName} />
      </FiltersBlock>
    </FiltersResult>
  );
}
