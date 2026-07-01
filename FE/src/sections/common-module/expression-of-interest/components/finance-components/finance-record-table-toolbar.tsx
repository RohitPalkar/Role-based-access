import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ISelectOption } from 'src/types/admin/services/incetive';
import type { FinanceRecordTableFilters } from 'src/types/finance-admin/eoi-finance-record-details';

import React, { useCallback } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import InputAdornment from '@mui/material/InputAdornment';

import { Iconify } from 'src/components/iconify';
import { ColumnManager } from 'src/components/column-manager';

// ----------------------------------------------------------------------

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<FinanceRecordTableFilters>;
  columnManager?: any;
  projectOptions: any;
  paymentStatusOptions: ISelectOption[];
}>;

export function FinanceRecordTableToolbar({ filters, onResetPage, columnManager }: Props) {
  const { state: currentFilters, setState: updateFilters } = filters || {};

  const handleFilterName = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      try {
        if (onResetPage) onResetPage();
        const value = event?.target?.value?.trim() || '';
        if (updateFilters) updateFilters({ search: value });
      } catch (error) {
        console.error(error);
      }
    },
    [onResetPage, updateFilters]
  );

  return (
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
        <TextField
          size="small"
          value={currentFilters?.search || ''}
          onChange={handleFilterName}
          placeholder="Search by Transaction ID & Receipt No."
          sx={{ flexGrow: 1, minWidth: 0 }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Iconify icon="eva:search-fill" sx={{ color: 'text.disabled' }} />
              </InputAdornment>
            ),
          }}
        />
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          {/* Column Manager */}
          {columnManager?.columns && Array.isArray(columnManager.columns) && (
            <ColumnManager {...columnManager} />
          )}
        </Box>
      </Box>
    </Box>
  );
}
