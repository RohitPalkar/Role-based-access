import type { RootState } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IProjectTableFilters } from 'src/types/admin/feature/project';

import { useCallback } from 'react';
import { useSelector } from 'react-redux';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------
interface BillingEntity {
  id: number;
  name: string;
}
type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IProjectTableFilters>;
};

export function ProjectTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;
  const { brands } = useAppSelector((state) => state.common);
  const { cities } = useAppSelector((state) => state.common);
  const billingEntities = useSelector(
    (state: RootState) => state.project.billingEntites
  ) as BillingEntity[];

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
      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip
          {...chipProps}
          label={currentFilters?.name}
          onDelete={() => handleRemoveKeyword('name')}
        />
      </FiltersBlock>
      
      <FiltersBlock label="Brand:" isShow={!!currentFilters?.brand}>
        <Chip
          {...chipProps}
          label={brands?.find((item) => item.id === Number(currentFilters?.brand))?.name}
          onDelete={() => handleRemoveFilter('brand')}
        />
      </FiltersBlock>

      <FiltersBlock label="City:" isShow={!!currentFilters?.city}>
        <Chip
          {...chipProps}
          label={cities?.find((item) => String(item.id) === currentFilters?.city)?.name}
          onDelete={() => handleRemoveFilter('city')}
        />
      </FiltersBlock>

      <FiltersBlock label="Billing Entity:" isShow={!!currentFilters?.billingEntity}>
        <Chip
          {...chipProps}
          label={
            billingEntities?.find(
              (item: { id: number; name: string }) =>
                item.id === Number(currentFilters?.billingEntity)
            )?.name
          }
          onDelete={() => handleRemoveFilter('billingEntity')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
