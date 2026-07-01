import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IomDropdowns } from 'src/types/admin/services/common';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IomTableFilters } from 'src/sections/common-module/internal-office-memo/iom-config';

import dayjs from 'dayjs';
import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import uiText from 'src/locales/langs/en/common.json';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IomTableFilters>;
  iomDropdowns?: IomDropdowns | null;
};

export function IomTableFiltersResult({
  filters,
  onResetPage,
  totalResults,
  iomDropdowns,
  sx,
}: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const initialEmpty: IomTableFilters = {
    iomStatus: [],
    search: '',
    project: [],
    invoiceStatus: [],
    pointsClassification: '',
    startDate: null,
    endDate: null,
  };

  // ---------------- REMOVE HANDLER ----------------
  const handleRemove = useCallback(
    (key: keyof IomTableFilters) => {
      onResetPage();
      updateFilters({ [key]: initialEmpty[key] });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [onResetPage, updateFilters]
  );

  const handleReset = useCallback(() => {
    updateFilters(initialEmpty);
    onResetPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateFilters, onResetPage]);

  const handleRemoveArrayItem = useCallback(
    (
      key: 'iomStatus' | 'project' | 'invoiceStatus',
      value: string
    ) => {
      onResetPage();
      updateFilters({
        [key]: currentFilters[key].filter((item) => item !== value),
      });
    },
    [currentFilters, onResetPage, updateFilters]
  );

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>

      {/* Search */}
      <FiltersBlock label="Search:" isShow={!!currentFilters.search}>
        <Chip
          {...chipProps}
          label={currentFilters.search}
          onDelete={() => handleRemove('search')}
        />
      </FiltersBlock>

      {/* IOM Status */}
      <FiltersBlock
        label="IOM Status:"
        isShow={currentFilters.iomStatus?.length > 0}
      >
        {currentFilters.iomStatus.map((status) => (
          <Chip
            key={status}
            {...chipProps}
            label={
              iomDropdowns?.IomStatus?.find((item) => String(item.value) === String(status))
                ?.label ?? status
            }
            onDelete={() => handleRemoveArrayItem('iomStatus', status)}
          />
        ))}
      </FiltersBlock>

      {/* Project */}
      <FiltersBlock
        label="Project:"
        isShow={currentFilters.project?.length > 0}
      >
        {currentFilters.project.map((projectId) => (
          <Chip
            key={projectId}
            {...chipProps}
            label={
              iomDropdowns?.projects?.find((item) => String(item.value) === String(projectId))
                ?.label ?? projectId
            }
            onDelete={() => handleRemoveArrayItem('project', projectId)}
          />
        ))}
      </FiltersBlock>

      {/* Invoice Status */}
      <FiltersBlock
        label="Invoice Status:"
        isShow={currentFilters.invoiceStatus?.length > 0}
      >
        {currentFilters.invoiceStatus.map((status) => (
          <Chip
            key={status}
            {...chipProps}
            label={
              iomDropdowns?.InvoiceStatus?.find((item) => String(item.value) === String(status))
                ?.label ?? status
            }
            onDelete={() => handleRemoveArrayItem('invoiceStatus', status)}
          />
        ))}
      </FiltersBlock>

      {/* Points Classification */}
      <FiltersBlock
        label="Points Classification:"
        isShow={Boolean(currentFilters.pointsClassification)}
      >
        <Chip
          {...chipProps}
          label={currentFilters.pointsClassification}
          onDelete={() => handleRemove('pointsClassification')}
        />
      </FiltersBlock>

      {/* Start Date */}
      <FiltersBlock
        label={`${uiText.common.startDate}:`}
        isShow={!!currentFilters.startDate}
      >
        <Chip
          {...chipProps}
          label={
            currentFilters.startDate && dayjs(currentFilters.startDate).isValid()
              ? dayjs(currentFilters.startDate).format('DD/MM/YYYY')
              : '-'
          }
          onDelete={() => {
            onResetPage();
            updateFilters({
              startDate: null,
              endDate: null,
            });
          }}
        />
      </FiltersBlock>

      {/* End Date */}
      <FiltersBlock
        label={`${uiText.common.endDate}:`}
        isShow={!!currentFilters.endDate}
      >
        <Chip
          {...chipProps}
          label={
            currentFilters.endDate && dayjs(currentFilters.endDate).isValid()
              ? dayjs(currentFilters.endDate).format('DD/MM/YYYY')
              : '-'
          }
          onDelete={() => {
            handleRemove('startDate');
            handleRemove('endDate');
          }}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}