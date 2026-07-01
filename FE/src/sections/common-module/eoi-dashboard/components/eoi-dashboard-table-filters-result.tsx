import type { FiltersResultProps } from 'src/components/filters-result';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import type { IEOIFilters } from './eoi-dashboard-table-toolbar';

type Props = FiltersResultProps & {
  filters: IEOIFilters;
  onResetFilters: () => void;
  onRemoveFilter: (filterName: keyof IEOIFilters) => void;
  onRemoveViewByItem: (updatedViewBy: string[] | null) => void;
  viewByOptions: Array<{ label: string; value: string }>;
  campaignOptions: Array<{ label: string; value: string }>;
};

export function EOIDashboardTableFiltersResult({
  filters,
  onResetFilters,
  onRemoveFilter,
  onRemoveViewByItem,
  totalResults,
  sx,
  viewByOptions,
  campaignOptions,
}: Props) {
  const { unitTypes: unitTypeOptions } = useAppSelector((state) => state.expressonOfInterest);

  const handleRemoveFilter = useCallback(
    (name: keyof IEOIFilters) => {
      onRemoveFilter(name);
      if (name === 'campaign') {
        onRemoveFilter('unitType');
      }
    },
    [onRemoveFilter]
  );

  const handleRemoveViewByFilter = useCallback(
    (userId: string) => {
      if (!filters?.viewBy) return;
      const updatedViewBy = filters?.viewBy?.filter((id) => id !== userId);
      onRemoveViewByItem(updatedViewBy.length > 0 ? updatedViewBy : null);
    },
    [filters?.viewBy, onRemoveViewByItem]
  );

  const handleReset = useCallback(() => {
    onResetFilters();
  }, [onResetFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      {/* View By */}
      <FiltersBlock label="View By:" isShow={!!filters?.viewBy && filters?.viewBy.length > 0}>
        {filters?.viewBy?.map((val) => {
          const user = viewByOptions?.find((opt) => opt?.value === val);
          return (
            <Chip
              key={val}
              {...chipProps}
              label={user?.label || val}
              onDelete={() => handleRemoveViewByFilter(val)}
            />
          );
        })}
      </FiltersBlock>

      {/* Campaign */}
      <FiltersBlock label="Campaign:" isShow={!!filters?.campaign}>
        <Chip
          {...chipProps}
          label={
            campaignOptions?.find((opt) => opt?.value === filters?.campaign)?.label ||
            filters?.campaign
          }
          onDelete={() => handleRemoveFilter('campaign')}
        />
      </FiltersBlock>

      {/* Unit Type */}
      <FiltersBlock label="Unit Type:" isShow={!!filters?.unitType}>
        <Chip
          {...chipProps}
          label={
            unitTypeOptions?.find((opt) => opt?.value === filters?.unitType)?.label ||
            filters?.unitType
          }
          onDelete={() => handleRemoveFilter('unitType')}
        />
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
