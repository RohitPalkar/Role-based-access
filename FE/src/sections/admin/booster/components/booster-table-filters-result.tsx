import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IBoosterTableFilters } from 'src/types/admin/feature/booster';

import dayjs from 'dayjs';
import React, { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IBoosterTableFilters>;
};

export function BoosterTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;

  const { brands, cities } = useAppSelector((state) => state.common);

  const handleRemoveKeyword = useCallback(
    (name: string) => {
      onResetPage();
      updateFilters({ [name]: '' });
    },
    [onResetPage, updateFilters]
  );

  const handleRemoveFilters = useCallback(
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
      <FiltersBlock label="Brand:" isShow={!!currentFilters?.brandId}>
        <Chip
          {...chipProps}
          label={brands.find((item) => item.id === Number(currentFilters?.brandId))?.name}
          onDelete={() => handleRemoveFilters('brandId')}
        />
      </FiltersBlock>

   <FiltersBlock label="City:" isShow={!!currentFilters?.cityId && currentFilters?.cityId?.length > 0}>
  {currentFilters?.cityId?.map((cityId: any) => {
    const city = cities?.find((item) => item.id.toString() === cityId.toString());
    return (
      <Chip
        key={cityId}
        {...chipProps}
        label={city?.name}
        onDelete={() => {
          onResetPage();
          updateFilters({
            cityId: currentFilters?.cityId?.filter((id: any) => id !== cityId),
          });
        }}
      />
    );
  })}
</FiltersBlock>


      <FiltersBlock label="Project:" isShow={!!currentFilters?.project}>
        <Chip
          {...chipProps}
          label={currentFilters?.project}
          onDelete={() => handleRemoveFilters('project')}
        />
      </FiltersBlock>

      <FiltersBlock label="Status:" isShow={!!currentFilters?.status}>
        <Chip
          {...chipProps}
          label={currentFilters?.status}
          onDelete={() => handleRemoveFilters('status')}
          sx={{ textTransform: 'capitalize' }}
        />
      </FiltersBlock>

      <FiltersBlock label="Start Date:" isShow={!!currentFilters?.startDate}>
        <Chip
          {...chipProps}
          label={dayjs(currentFilters?.startDate).format('DD/MM/YYYY')}
          onDelete={() => handleRemoveFilters('startDate')}
        />
      </FiltersBlock>

      <FiltersBlock label="End Date:" isShow={!!currentFilters?.endDate}>
        <Chip
          {...chipProps}
          label={dayjs(currentFilters?.endDate).format('DD/MM/YYYY')}
          onDelete={() => handleRemoveFilters('endDate')}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.projectName}>
        <Chip
          {...chipProps}
          label={currentFilters?.projectName}
          onDelete={() => handleRemoveKeyword('projectName')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
