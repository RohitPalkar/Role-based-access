import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ISelectOption } from 'src/types/admin/services/incetive';
import type { IProjectTableFilters } from 'src/types/admin/feature/project';
import type { ColumnManagerProps } from 'src/components/column-manager/types';

import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import {
  Button,
  Tooltip,
  useTheme,
  IconButton,
  useMediaQuery,
} from '@mui/material';

import { normalizeValue, CapitalizeFirstLetter } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IProjectTableFilters>;
  getLists: (value: any) => void;
  columnManager?: ColumnManagerProps;
  options: {
    brand: ISelectOption[];
    city: ISelectOption[];
    billingEntity: ISelectOption[];
  };
}>;

export function ProjectTableToolbar({ filters, onResetPage, getLists, columnManager, options }: Props) {
  const filterMenuActions = usePopover();

  const { state: currentFilters, setState: updateFilters } = filters;
  const [filterState, setFilterState] = useState(currentFilters);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  useEffect(() => {
    setFilterState(currentFilters);
  }, [currentFilters]);


  const handleFilter = useCallback(
    (name: 'brand' | 'city' | 'billingEntity', value: string | null) => {
      onResetPage();
      if (name === 'brand') {
        setFilterState((pre) => ({ ...pre, [name]: value, city: null, billingEntity: null }));
      } else if (name === 'city') {
        setFilterState((pre) => ({ ...pre, [name]: value, billingEntity: null }));
      } else setFilterState((pre) => ({ ...pre, [name]: value }));
    },
    [onResetPage, setFilterState]
  );

  const handleOnReset = useCallback(() => {
    const resetState = { billingEntity: null, city: null, brand: null };
    setFilterState((prev) => ({ ...prev, ...resetState }));
    updateFilters(resetState);
    onResetPage();
  }, [updateFilters, onResetPage]);

  const handleApply = () => {
    updateFilters(filterState);
  };



  const renderFilterMenuActions = () => (
    <FilterToolbar menuActions={filterMenuActions} onReset={handleOnReset} onApply={handleApply}>
      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 350 } }}>
        <ControlledAutocomplete
          label="Brand"
          value={filterState.brand ?? ''}
          options={
            options?.brand?.map((option) => ({
              value: String(option?.value) || '',
              label: CapitalizeFirstLetter(option?.label) || '',
            })) || []
          }
          onChange={(val) => handleFilter('brand', normalizeValue(val, false))}
        />
      </Box>

      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 350 } }}>
        <ControlledAutocomplete
          label="City"
          value={filterState.city ?? ''}
          options={
            options?.city?.map((option) => ({
              value: String(option?.value) || '',
              label: CapitalizeFirstLetter(option?.label) || '',
            })) || []
          }
          onChange={(val) => handleFilter('city', normalizeValue(val, false))}
        />
      </Box>
      {/* Uncomment if billing entity filter is needed */}
      {/* <SelectWithClear
        label="Billing Entity"
        value={filterState.billingEntity}
        options={options?.billingEntity?.map((option) => ({
          value: option.value,
          label: CapitalizeFirstLetter(option.label)
        })) || []}
        onChange={(event) => handleFilter(event as any)}
        onClear={() => handleClearFilter('billingEntity')}
        name="billingEntity"
        formControlProps={{ sx: { flexShrink: 0, width: { xs: 1, md: 350 } } }}
        MenuProps={{ PaperProps: { sx: { maxHeight: 240 } } }}
      /> */}
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
            placeholder="Search by Project Name"
            onChange={(value) => {
              onResetPage();
              updateFilters({ name: value });
            }}
          />

          <Tooltip title="Filters">
            {isMobile ? (
              <IconButton onClick={filterMenuActions.onOpen}>
                <Iconify icon="material-symbols:filter-list" />
              </IconButton>
            ) : (
              <Button
                onClick={filterMenuActions.onOpen}
                startIcon={<Iconify icon="material-symbols:filter-list" />}
                sx={{
                  whiteSpace: 'nowrap',
                  minWidth: 'auto',
                }}
              >
                Filters
              </Button>
            )}
          </Tooltip>

          {/* Column Manager */}
          {columnManager?.columns && <ColumnManager {...columnManager} />}
        </Box>
      </Box>
      {renderFilterMenuActions()}
    </>
  );
}
