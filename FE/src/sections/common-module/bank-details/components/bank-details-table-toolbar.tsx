import React from 'react';

import { Box } from '@mui/material';

import { ColumnManager } from 'src/components/column-manager';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';

interface BankDetailsToolbarProps {
  search: string;
  columnManager: any;
  onResetPage: () => void;
  setSearch: (value: string) => void;
}

const BankDetailsTableToolbar: React.FC<BankDetailsToolbarProps> = ({
  search,
  setSearch,
  columnManager,
  onResetPage,
}) => (
  <Box
    sx={{
      p: 1.5,
      gap: 1,
      display: 'flex',
      pr: { xs: 1.5, md: 0.5 },
      flexDirection: { xs: 'column', sm: 'row' },
      alignItems: { xs: 'flex-end', sm: 'center' },
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
      {/* Search */}
      <SearchInput
        value={search}
        placeholder="Search By Bank Name"
        onChange={(value) => {
          setSearch(value);
          onResetPage();
        }}
      />
    </Box>
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
      {columnManager && <ColumnManager {...columnManager} />}
    </Box>
  </Box>
);

export default BankDetailsTableToolbar;
