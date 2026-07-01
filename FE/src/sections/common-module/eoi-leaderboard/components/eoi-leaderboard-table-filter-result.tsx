import type { FiltersResultProps } from 'src/components/filters-result';
import type { DropdownOption } from 'src/services/rm-panel/eoi-service';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import uiText from 'src/locales/langs/en/common.json';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import type { LeaderboardFilters } from './eoi-leaderboard-table-toolbar';

type Props = FiltersResultProps & {
  filters: LeaderboardFilters;
  onResetFilters: () => void;
  onRemoveFilter: (filterName: keyof LeaderboardFilters, value: string[] | null) => void;
  campaignOptions: Array<{ label: string; value: string }>;
  rmNameOptions: Array<{ label: string; value: string }>;
  userGroupOptions: Array<{ label: string; value: string }>;
  cpNameOptions: DropdownOption[];
};

export function EOILeaderboardTableFiltersResult({
  filters,
  campaignOptions,
  cpNameOptions,
  rmNameOptions,
  userGroupOptions,
  onRemoveFilter,
  onResetFilters,
  totalResults,
  sx,
}: Props) {
  const handleReset = useCallback(() => {
    onResetFilters();
  }, [onResetFilters]);

  const handleRemoveFilter = useCallback(
    (key: 'campaign' | 'cpName' | 'rmName' | 'userGroup', value: string) => {
      const currentValue = filters?.[key];
      if (!currentValue) return;
      const updatedValue = currentValue.filter((id: string) => id !== value);
      onRemoveFilter(key, updatedValue.length > 0 ? updatedValue : null);
    },
    [filters, onRemoveFilter]
  );

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label={`${uiText.common.cpName}: `} isShow={!!filters?.cpName}>
        {filters?.cpName?.map((val) => {
          const user = cpNameOptions?.find((opt) => opt?.value === val);
          return (
            <Chip
              key={val}
              {...chipProps}
              label={user?.label || val}
              onDelete={() => handleRemoveFilter('cpName', val)}
            />
          );
        })}
      </FiltersBlock>
      <FiltersBlock label={`${uiText.eoiLeaderboard.filters.rmName}: `} isShow={!!filters?.rmName}>
        {filters?.rmName?.map((val) => {
          const user = rmNameOptions?.find((opt) => opt?.value === val);
          return (
            <Chip
              key={val}
              {...chipProps}
              label={user?.label || val}
              onDelete={() => handleRemoveFilter('rmName', val)}
            />
          );
        })}
      </FiltersBlock>
      <FiltersBlock label={`${uiText.common.campaign}: `} isShow={!!filters?.campaign}>
        {filters?.campaign?.map((val) => {
          const user = campaignOptions?.find((opt) => opt?.value === val);
          return (
            <Chip
              key={val}
              {...chipProps}
              label={user?.label || val}
              onDelete={() => handleRemoveFilter('campaign', val)}
            />
          );
        })}
      </FiltersBlock>
      <FiltersBlock label={`${uiText.eoiLeaderboard.filters.userGroup}: `} isShow={!!filters?.userGroup}>
        {filters?.userGroup?.map((val) => {
          const user = userGroupOptions?.find((opt) => opt?.value === val);
          return (
            <Chip
              key={val}
              {...chipProps}
              label={user?.label || val}
              onDelete={() => handleRemoveFilter('userGroup', val)}
            />
          );
        })}
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
