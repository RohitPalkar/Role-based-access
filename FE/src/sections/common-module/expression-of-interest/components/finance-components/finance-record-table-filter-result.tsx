import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ISelectOption } from 'src/types/admin/services/incetive';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { FinanceRecordTableFilters } from 'src/types/finance-admin/eoi-finance-record-details';

import React, { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<FinanceRecordTableFilters>;
  projectOptions: any;
  paymentStatusOptions: ISelectOption[];
};

export function FinanceRecordTableFiltersResult({ filters, onResetPage, totalResults, sx, projectOptions, paymentStatusOptions }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters || {};

  const handleRemoveKeyword = useCallback(() => {
    try {
      if (onResetPage) onResetPage();
      if (updateFilters) updateFilters({ search: '' });
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
      <FiltersBlock label="Project:" isShow={!!currentFilters?.projectIds && currentFilters?.projectIds?.length > 0}>
        {currentFilters?.projectIds?.map((projectIds: any) => {
          const project = projectOptions?.find((item: any) => item.userId.toString() === projectIds.toString());
          return (
            <Chip
              key={projectIds}
              {...chipProps}
              label={project?.userName || "Unknown"}
              onDelete={() => {
                onResetPage();
                updateFilters({
                  projectIds: currentFilters?.projectIds?.filter((id: any) => id !== projectIds),
                });
              }}
            />
          );
        })}
      </FiltersBlock>      
      <FiltersBlock label="Payment Status:" isShow={!!currentFilters?.paymentStatus}>
        <Chip
          {...chipProps}
          label={currentFilters?.paymentStatus || 'Unknown'}
          onDelete={() => handleRemoveFilters('paymentStatus')}
          sx={{ textTransform: 'capitalize' }}
        />
      </FiltersBlock>
      
      <FiltersBlock label="Start Date:" isShow={!!currentFilters?.startDate}>
        <Chip
          {...chipProps}
          label={currentFilters?.startDate?.format('DD/MM/YYYY') || ''}
          onDelete={() => handleRemoveFilters('startDate')}
          sx={{ textTransform: 'capitalize' }}
        />
      </FiltersBlock>
      <FiltersBlock label="End Date:" isShow={!!currentFilters?.endDate}>
        <Chip
          {...chipProps}
          label={currentFilters?.endDate?.format('DD/MM/YYYY') || ''}
          onDelete={() => handleRemoveFilters('endDate')}
          sx={{ textTransform: 'capitalize' }}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.search}>
        <Chip {...chipProps} label={currentFilters?.search || 'Unknown'} onDelete={handleRemoveKeyword} />
      </FiltersBlock>
    </FiltersResult>
  );
}
