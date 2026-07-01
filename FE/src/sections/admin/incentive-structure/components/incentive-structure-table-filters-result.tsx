import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IIncentiveStructureTableFilters } from 'src/types/admin/feature/incentive-structure';

import React, { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import type { ISelectOption } from './incentive-structure-table-toolbar';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IIncentiveStructureTableFilters>;
  brands: ISelectOption[];
};

export function IncentiveStructureTableFiltersResult({ filters, onResetPage, totalResults, sx, brands = [] }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters || {};

  const handleRemoveKeyword = useCallback(() => {
    try {
      if (onResetPage) onResetPage();
      if (updateFilters) updateFilters({ name: '' });
    } catch (error) {
      console.error(error);
    }
  }, [onResetPage, updateFilters]);

  const handleRemoveFilters = useCallback((name: string) => {
    try {
      if (updateFilters && name) updateFilters({ [name]: null });
      if (onResetPage) onResetPage();
    } catch (error) {
      console.error(error);
    }
  }, [onResetPage, updateFilters]);

  const handleReset = useCallback(() => {
    try {
      if (onResetPage) onResetPage();
      if (resetFilters) resetFilters();
    } catch (error) {
      console.error(error);
    }
  }, [onResetPage, resetFilters]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Brand:" isShow={!!currentFilters?.brand}>
        <Chip
          {...chipProps}

          label={(() => {
            try {
                        // @ts-ignore

              const foundBrand = brands?.find((item: { value: string, label: string }) => item?.value === currentFilters?.brand);
              return foundBrand?.label || currentFilters?.brand || 'Unknown';
            } catch (error) {
              console.error(error); 
              return currentFilters?.brand || 'Unknown';
            }
          })()}
          onDelete={() => handleRemoveFilters('brand')}
          sx={{
            ...chipProps.sx,
            textTransform: 'capitalize',
          }}
        />
      </FiltersBlock>
      
      <FiltersBlock label="Status:" isShow={!!currentFilters?.status}>
        <Chip
          {...chipProps}
          label={currentFilters?.status || 'Unknown'}
          onDelete={() => handleRemoveFilters('status')}
          sx={{
            ...chipProps.sx,
            textTransform: 'capitalize',
          }}
        />
      </FiltersBlock>
      
      <FiltersBlock label="Start Date:" isShow={!!currentFilters?.startDate}>
        <Chip
          {...chipProps}
          label={currentFilters?.startDate?.format('DD/MM/YYYY') || ''}
          onDelete={() => handleRemoveFilters('startDate')}
          sx={{
            ...chipProps.sx,
            textTransform: 'capitalize',
          }}
        />
      </FiltersBlock>
      <FiltersBlock label="End Date:" isShow={!!currentFilters?.endDate}>
        <Chip
          {...chipProps}
          label={currentFilters?.endDate?.format('DD/MM/YYYY') || ''}
          onDelete={() => handleRemoveFilters('endDate')}
          sx={{
            ...chipProps.sx,
            textTransform: 'capitalize',
          }}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip {...chipProps} label={currentFilters?.name || 'Unknown'} onDelete={handleRemoveKeyword} />
      </FiltersBlock>
    </FiltersResult>
  );
}
