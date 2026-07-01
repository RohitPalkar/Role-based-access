import type { Dayjs } from 'dayjs';
import type { ColumnManagerProps } from 'src/components/column-manager/types';

import dayjs from 'dayjs';
import { useForm, FormProvider } from 'react-hook-form';
import { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import InputAdornment from '@mui/material/InputAdornment';
import { Tooltip , MenuList , MenuItem , IconButton } from '@mui/material';

import { fIsAfter } from 'src/utils/format-time';
import {useDebounceMethod, getMinMaxDateForFilter } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';

import type { BatchPreviewRow } from '../utils/batch-preview-build-rows';

type Date = Dayjs | string | null;

export interface BatchPreviewFilters {
  startDate?: Date;
  endDate?: Date;
}

export type BatchPreviewToolbarProps = {
  search: string;
  onSearchChange: (value: string) => void;
  onResetPage: () => void;
  columnManager: ColumnManagerProps;
  filters?: BatchPreviewFilters;
  onApplyFilters?: (filters: BatchPreviewFilters) => void;
  canExport?: boolean;
  handleExport?: () => void;
  mode?: 'preview' | 'listing';
  rows?: BatchPreviewRow[];
};

export function BatchPreviewToolbar({
  search,
  onSearchChange,
  onResetPage,
  columnManager,
  filters,
  onApplyFilters,
  canExport = false,
  handleExport,
  mode,
  rows,
}: Readonly<BatchPreviewToolbarProps>) {
  const [localSearch, setLocalSearch] = useState(search);
  const dateMenuActions = usePopover();
  const menuActions = usePopover();

  const [filterState, setFilterState] = useState<BatchPreviewFilters>({
    startDate: null,
    endDate: null,
  });

  const { startYearDate, endYearDate } = getMinMaxDateForFilter();
  const monthDateError = fIsAfter(filterState.startDate, filterState.endDate);
  const [startDateRequired, setStartDateRequired] = useState(false);
  const [endDateRequired, setEndDateRequired] = useState(false);

  const methods = useForm<{ startDate: Date; endDate: Date }>({
    defaultValues: {
      startDate: '',
      endDate: '',
    },
  });

  const { watch, reset } = methods;
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    setFilterState(filters || {});
    methods.setValue('startDate', filters?.startDate || null);
    methods.setValue('endDate', filters?.endDate || null);
  }, [filters, methods]);

  useEffect(() => {
    const startDate = watchedStartDate ? dayjs(watchedStartDate) : null;
    const endDate = watchedEndDate ? dayjs(watchedEndDate) : null;

    setFilterState((prev) => ({
      ...prev,
      startDate: watchedStartDate || null,
      endDate: watchedEndDate || null,
    }));

    if (startDate && !endDate) {
      setEndDateRequired(true);
    } else {
      setEndDateRequired(false);
    }
    if (endDate && !startDate) {
      setStartDateRequired(true);
    } else {
      setStartDateRequired(false);
    }
  }, [watchedStartDate, watchedEndDate]);

  const debounced = useDebounceMethod((v: string) => {
    onSearchChange(v);
    onResetPage();
  }, 500);

  const handleApplyFilters = useCallback(() => {
    onApplyFilters?.(filterState);
    dateMenuActions?.onClose();
  }, [filterState, onApplyFilters, dateMenuActions]);

  const getDateErrorMessage = () => {
    if (monthDateError) {
      return uiText.commonValidations.endDateLaterThanStart;
    }
    if (startDateRequired) {
      return uiText.commonValidations.startDate;
    }
    return uiText.commonValidations.endDate;
  };

  // Actions Menu - Only for actions like Export
  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        <MenuItem
          disabled={!rows || rows?.length === 0}
          onClick={() => {
            if (handleExport) {
              handleExport();
            }
            menuActions.onClose();
          }}
        >
          <Iconify icon="solar:export-bold" />
          Export
        </MenuItem>
      </MenuList>
    </CustomPopover>
  );

  const renderDatePickerMenuActions = () => (
    <FilterToolbar
      title={uiText.common.dateRange}
      menuActions={dateMenuActions}
      onReset={() => {
        reset({ startDate: '', endDate: '' });
        setFilterState((prev) => ({
          ...prev,
          startDate: null,
          endDate: null,
        }));
      }}
      onApply={handleApplyFilters}
    >
      <FormProvider {...methods}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Field.Date 
            name="startDate" 
            label={uiText.common.startDate} 
            minDate={startYearDate}
            maxDate={endYearDate} 
          />
          <Field.Date 
            name="endDate" 
            label={uiText.common.endDate}
            minDate={startYearDate}
            maxDate={endYearDate} 
          />
          {(monthDateError || startDateRequired || endDateRequired) && (
            <Typography variant="caption" color="error" sx={{ mt: 1 }}>
              {getDateErrorMessage()}
            </Typography>
          )}
        </Box>
      </FormProvider>
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
          <TextField
            placeholder={uiText.batchManager.previewTable.searchPlaceholder}
            value={localSearch}
            size="small"
            onChange={(e) => {
              const v = e.target.value;
              setLocalSearch(v);
              debounced(v);
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          <Button
            variant="outlined"
            onClick={dateMenuActions.onOpen}
            endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
            sx={{
              color: 'text.primary',
              borderColor: 'grey.300',
              '&:hover': {
                borderColor: 'grey.500',
              },
              whiteSpace: 'nowrap',
            }}
          >
            {uiText.common.dateRange}
          </Button>
          <ColumnManager {...columnManager} />

          {/* Actions Menu - only show if export is enabled */}
          {mode === 'listing' && canExport && handleExport && (
            <Tooltip title="Actions">
              <IconButton onClick={menuActions.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      {renderDatePickerMenuActions()}
      {mode === 'listing' && canExport && handleExport && renderMenuActions()}
    </>
  );
}
