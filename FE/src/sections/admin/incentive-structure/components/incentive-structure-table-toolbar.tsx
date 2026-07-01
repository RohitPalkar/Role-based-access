import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ISelectOption } from 'src/types/admin/services/incetive';
import type { IIncentiveStructureTableFilters } from 'src/types/admin/feature/incentive-structure';

import dayjs from 'dayjs';
import React, { useEffect, useCallback } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import Box from '@mui/material/Box';
import { Button, Tooltip, useTheme, IconButton, Typography, useMediaQuery } from '@mui/material';

import { fIsAfter } from 'src/utils/format-time';
import { CapitalizeFirstLetter, getMinMaxDateForFilter } from 'src/utils/helper';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

// ----------------------------------------------------------------------

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IIncentiveStructureTableFilters>;
  columnManager?: any;
  options: {
    status: string[];
    brand: ISelectOption[];
  };
}>;

export function IncentiveStructureTableToolbar({
  filters,
  options,
  onResetPage,
  columnManager,
}: Props) {
  const menuActions = usePopover();

  const { state: currentFilters, setState: updateFilters } = filters || {};
  const [filterState, setFilterState] = React.useState(currentFilters || {});

  const dateError = fIsAfter(filterState?.startDate, filterState?.endDate);

  const { startYearDate, endYearDate } = getMinMaxDateForFilter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  // Form setup for date pickers
  const methods = useForm({
    defaultValues: {
      startDate: currentFilters?.startDate?.format('YYYY-MM-DD') || '',
      endDate: currentFilters?.endDate?.format('YYYY-MM-DD') || '',
    },
  });
  const { watch, reset } = methods;

  // Update form when currentFilters change
  useEffect(() => {
    reset({
      startDate: currentFilters?.startDate?.format('YYYY-MM-DD') || '',
      endDate: currentFilters?.endDate?.format('YYYY-MM-DD') || '',
    });
  }, [currentFilters?.startDate, currentFilters?.endDate, reset]);

  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  useEffect(() => {
    setFilterState(currentFilters || {});
  }, [currentFilters]);

  // Sync form values with filter state
  useEffect(() => {
    if (watchedStartDate) {
      const startDate = watchedStartDate ? dayjs(watchedStartDate) : null;
      setFilterState((pre) => ({ ...pre, startDate }));
    }
  }, [watchedStartDate]);

  useEffect(() => {
    if (watchedEndDate) {
      const endDate = watchedEndDate ? dayjs(watchedEndDate) : null;
      setFilterState((pre) => ({ ...pre, endDate }));
    }
  }, [watchedEndDate]);


  const handleFilter = useCallback(
    (field: keyof IIncentiveStructureTableFilters, value: any) => {
      if (onResetPage) onResetPage();

      setFilterState((prev) => {
        let finalVal = null;
        if (value !== null && value !== undefined) {
          finalVal = typeof value === 'number' ? value : String(value);
        }
        return {
          ...prev,
          [field]: finalVal,
        };
      });
    },
    [onResetPage]
  );

  const handleOnReset = useCallback(() => {
    if (onResetPage) onResetPage();
    if (updateFilters) {
      updateFilters({ status: null, brand: null, startDate: null, endDate: null, name: '' });
    }

    // Reset the form as well
    reset({
      startDate: '',
      endDate: '',
    });

    // Reset the local filter state
    setFilterState({
      name: '',
      status: null,
      brand: null,
      project: null,
      startDate: null,
      endDate: null,
    });
  }, [updateFilters, onResetPage, reset]);

  const handleApply = () => {
    try {
      if (updateFilters && filterState) {
        // Get the latest form values for dates
        const formValues = methods.getValues();
        const finalFilterState = {
          ...filterState,
          startDate: formValues.startDate ? dayjs(formValues.startDate) : null,
          endDate: formValues.endDate ? dayjs(formValues.endDate) : null,
        };
        updateFilters(finalFilterState);
      }
    } catch (error) {
        console.error(error)
    }
  };

  const renderDateRange = () => (
    <FormProvider {...methods}>
      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
        <Typography variant="subtitle2" sx={{ mb: 1.5 }}>
          Duration
        </Typography>

        <Box sx={{ mb: 2.5 }}>
          <Field.Date
            name="startDate"
            label="Start date"
            minDate={startYearDate}
            maxDate={endYearDate}
          />
        </Box>

        <Field.Date
          name="endDate"
          label="End date"
          minDate={startYearDate}
          maxDate={endYearDate}
        />

        {dateError && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            End date must be later than start date
          </Typography>
        )}
      </Box>
    </FormProvider>
  );

  const renderMenuActions = () => (
    <FilterToolbar
      menuActions={menuActions}
      onReset={handleOnReset}
      onApply={dateError ? () => {} : handleApply}
    >
      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
        <ControlledAutocomplete
          label="Brand"
          multiple={false}
          value={filterState?.brand || null}
          onChange={(val) => handleFilter("brand", val)}
          options={
            options?.brand?.map((option) => ({
              value: option.value,
              label: CapitalizeFirstLetter(option.label),
            })) || []
          }
        />
      </Box>
      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
        <ControlledAutocomplete
          label="Status"
          multiple={false}
          value={filterState?.status || null}
          onChange={(val) => handleFilter("status", val)}
          options={
            options?.status?.map((option) => ({
              value: option,
              label: CapitalizeFirstLetter(option),
            })) || []
          }
        />
      </Box>
      {renderDateRange()}
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
            placeholder="Search by Incentive Policy Name"
            onChange={(value) => {
              onResetPage();
              updateFilters({ name: value });
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
            <Tooltip title="Filters">
              {isMobile ? (
                <IconButton onClick={menuActions?.onOpen}>
                  <Iconify icon="material-symbols:filter-list" />
                </IconButton>
              ) : (
                <Button
                  onClick={menuActions?.onOpen}
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
            {columnManager?.columns && Array.isArray(columnManager.columns) && (
              <ColumnManager {...columnManager} />
            )}
          </Box>
        </Box>
      </Box>
      {renderMenuActions()}
    </>
  );
}
export type { ISelectOption };
