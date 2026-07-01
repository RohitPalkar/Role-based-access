import React from 'react';

import { Box, TextField, InputAdornment } from '@mui/material';

import { useDebounceMethod } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';
import { ColumnManager } from 'src/components/column-manager';

type InvoiceTableToolbarProps = Readonly<{
  search: string;
  setSearch: (value: string) => void;
  columnManager: any;
}>;

export function InvoiceTableToolbar({
  search,
  setSearch,
  columnManager,
}: InvoiceTableToolbarProps) {
  const [localSearch, setLocalSearch] = React.useState(search);

  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  const debouncedSetSearch = useDebounceMethod((value: string) => setSearch(value), 500);

  return (
    <Box
      sx={{
        p: 1.5,
        gap: 1,
        display: 'flex',
        pr: { xs: 1.5, md: 0.5 },
        flexDirection: { xs: 'row', md: 'row' },
        alignItems: { xs: 'flex-end', md: 'center' },
        width: '100%',
      }}
    >
      <Box
        sx={{
          gap: 1,
          width: 1,
          flexGrow: 1,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <TextField
          placeholder={uiText.internalOfficeMemo.invoiceListing.searchPlaceholder}
          value={localSearch}
          size="small"
          onChange={(event) => {
            const inputValue = event.target.value;
            setLocalSearch(inputValue);
            debouncedSetSearch(inputValue);
          }}
          sx={{ flexGrow: 1, minWidth: 0 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {columnManager?.columns ? <ColumnManager {...columnManager} /> : null}
    </Box>
  );
}
