import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { ILeaderBoardRMSummaryTableFilters } from 'src/types/admin/feature/leader-board-rmSummary';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

import { UnitStatusEnum, PaymentStatusEnum } from 'src/sections/admin/admin-reports/users/components/reports-common';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<ILeaderBoardRMSummaryTableFilters>;
};

export function LeaderBoardRMSummaryTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {

  const { state: currentFilters, setState: updateFilters, resetState: resetFilters } = filters;

  const { brands, cities } = useAppSelector((state) => state.common);
  const { projects } = useAppSelector((state) => state.common);

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

 

   <FiltersBlock label="City:" isShow={!!currentFilters?.cityIds && currentFilters?.cityIds?.length > 0}>
        {currentFilters?.cityIds?.map((cityIds: any) => {
          const city = cities?.find((item) => item.id.toString() === cityIds.toString());
          return (
            <Chip
              key={cityIds}
              {...chipProps}
              label={city?.name}
              onDelete={() => {
                onResetPage();
                updateFilters({
                  cityIds: currentFilters?.cityIds?.filter((id: any) => id !== cityIds),
                });
              }}
            />
          );
        })}
      </FiltersBlock>
      {currentFilters?.projectIds && currentFilters?.projectIds.length > 0 && (
        <FiltersBlock label="Projects:" isShow={!!currentFilters?.projectIds}>
          {currentFilters?.projectIds.map((projectId: any) => {
            const project = projects?.find(
              (item) => item.id.toString() === projectId || item.id.toString() === String(projectId)
            );
            return (
              <Chip
                key={projectId}
                {...chipProps}
                label={project?.name}
                onDelete={() => {
                  onResetPage();
                  updateFilters({
                    projectIds: currentFilters?.projectIds?.filter((id: any) => id !== projectId) 
                  });
                }}
              />
            );
          })}
        </FiltersBlock>
      )}


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
