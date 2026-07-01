import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IPhaseTableFilters } from 'src/types/admin/feature/phase';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IPhaseTableFilters>;
};

export function PhaseTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;
  const { brands } = useAppSelector((state) => state.common);
  const { cities } = useAppSelector((state) => state.common);

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

  const handleRemoveCityFilter = useCallback(
    (cityId: string) => {
      onResetPage();
      const updatedCities = currentFilters?.city?.filter(id => id !== cityId) || [];
      updateFilters({ city: updatedCities.length > 0 ? updatedCities : null });
    },
    [onResetPage, updateFilters, currentFilters?.city]
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
          label={
            brands?.find((item: { id: number }) => item.id === Number(currentFilters?.brand))?.name
          }
          onDelete={() => handleRemoveFilter('brand')}
        />
      </FiltersBlock>

      <FiltersBlock label="Cities:" isShow={!!currentFilters?.city && currentFilters.city.length > 0}>
        {currentFilters?.city?.map((cityId) => {
          const city = cities?.find((item: { id: string }) => String(item.id) === cityId);
          return (
            <Chip
              key={cityId}
              {...chipProps}
              label={city?.name || cityId}
              onDelete={() => handleRemoveCityFilter(cityId)}
            />
          );
        })}
      </FiltersBlock>
    </FiltersResult>
  );
}
