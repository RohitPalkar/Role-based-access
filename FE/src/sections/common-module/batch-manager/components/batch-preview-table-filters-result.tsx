import type { Theme, SxProps } from '@mui/material/styles';
import type { FiltersResultProps } from 'src/components/filters-result';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import uiText from 'src/locales/langs/en/common.json';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import type { BatchPreviewFilters } from './batch-preview-toolbar';

type Props = FiltersResultProps & {
  filters: BatchPreviewFilters;
  search: string;
  setSearch: (value: string) => void;
  onResetFilters: () => void;
  onResetPage?: () => void;
  sx?: SxProps<Theme>;
  onRemoveFilter: (filterName: keyof BatchPreviewFilters, value: string[] | null) => void;
};

export function BatchPreviewTableFiltersResult({
  search,
  filters,
  onResetFilters,
  onRemoveFilter,
  setSearch,
  totalResults,
  onResetPage,
  sx,
}: Props) {
  const handleRemoveSearch = useCallback(() => {
    onResetPage?.();
    setSearch('');
  }, [onResetPage, setSearch]);

  const handleReset = useCallback(() => {
    onResetPage?.();
    setSearch('');
    onResetFilters();
  }, [onResetPage, setSearch, onResetFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label={`${uiText.common.keyword}:`} isShow={!!search}>
        <Chip {...chipProps} label={search} onDelete={handleRemoveSearch} />
      </FiltersBlock>

      <FiltersBlock label={`${uiText.common.startDate}: `} isShow={!!filters?.startDate}>
        <Chip
          {...chipProps}
          label={dayjs(filters?.startDate).format('DD/MM/YYYY')}
          onDelete={() => {
            onRemoveFilter('startDate', null);
            onRemoveFilter('endDate', null);
          }}
        />
      </FiltersBlock>

      <FiltersBlock label={`${uiText.common.endDate}: `} isShow={!!filters?.endDate}>
        <Chip
          {...chipProps}
          label={dayjs(filters?.endDate).format('DD/MM/YYYY')}
          onDelete={() => {
            onRemoveFilter('startDate', null);
            onRemoveFilter('endDate', null);
          }}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
