import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IAgreementListTableFilters } from 'src/types/crm/agreement';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IAgreementListTableFilters>;
};

function formatDateOnly(dateString: string): string {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AgreementTableFiltersResult({ filters, onResetPage, totalResults, sx }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters;

  // Reset all filters
  const handleReset = useCallback(() => {
    updateFilters({
      name: '',
      projectName: '',
      documentStatus: '',
      crmUser: '',
      internalSignatory: '',
      documentType: '',
      startDate: '',
      enddate: '',
    });
  }, [updateFilters]);

  // Individual removers
  const handleRemove = useCallback(
    (key: keyof IAgreementListTableFilters) => {
      onResetPage();
      updateFilters({ [key]: '' } as Partial<IAgreementListTableFilters>);
    },
    [onResetPage, updateFilters]
  );

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      {/* Name Filter */}
      <FiltersBlock label="Keyword:" isShow={!!currentFilters?.name}>
        <Chip {...chipProps} label={currentFilters?.name} onDelete={() => handleRemove('name')} />
      </FiltersBlock>

      {/* Project Name */}
      <FiltersBlock label="Project:" isShow={!!currentFilters?.projectName}>
        <Chip
          {...chipProps}
          label={currentFilters?.projectName}
          onDelete={() => handleRemove('projectName')}
        />
      </FiltersBlock>

      {/* Document Status */}
      <FiltersBlock label="Cx Sign Status:" isShow={!!currentFilters?.documentStatus}>
        <Chip
          {...chipProps}
          label={currentFilters?.documentStatus}
          onDelete={() => handleRemove('documentStatus')}
        />
      </FiltersBlock>

      {/* CRM User */}
      <FiltersBlock label="CRM User:" isShow={!!currentFilters?.crmUser}>
        <Chip
          {...chipProps}
          label={currentFilters?.crmUser?.name}
          onDelete={() => handleRemove('crmUser')}
        />
      </FiltersBlock>

      {/* Internal Signatory */}
      <FiltersBlock label="Signatory:" isShow={!!currentFilters?.internalSignatory}>
        <Chip
          {...chipProps}
          label={currentFilters?.internalSignatory?.name}
          onDelete={() => handleRemove('internalSignatory')}
        />
      </FiltersBlock>

      {/* Document Type */}
      <FiltersBlock label="Document Type:" isShow={!!currentFilters?.documentType}>
        <Chip
          {...chipProps}
          label={currentFilters?.documentType}
          onDelete={() => handleRemove('documentType')}
        />
      </FiltersBlock>

      {/* Start Date */}
      <FiltersBlock label="Start Date:" isShow={!!currentFilters?.startDate}>
        <Chip
          {...chipProps}
          label={formatDateOnly(currentFilters?.startDate)}
          onDelete={() => handleRemove('startDate')}
        />
      </FiltersBlock>

      {/* End Date */}
      <FiltersBlock label="End Date:" isShow={!!currentFilters?.enddate}>
        <Chip
          {...chipProps}
          label={formatDateOnly(currentFilters?.enddate)}
          onDelete={() => handleRemove('enddate')}
        />
      </FiltersBlock>
    </FiltersResult>
  );
}
