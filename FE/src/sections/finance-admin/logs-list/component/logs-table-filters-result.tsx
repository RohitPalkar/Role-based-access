import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ILogsTableFilters } from 'src/types/admin/feature/logs';
import type { FiltersResultProps } from 'src/components/filters-result';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<ILogsTableFilters>;
};

export function LogsTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters || {};

  const handleRemoveKeyword = useCallback(
    (name: string) => {
      if (onResetPage) onResetPage();
      if (updateFilters) updateFilters({ [name]: '' });
    },
    [onResetPage, updateFilters]
  );

  const handleRemoveFilter = useCallback(
    (name: string) => {
      if (onResetPage) onResetPage();
      if (updateFilters) updateFilters({ [name]: null });
    },
    [onResetPage, updateFilters]
  );

  const handleReset = useCallback(() => {
    if (updateFilters) updateFilters({ startDate: null, endDate: null, name: null, status: '' });
    if (onResetPage) onResetPage();
    if (resetFilters) resetFilters();
  }, [onResetPage, resetFilters, updateFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Status" isShow={!!currentFilters?.status}>
        <Chip
          {...chipProps}
          label={currentFilters?.status || 'Unknown'}
          onDelete={() => handleRemoveFilter('status')}
        />
      </FiltersBlock>

      <FiltersBlock label="From " isShow={!!currentFilters?.startDate}>
        <Chip
          {...chipProps}
          label={
            currentFilters?.startDate && dayjs(currentFilters.startDate).isValid()
              ? dayjs(currentFilters.startDate).format('DD/MM/YYYY')
              : 'Unknown date'
          }
          onDelete={() => handleRemoveFilter('startDate')}
        />
      </FiltersBlock>

      <FiltersBlock label="To" isShow={!!currentFilters?.endDate}>
        <Chip
          {...chipProps}
          label={
            currentFilters?.endDate && dayjs(currentFilters.endDate).isValid()
              ? dayjs(currentFilters.endDate).format('DD/MM/YYYY')
              : 'Unknown date'
          }
          onDelete={() => handleRemoveFilter('endDate')}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip
          {...chipProps}
          label={currentFilters?.name || 'Unknown'}
          onDelete={() => handleRemoveKeyword('name')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
