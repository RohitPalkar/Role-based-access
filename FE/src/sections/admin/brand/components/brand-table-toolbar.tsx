import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IBrandsTableFilters } from 'src/types/admin/feature/brands';

import React, { useCallback } from 'react';

import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { Typography, FormControl } from '@mui/material';

import { usePopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';

// ----------------------------------------------------------------------
export interface ISelectOption {
  value: string | number;
  label: string;
}

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IBrandsTableFilters>;
  onApply: () => void;
  options: {
    salarymultiplier: ISelectOption[];
  };
}>;

export function BrandTableToolbar({ filters, onResetPage, onApply, options }: Props) {
  const filterMenuActions = usePopover();

  const { state: currentFilters, setState: updateFilters } = filters;

  const handleFilter = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const newValue = event.target.value;
      const { name } = event.target;
      onResetPage();
      updateFilters({ [name.toLowerCase().replaceAll(/\s+/g, '')]: newValue });
    },
    [onResetPage, updateFilters]
  );
  const handleOnReset = useCallback(() => {
    onResetPage();
    updateFilters({ salarymultiplier: null });
  }, [updateFilters, onResetPage]);



  const renderFilterMenuActions = () => (
    <FilterToolbar menuActions={filterMenuActions} onReset={handleOnReset} onApply={onApply}>
      <Box>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Edit
        </Typography>
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 350 } }}>
          <TextField
            value={currentFilters?.salarymultiplier ?? ''}
            onChange={handleFilter}
            placeholder="Enter Salary Multiplier"
            name="salarymultiplier"
            inputProps={{ id: 'filter-role-select' }}
            hiddenLabel
            id="outlined-textarea"
            label="Salary Multiplier"
            multiline
          />
        </FormControl>
      </Box>
    </FilterToolbar>
  );

  return (
    <>
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
            value={currentFilters?.name || ''}
            placeholder="Search by Brand Name"
            onChange={(value) => {
              onResetPage();
              updateFilters({ name: value });
            }}
          />
          {/* <Button
            onClick={filterMenuActions.onOpen}
            startIcon={<Iconify icon="material-symbols:filter-list" />}
          >
            Filters
          </Button> */}
        </Box>
      </Box>

      {renderFilterMenuActions()}
    </>
  );
}
