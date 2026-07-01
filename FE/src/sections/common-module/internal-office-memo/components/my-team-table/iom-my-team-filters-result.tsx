import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { FiltersResultProps } from 'src/components/filters-result';
import type { IomMyTeamTableFilters } from 'src/sections/common-module/internal-office-memo/iom-config';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { useAppSelector } from 'src/hooks/use-redux';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

// ----------------------------------------------------------------------

type Props = FiltersResultProps & {
  onResetPage: () => void;
  filters: UseSetStateReturn<IomMyTeamTableFilters>;
};

export function IomMyTeamFiltersResult({
  filters,
  onResetPage,
  totalResults,
  sx,
}: Props) {
  const { iomDropdowns } = useAppSelector((state) => state.common);
  const { state: currentFilters, setState: updateFilters } = filters;

  const initialEmpty: IomMyTeamTableFilters = {
    search: '',
    status: null,
    project: [],
  };

  const handleRemove = useCallback(
    (key: keyof IomMyTeamTableFilters) => {
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

  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Search:" isShow={!!currentFilters.search}>
        <Chip
          {...chipProps}
          label={currentFilters.search}
          onDelete={() => handleRemove('search')}
        />
      </FiltersBlock>

      <FiltersBlock label="Status:" isShow={!!currentFilters.status}>
        <Chip
          {...chipProps}
          label={currentFilters.status || ''}
          onDelete={() => handleRemove('status')}
        />
      </FiltersBlock>

      <FiltersBlock label="Project:" isShow={currentFilters.project?.length > 0}>
        {currentFilters.project.map((projectId) => {
          const project = iomDropdowns?.projects?.find(
            (item) => String(item.value) === String(projectId)
          );

          return (
            <Chip
              key={projectId}
              {...chipProps}
              label={project?.label || projectId}
              onDelete={() => {
                onResetPage();
                updateFilters({
                  project: currentFilters.project.filter((p) => p !== projectId),
                });
              }}
            />
          );
        })}
      </FiltersBlock>
    </FiltersResult>
  );
}
