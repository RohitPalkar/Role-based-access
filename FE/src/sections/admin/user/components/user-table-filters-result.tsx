import type { RootState } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IUserTableFilters } from 'src/types/admin/feature/user';
import type { FiltersResultProps } from 'src/components/filters-result';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { CapitalizeFirstLetter } from 'src/utils/helper';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IUserTableFilters>;
};

export function UserTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;
  const { brands } = useAppSelector((state) => state.common);
  const { groups } = useAppSelector((state: RootState) => state.userlist);
  const { roles } = useAppSelector((state: RootState) => state.userlist);

  const handleRemoveKeyword = useCallback(
    (name: string) => {
      onResetPage();
      updateFilters({ [name]: '' });
    },
    [onResetPage, updateFilters]
  );

  const handleRemoveFilter = useCallback(
    (name: string) => {
      onResetPage();
      updateFilters({ [name]: null });
    },
    [onResetPage, updateFilters]
  );

  const handleReset = useCallback(() => {
    onResetPage();
    resetFilters();
  }, [onResetPage, resetFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Role:" isShow={!!currentFilters?.role && currentFilters?.role !== 'all'}>
        <Chip
          {...chipProps}
          label={roles.find((item) => item.id === Number(currentFilters?.role))?.name}
          onDelete={() => handleRemoveFilter('role')}
        />
      </FiltersBlock>

      <FiltersBlock label="Brand:" isShow={!!currentFilters?.brand}>
        <Chip
          {...chipProps}
          label={brands.find((item) => item.id === Number(currentFilters?.brand))?.name}
          onDelete={() => handleRemoveFilter('brand')}
        />
      </FiltersBlock>

      <FiltersBlock label="User Group:" isShow={!!currentFilters?.group}>
        {Array.isArray(groups) && (
          <Chip
            {...chipProps}
            label={groups.find((item: any) => item.id === Number(currentFilters?.group))?.name}
            onDelete={() => handleRemoveFilter('group')}
          />
        )}
      </FiltersBlock>

      <FiltersBlock label="Status:" isShow={!!currentFilters?.status}>
        <Chip
          {...chipProps}
          label={CapitalizeFirstLetter(currentFilters?.status || '')}
          onDelete={() => handleRemoveFilter('status')}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip
          {...chipProps}
          label={currentFilters?.name}
          onDelete={() => handleRemoveKeyword('name')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
