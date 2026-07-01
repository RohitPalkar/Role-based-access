import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IPhaseTableFilters } from 'src/types/admin/feature/phase';
import type { ColumnManagerProps } from 'src/components/column-manager/types';

import React, { useMemo, useState, useCallback } from 'react';

import Box from '@mui/material/Box';
import { Button } from '@mui/material';

import { CapitalizeFirstLetter } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

// ----------------------------------------------------------------------
export interface ISelectOption {
  value: string | number;
  label: string;
}

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IPhaseTableFilters>;
  columnManager?: ColumnManagerProps;
  options?: {
    brand?: ISelectOption[];
    city?: ISelectOption[];
  };
}>;

export function PhaseTableToolbar({ filters, onResetPage, columnManager, options }: Props) {
  const filterMenuActions = usePopover();

  const { state: currentFilters, setState: updateFilters } = filters;
  const [filterState, setFilterState] = useState(
    currentFilters ?? { name: '', brand: null, city: null }
  );

  // Sync filterState with currentFilters when they change
  React.useEffect(() => {
    setFilterState(currentFilters ?? { name: '', brand: null, city: null });
  }, [currentFilters]);

  const handleFilter = useCallback(
    (name: 'brand' | 'city', value: string | null | string[]) => {
      onResetPage();

      if (name === 'brand') {
        setFilterState((prev) => ({
          ...prev,
          brand: typeof value === 'string' ? value : null,
          city: null,
        }));
      } else {
        setFilterState((prev) => ({
          ...prev,
          city: Array.isArray(value) && value.length ? value : null,
        }));
      }
    },
    [onResetPage]
  );

  // Transform City options to match CustomMultiAutocomplete format
  const cityOptions = useMemo(
    () =>
      options?.city?.map((city) => ({
        label: CapitalizeFirstLetter(city.label),
        value: city.value.toString(),
      })) || [],
    [options?.city]
  );

  const handleOnReset = useCallback(() => {
    const resetState = { name: '', city: null, brand: null };
    setFilterState((prev) => ({ ...prev, ...resetState }));
    updateFilters(resetState);
    onResetPage();
  }, [updateFilters, onResetPage]);

  const handleApply = useCallback(() => {
    const safeFilterState = filterState ?? { name: '', brand: null, city: null };
    updateFilters(safeFilterState);
  }, [updateFilters, filterState]);

  const renderFilterMenuActions = () => (
    <FilterToolbar menuActions={filterMenuActions} onReset={handleOnReset} onApply={handleApply}>
      <ControlledAutocomplete
        label="Brand"
        value={filterState?.brand ?? ''}
        options={
          options?.brand?.map((option) => ({
            value: String(option?.value) || '',
            label: option?.label ?? '',
          })) || []
        }
        onChange={(value) => {
          handleFilter('brand', typeof value === 'string' ? value : null);
        }}
      />

      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 350 } }}>
        <ControlledAutocomplete
          multiple
          label="Cities"
          placeholder="Search and select cities"
          options={cityOptions}
          value={Array.isArray(filterState.city) ? filterState.city : []}
          onChange={(value) => {
            const cityValues = Array.isArray(value) ? (value as string[]) : [];
            handleFilter('city', cityValues);
          }}
          limitTags={2}
        />
      </Box>

      {/* Uncomment if billing entity filter is needed */}
      {/* <SelectWithClear
        label="Billing Entity"
        value={filterState?.billingEntity ?? ''}
        options={options?.billingEntity?.map((option) => ({
          value: option?.value ?? '',
          label: CapitalizeFirstLetter(option?.label ?? '')
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
            value={currentFilters?.name ?? ''}
            placeholder="Search by Phase Name"
            onChange={(value) => {
              onResetPage();
              updateFilters({ name: value });
            }}
          />
          <Button
            onClick={filterMenuActions.onOpen}
            startIcon={<Iconify icon="material-symbols:filter-list" />}
          >
            Filters
          </Button>

          {columnManager?.columns && <ColumnManager {...columnManager} />}
        </Box>
      </Box>

      {renderFilterMenuActions()}
    </>
  );
}
