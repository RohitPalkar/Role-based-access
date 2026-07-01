import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { EmployeeListTableFilters } from 'src/types/finance-admin/employee-list';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<EmployeeListTableFilters>;
};

export function EmployeeListFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;


  const handleRemoveFilter = useCallback(
    (name: string) => {
      onResetPage();
      updateFilters({ [name]: '' });
    },
    [onResetPage, updateFilters]
  );

  const handleReset = useCallback(() => {
    onResetPage();
    resetFilters();
  }, [onResetPage, resetFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip
          {...chipProps}
          label={currentFilters?.name}
          onDelete={() => handleRemoveFilter('name')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
