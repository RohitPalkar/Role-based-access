import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ILogsTableFilters } from 'src/types/admin/feature/logs';

import dayjs from 'dayjs';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import { Button, Typography, FormControl } from '@mui/material';

import { fIsAfter } from 'src/utils/format-time';
import { normalizeValue, getMinMaxDateForFilter } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
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
  filters: UseSetStateReturn<ILogsTableFilters>;
  columnManager?: any;
}>;

const logsStatus = [
  { value: 'Successful', label: 'Successful' },
  { value: 'Unsuccessful', label: 'Unsuccessful' },
];

export function LogTableToolbar({ filters, onResetPage, columnManager }: Props) {
  const filterMenuActions = usePopover();
  const { state: currentFilters, setState: updateFilters } = filters || {};
  const [filterState, setFilterState] = useState(currentFilters || {});
  const dateError = fIsAfter(filterState?.startDate, filterState?.endDate);
  const { startYearDate, endYearDate } = getMinMaxDateForFilter();

  const methods = useForm({
    defaultValues: {
      startDate: currentFilters.startDate?.format('YYYY-MM-DD') || '',
      endDate: currentFilters.endDate?.format('YYYY-MM-DD') || '',
    },
  });
  const { watch, reset } = methods;
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  useEffect(() => {
    setFilterState(currentFilters || {});
  }, [currentFilters]);

  const appliedStartKey = currentFilters.startDate?.isValid()
    ? currentFilters.startDate.format('YYYY-MM-DD')
    : '';
  const appliedEndKey = currentFilters.endDate?.isValid()
    ? currentFilters.endDate.format('YYYY-MM-DD')
    : '';

  useEffect(() => {
    reset({
      startDate: appliedStartKey,
      endDate: appliedEndKey,
    });
  }, [appliedStartKey, appliedEndKey, reset]);

  useEffect(() => {
    const startDate =
      watchedStartDate && dayjs(watchedStartDate).isValid() ? dayjs(watchedStartDate) : null;
    setFilterState((pre) => ({ ...pre, startDate }));
  }, [watchedStartDate]);

  useEffect(() => {
    const endDate =
      watchedEndDate && dayjs(watchedEndDate).isValid() ? dayjs(watchedEndDate) : null;
    setFilterState((pre) => ({ ...pre, endDate }));
  }, [watchedEndDate]);

  const handleOnReset = useCallback(() => {
    if (onResetPage) onResetPage();
    if (updateFilters) updateFilters({ startDate: null, endDate: null, status: null });
    reset({ startDate: '', endDate: '' });
  }, [updateFilters, onResetPage, reset]);

  const handleApply = () => {
    if (onResetPage) onResetPage();
    if (updateFilters) updateFilters(filterState);
  };

  const renderDateRange = () => (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        minWidth: { xs: 1, md: 460 },
        width: '100%',
        maxWidth: '600px',
      }}
    >
      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
        <ControlledAutocomplete
          label="Status"
          value={filterState?.status ?? ''}
          options={logsStatus}
          placeholder='Select Status'
          onChange={(value)=>{
            const val = normalizeValue(value, false) || ''; 
            if(onResetPage) onResetPage();
            setFilterState((prev)=>({...prev, status: val}))
          }}
        
        />
      </FormControl>

      <Typography variant="subtitle2" sx={{ mb: 1.5, mt: 1.5 }}>
        Duration
      </Typography>

      <FormProvider {...methods}>
        <Box sx={{ mb: 2.5 }}>
          <Field.Date
            name="startDate"
            label="Start date"
            minDate={startYearDate}
            maxDate={endYearDate}
          />
        </Box>

        <Field.Date name="endDate" label="End date" minDate={startYearDate} maxDate={endYearDate} />

        {dateError && (
          <Typography variant="caption" color="error" sx={{ mt: 1, display: 'block' }}>
            End date must be later than start date
          </Typography>
        )}
      </FormProvider>
    </Box>
  );

  const renderFilterMenuActions = () => (
    <Box>
      <FilterToolbar
        title="Select date range"
        menuActions={filterMenuActions}
        onReset={handleOnReset}
        onApply={handleApply}
      >
        {renderDateRange()}
      </FilterToolbar>
    </Box>
  );

  return (
    <>
      <Box
        sx={{
          p: 2.5,
          gap: 2,
          display: 'flex',
          pr: { xs: 2.5, md: 1 },
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <Box
          sx={{
            gap: 2,
            width: 1,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
          }}
        >
        <SearchInput
          value={currentFilters?.name || ''}
          placeholder="Search by Name & Email Address"
          onChange={(value) => {
            if (onResetPage) onResetPage();
            if (updateFilters) updateFilters({ name: value });
          }}
        />

        </Box>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 1,
            flexShrink: 0,
          }}
        >
          <Button
            onClick={filterMenuActions?.onOpen}
            startIcon={<Iconify icon="material-symbols:filter-list" />}
          >
            Filters
          </Button>

          {/* Column Manager */}
          {columnManager?.columns && Array.isArray(columnManager.columns) && (
            <ColumnManager {...columnManager} />
          )}
        </Box>
      </Box>
      {renderFilterMenuActions()}
    </>
  );
}
