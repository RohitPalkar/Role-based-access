import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IgreTablelistTableFilters } from 'src/types/gre/grelist';
import type { FiltersResultProps } from 'src/components/filters-result';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';


type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IgreTablelistTableFilters>;
  greTablelist: any[];
};

export function GreTableFiltersResult({
  filters,
  onResetPage,
  totalResults,
  sx,
  greTablelist,
}: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  const handleRemoveFilter = useCallback(
    (key: keyof IgreTablelistTableFilters) => {
      onResetPage();
      updateFilters({ ...currentFilters, [key]: '' });
    },
    [onResetPage, updateFilters, currentFilters]
  );

  const handleRemoveName = useCallback(() => {
    handleRemoveFilter('name');
  }, [handleRemoveFilter]);

  const handleRemoveId = useCallback(() => {
    handleRemoveFilter('id');
  }, [handleRemoveFilter]);

  const handleRemoveProject = useCallback(() => {
    handleRemoveFilter('projectName');
  }, [handleRemoveFilter]);

  const handleRemoveSourcingRm = useCallback(() => {
    handleRemoveFilter('sourcingRm');
  }, [handleRemoveFilter]);

  const handleRemoveDateFilter = useCallback(
    (key: 'startDate' | 'endDate') => {
      onResetPage();
      updateFilters({ ...currentFilters, [key]: null });
    },
    [onResetPage, updateFilters, currentFilters]
  );

  const handleRemoveDateRange = useCallback(() => {
    onResetPage();
    updateFilters({ ...currentFilters, startDate: null, endDate: null });
  }, [onResetPage, updateFilters, currentFilters]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString();
  };

  const handleReset = useCallback(() => {
    onResetPage();
    updateFilters({
      name: '',
      id: '',
      projectName: '',
      sourcingRm: "",
      startDate: null,
      endDate: null,
    });
  }, [onResetPage, updateFilters]);

  const hasDateRange = !!currentFilters?.startDate && !!currentFilters?.endDate;

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      {/* Name Filter */}
      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip {...chipProps} label={currentFilters?.name} onDelete={handleRemoveName} />
      </FiltersBlock>

      {/* Enquiry ID Filter */}
      <FiltersBlock label="Enquiry ID:" isShow={!!currentFilters?.id}>
        <Chip {...chipProps} label={currentFilters?.id} onDelete={handleRemoveId} />
      </FiltersBlock>

      {/* Campaign Filter */}
      <FiltersBlock label="Project:" isShow={!!currentFilters?.projectName}>
        <Chip {...chipProps} label={currentFilters?.projectName} onDelete={handleRemoveProject} />
      </FiltersBlock>

      <FiltersBlock label="Sourcing RM:" isShow={!!currentFilters?.sourcingRm}>
        <Chip
          {...chipProps}
          label={(currentFilters?.sourcingRm as any)?.label || 'Sourcing RM'}
          onDelete={handleRemoveSourcingRm}
        />
      </FiltersBlock>
      {/* Date Range Filter */}
      <FiltersBlock label="Date Range:" isShow={hasDateRange}>
        <Chip
          {...chipProps}
          label={`${formatDate(currentFilters?.startDate)} - ${formatDate(currentFilters?.endDate)}`}
          onDelete={handleRemoveDateRange}
        />
      </FiltersBlock>

      {/* Individual Date Filters (if only one is set) */}
      <FiltersBlock label="Start Date:" isShow={!!currentFilters?.startDate && !hasDateRange}>
        <Chip
          {...chipProps}
          label={`From: ${formatDate(currentFilters?.startDate)}`}
          onDelete={() => handleRemoveDateFilter('startDate')}
        />
      </FiltersBlock>

      <FiltersBlock label="End Date:" isShow={!!currentFilters?.endDate && !hasDateRange}>
        <Chip
          {...chipProps}
          label={`To: ${formatDate(currentFilters?.endDate)}`}
          onDelete={() => handleRemoveDateFilter('endDate')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}