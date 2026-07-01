import type { Theme, SxProps } from '@mui/material/styles';

import { useCallback } from 'react';

import Chip from '@mui/material/Chip';

import { chipProps, FiltersBlock, FiltersResult } from 'src/components/filters-result';

type Props = {
  search: string;
  setSearch: (value: string) => void;
  totalResults: number;
  onResetPage: () => void;
  sx?: SxProps<Theme>;
};
const BankDetailsFilterResult = ({
  search,
  setSearch,
  totalResults,
  onResetPage,
  sx,
}: Readonly<Props>) => {
  const handleReset = useCallback(() => {
    onResetPage();
    setSearch('');
  }, [onResetPage, setSearch]);

  const handleRemoveSearch = useCallback(() => {
    onResetPage();
    setSearch('');
  }, [onResetPage, setSearch]);
  return (
    <FiltersResult totalResults={totalResults} onReset={handleReset} sx={sx}>
      <FiltersBlock label="Keyword:" isShow={!!search}>
        <Chip {...chipProps} label={search} onDelete={handleRemoveSearch} />
      </FiltersBlock>
    </FiltersResult>
  );
};

export default BankDetailsFilterResult;
