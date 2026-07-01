import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IReportsTableFilters } from 'src/types/admin/feature/reports';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IReportsTableFilters>;
};

export function ReportsTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;
  
  const handleYearUpdate = useCallback(() => {
    onResetPage();
    updateFilters({ year: '2025'});
  }, [onResetPage, updateFilters]);

  const handleReset = useCallback(() => {
    onResetPage();
    resetFilters();
  }, [onResetPage, resetFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Year:" isShow={!!currentFilters?.year}>
        <Chip {...chipProps} label={currentFilters?.year} onDelete={handleYearUpdate} />
      </FiltersBlock>
    </FiltersResult>
  );
}
