import React from 'react';

import { Box , TextField, InputAdornment } from '@mui/material';

import { useDebounceMethod } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';
import { ColumnManager } from 'src/components/column-manager';

interface UserDetailsToolbarProps {
  search: string;
  setSearch: (value: string) => void;
  columnManager: any;
}

export const UserDetailsToolbar: React.FC<UserDetailsToolbarProps> = ({
  search,
  setSearch,
  columnManager,
}) => {
  // Debounced search handling
  const [localSearch, setLocalSearch] = React.useState(search);
  React.useEffect(() => {
    setLocalSearch(search);
  }, [search]);         // For actions (Export, etc.)
  const debouncedSetSearch = useDebounceMethod((value: string) => setSearch(value), 500);

  return (
    <Box
      sx={{
        display: 'flex',
        gap: 2,
        my: 2,
        ml: 2,
        alignItems: 'center',
        position: 'relative',
      }}
    >
      {/* Search */}
      <TextField
        placeholder="Search By Group Name"
        value={localSearch}
        size="small"
        onChange={(e) => {
          const val = e.target.value?.replaceAll(/[^A-Za-z]/g, "")?.trim();
          setLocalSearch(val);
          debouncedSetSearch(val);
        }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <Iconify
                icon="eva:search-fill"
                sx={{ color: 'text.disabled', width: 18, height: 18 }}
              />
            </InputAdornment>
          ),
        }}
        sx={{
          height: '36px',
          flexGrow: 1,
          minWidth: 200,
          '& .MuiOutlinedInput-root': {
            height: '36px',
            fontSize: '0.875rem',
          },
        }}
      />

      {/* Column Manager */}
      {columnManager && <ColumnManager {...columnManager} />}  
    </Box>
  );
};
