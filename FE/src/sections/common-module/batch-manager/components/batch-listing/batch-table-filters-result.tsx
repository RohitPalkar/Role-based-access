import type { Theme, SxProps } from '@mui/material/styles';

import React, { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import uiText from 'src/locales/langs/en/common.json';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

type Props = Readonly<{
  search: string;
  setSearch: (value: string) => void;
  totalResults: number;
  onResetPage?: () => void;
  sx?: SxProps<Theme>;
}>;

export function BatchTableFiltersResult({ search, setSearch, totalResults, onResetPage, sx }: Props) {
  const handleRemoveSearch = useCallback(() => {
    onResetPage?.();
    setSearch('');
  }, [onResetPage, setSearch]);

  const handleResetAll = useCallback(() => {
    onResetPage?.();
    setSearch('');
  }, [onResetPage, setSearch]);

  return (
    <FiltersResult totalResults={totalResults} onReset={handleResetAll} sx={sx}>
      <FiltersBlock label={`${uiText.common.keyword}:`} isShow={!!search}>
        <Chip {...chipProps} label={search} onDelete={handleRemoveSearch} />
      </FiltersBlock>
    </FiltersResult>
  );
}
