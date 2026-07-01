import type { Theme, SxProps } from '@mui/material/styles';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import type { CPFilters } from './channel-partner-toolbar';

type Props = {
  filters: CPFilters;
  search: string;
  createdByOptions: Array<{ label: string; value: string }>;
  campaignOptions: Array<{ label: string; value: string }>;
  setSearch: (value: string) => void;
  onResetFilters: () => void;
  totalResults: number;
  onResetPage?: () => void;
  sx?: SxProps<Theme>;
  onRemoveFilter: (filterName: keyof CPFilters) => void;
  onRemoveCreatedByItem: (updatedViewBy: string[] | null) => void;
};

export function ChannelPartnerTableFiltersResult({
  search,
  filters,
  campaignOptions,
  createdByOptions,
  onResetFilters,
  onRemoveFilter,
  onRemoveCreatedByItem,
  setSearch,
  totalResults,
  onResetPage,
  sx,
}: Readonly<Props>) {
  const handleRemoveSearch = useCallback(() => {
    onResetPage?.();
    setSearch('');
  }, [onResetPage, setSearch]);

  const handleReset = useCallback(() => {
    onResetPage?.();
    setSearch('');
    onResetFilters();

  }, [onResetPage, setSearch, onResetFilters]);

  const handleRemoveCreatedByFilter = useCallback(
    (value: string) => {
      if (!filters?.createdBy) return;
      const updatedCreatedBy = filters?.createdBy?.filter((id) => id !== value);
      onRemoveCreatedByItem(updatedCreatedBy.length > 0 ? updatedCreatedBy : null);
    },
    [filters?.createdBy, onRemoveCreatedByItem]
  );

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Keyword:" isShow={!!search}>
        <Chip {...chipProps} label={search} onDelete={handleRemoveSearch} />
      </FiltersBlock>

      <FiltersBlock label="Campaign:" isShow={!!filters?.campaign}>
        <Chip
          {...chipProps}
          label={
            campaignOptions?.find((opt) => opt?.value === filters?.campaign)?.label ||
            filters?.campaign
          }
          onDelete={() => onRemoveFilter('campaign')}
        />
      </FiltersBlock>

      <FiltersBlock
        label="Created By:"
        isShow={!!filters?.createdBy && filters?.createdBy.length > 0}
      >
        {filters?.createdBy?.map((val) => {
          const user = createdByOptions?.find((opt) => opt?.value === val);
          return (
            <Chip
              key={val}
              {...chipProps}
              label={user?.label || val}
              onDelete={() => handleRemoveCreatedByFilter(val)}
            />
          );
        })}
      </FiltersBlock>

      <FiltersBlock label="Start Date:" isShow={!!filters?.startDate}>
        <Chip
          {...chipProps}
          label={dayjs(filters?.startDate).format('DD/MM/YYYY')}
          onDelete={() => {
            onRemoveFilter('startDate');
            onRemoveFilter('endDate');
          }}
        />
      </FiltersBlock>

      <FiltersBlock label="End Date:" isShow={!!filters?.endDate}>
        <Chip
          {...chipProps}
          label={dayjs(filters?.endDate).format('DD/MM/YYYY')}
          onDelete={() => {
            onRemoveFilter('startDate');
            onRemoveFilter('endDate');
          }}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
