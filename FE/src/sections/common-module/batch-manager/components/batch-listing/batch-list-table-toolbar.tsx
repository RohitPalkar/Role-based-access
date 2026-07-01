import React from 'react';

import { Box } from '@mui/material';

import uiText from 'src/locales/langs/en/common.json'

import { ColumnManager } from 'src/components/column-manager';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';

type Props = {
  columnManager?: any;
  search: string;
  onSearchChange: (value: string) => void;
};

const BatchListToolbar = ({ columnManager, search, onSearchChange }: Props) =>
(
  <Box
    sx={{
      p: 1.5,
      gap: 1,
      display: 'flex',
      pr: { xs: 1.5, md: 0.5 },
      flexDirection: { xs: 'column', md: 'row' },
      alignItems: { xs: 'flex-end', md: 'center' },
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
      <SearchInput
        value={search}
        onChange={onSearchChange}

        placeholder={uiText.batchManager.searchPlaceholder}
      />

      {/* Column Manager */}
    </Box>        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>

      {columnManager && <ColumnManager {...columnManager} />}
    </Box>
  </Box>
);

export default BatchListToolbar;
