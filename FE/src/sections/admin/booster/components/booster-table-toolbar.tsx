import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IBoosterTableFilters } from 'src/types/admin/feature/booster';

import dayjs from 'dayjs';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Typography from '@mui/material/Typography';
import FormControl from '@mui/material/FormControl';
import { Tooltip, useTheme, IconButton, useMediaQuery } from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';

import { fIsAfter } from 'src/utils/format-time';
import { normalizeValue, CapitalizeFirstLetter, getMinMaxDateForFilter } from 'src/utils/helper';

import {
  fetchCitiesByBrandId,
  fetchProjectByBrandIdAndCityId,
} from 'src/redux/actions/admin/common-actions';

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
  filters: UseSetStateReturn<IBoosterTableFilters>;
  columnManager?: any;
  options: {
    status: string[];
    brand: ISelectOption[];
    city: ISelectOption[];
    project: ISelectOption[];
  };
}>;

export function BoosterTableToolbar({ filters, options, onResetPage, columnManager }: Props) {

  const menuActions = usePopover();
  const { state: currentFilters, setState: updateFilters } = filters;
  const [filterState, setFilterState] = React.useState(currentFilters);
  const [filterBrandValue, setFilterBrandValue] = useState('');
  const dispatch = useAppDispatch();

  // Form setup for date pickers
  const methods = useForm({
    defaultValues: {
      startDate: currentFilters.startDate?.format('YYYY-MM-DD') || '',
      endDate: currentFilters.endDate?.format('YYYY-MM-DD') || '',
    },
  });

  const { watch, reset } = methods;
  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  const dateError = fIsAfter(filterState.startDate, filterState.endDate);
  const { startYearDate , endYearDate } = getMinMaxDateForFilter();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  useEffect(() => {
    setFilterState(currentFilters);
  }, [currentFilters]);

  useEffect(() => {
    if (filterBrandValue) dispatch(fetchCitiesByBrandId(filterBrandValue));
  }, [dispatch, filterBrandValue]);

  useEffect(() => {
    if (filterState?.brandId && filterState?.cityId.length > 0) {
      dispatch(fetchProjectByBrandIdAndCityId({
        brand: filterState?.brandId,
        city: filterState?.cityId
      }));
    }
  }, [dispatch, filterState?.brandId, filterState?.cityId]);


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



  const handleOnReset = useCallback(() => {
    if (
      currentFilters?.brandId === null &&
      currentFilters?.project === null &&
      currentFilters?.cityId?.length === 0 &&
      currentFilters?.status === null &&
      currentFilters?.endDate === null &&
      currentFilters?.startDate === null
    )
      return;

    onResetPage();
    updateFilters({
      project: null,
      cityId: [],
      status: null,
      brandId: null,
      endDate: null,
      startDate: null,
    });
    
    // Reset the form as well
    reset({
      startDate: '',
      endDate: '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateFilters, onResetPage, currentFilters]);



  const handleApply = () => {
    updateFilters(filterState);
  };

  const renderDateRange = () => (
    <FormProvider {...methods}>
      <Box sx={{ display: 'flex', flexDirection: 'column', minWidth: { xs: 1, md: 460 } }}>
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
      <FormControl sx={{ flexShrink: 0 }}>
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 460 } }}>
          <ControlledAutocomplete
            label="Brand"
            options={options.brand.map((option) => ({
              value: option.value,
              label: CapitalizeFirstLetter(option.label),
            }))}
            value={filterState.brandId}
            onChange={(val) => {
              const brandId = typeof val === 'number' ? val : null;
              setFilterState((prev) => ({
                ...prev,
                brandId,
                cityId: [],
                project: null,
              }));
              setFilterBrandValue(brandId ? String(brandId) : '');
              onResetPage();
            }}
          />
        </Box>
      </FormControl>

      <FormControl sx={{ flexShrink: 0 }}>
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 460 } }}>
          <ControlledAutocomplete
              label="City"
              multiple
              limitTags={2}
              options={options.city.map((option) => ({
                value: option.value.toString(),
                label: CapitalizeFirstLetter(option.label),
              }))}
              value={filterState.cityId}
              onChange={(val) => {
                const cityIds = Array.isArray(val) ? val : [];
                setFilterState((prev) => ({
                  ...prev,
                  cityId: cityIds,
                  project: null,
                }));
                onResetPage();
              }}
              disabled={!filterState.brandId}
              placeholder="Search and select cities"
            />
        </Box>
      </FormControl>
      <FormControl sx={{ flexShrink: 0 }}>
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 460 } }}>
          <ControlledAutocomplete
            label="Project"
            options={options.project.map((option) => ({
              value: option.label,
              label: CapitalizeFirstLetter(option.label),
            }))}
            value={filterState.project}
            onChange={(val) => {
              const project = normalizeValue(val, false);
              setFilterState((prev) => ({
                ...prev,
                project,
              }));
              onResetPage();
            }}
            disabled={!filterState?.brandId || !filterState?.cityId?.length}
          />
        </Box>
      </FormControl>
      
      <FormControl sx={{ flexShrink: 0 }}>
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 460 } }}>
          <ControlledAutocomplete
            label="Status"
            options={options.status.map((option) => ({
              value: option,
              label: CapitalizeFirstLetter(option),
            }))}
            value={filterState.status}
            onChange={(val) => {
              const status = normalizeValue(val, false);
              setFilterState((prev) => ({
                ...prev,
                status,
              }));
              onResetPage();
            }}
          />
        </Box>
      </FormControl>

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
            value={currentFilters?.projectName || ''}
            placeholder="Search by Booster Name"
            onChange={(value) => {
              onResetPage();
              updateFilters({ projectName: value });
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
                <IconButton onClick={menuActions.onOpen}>
                  <Iconify icon="material-symbols:filter-list" />
                </IconButton>
              ) : (
                <Button
                  onClick={menuActions.onOpen}
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
      </Box>
      {renderMenuActions()}
    </>
  );
}
