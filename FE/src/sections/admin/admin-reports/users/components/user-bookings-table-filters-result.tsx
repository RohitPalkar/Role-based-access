import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IBookingReportsTableFilters } from 'src/types/admin/feature/reports-user';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import { UnitStatusEnum, PaymentStatusEnum } from './reports-common';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IBookingReportsTableFilters>;
};

export function UserBookingsTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;
  const { brands } = useAppSelector((state) => state.common);
  const { projects } = useAppSelector((state) => state.common);
  const { rmList } = useAppSelector((state) => state.reportsUser);

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
      <FiltersBlock label="Brand:" isShow={!!currentFilters?.brandId}>
        <Chip
          {...chipProps}
          label={brands?.find((item) => item.id === Number(currentFilters?.brandId))?.name}
          onDelete={() => handleRemoveFilter('brandId')}
        />
      </FiltersBlock>

      {currentFilters?.projectIds && currentFilters?.projectIds.length > 0 && (
        <FiltersBlock label="Projects:" isShow={!!currentFilters?.projectIds}>
          {currentFilters?.projectIds.map((projectId: number) => {
            const project = projects?.find((item) => item.id === Number(projectId));
            return (
              <Chip
                key={projectId}
                {...chipProps}
                label={project?.name}
                onDelete={() => {
                  onResetPage();
                  updateFilters({ 
                    projectIds: currentFilters?.projectIds?.filter((id: number) => id !== projectId) 
                  });
                }}
              />
            );
          })}
        </FiltersBlock>
      )}

      <FiltersBlock label="RM:" isShow={!!currentFilters?.rmIds && currentFilters?.rmIds?.length > 0}>
        {currentFilters?.rmIds?.map((rmId: number) => {
          const rm = rmList?.find((item) => item.id === Number(rmId));
          return (
            <Chip
              key={rmId}
              {...chipProps}
              label={rm?.name}
              onDelete={() => {
                onResetPage();
                updateFilters({ rmIds: currentFilters?.rmIds?.filter((id: number) => id !== rmId) });
              }}
            />
          );
        })}
      </FiltersBlock>

      <FiltersBlock label="Unit Status:" isShow={!!currentFilters?.unitStatus}>
        <Chip
          {...chipProps}
          label={UnitStatusEnum?.find((item) => item.id === currentFilters?.unitStatus)?.name}
          onDelete={() => handleRemoveFilter('unitStatus')}
        />
      </FiltersBlock>

      <FiltersBlock label="Incentive Status:" isShow={!!currentFilters?.incentiveStatus}>
        <Chip
          {...chipProps}
          label={
            PaymentStatusEnum?.find((item) => item.id === currentFilters?.incentiveStatus)?.name
          }
          onDelete={() => handleRemoveFilter('incentiveStatus')}
        />
      </FiltersBlock>

      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip
          {...chipProps}
          label={currentFilters?.name}
          onDelete={() => handleRemoveKeyword('name')}
        />
      </FiltersBlock>
      <FiltersBlock label="Start Date:" isShow={!!currentFilters?.startDate}>
        <Chip
          {...chipProps}
          label={dayjs(currentFilters?.startDate).format('DD/MM/YYYY')}
          onDelete={() => handleRemoveFilter('startDate')}
        />
      </FiltersBlock>
      <FiltersBlock label="End Date:" isShow={!!currentFilters?.endDate}>
        <Chip
          {...chipProps}
          label={dayjs(currentFilters?.endDate).format('DD/MM/YYYY')}
          onDelete={() => handleRemoveFilter('endDate')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
