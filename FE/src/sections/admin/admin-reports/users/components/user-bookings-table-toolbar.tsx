import type { AppDispatch } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { IBookingReportsTableFilters } from 'src/types/admin/feature/reports-user';

import dayjs from 'dayjs';
import { toast } from 'sonner';
import { useDispatch } from 'react-redux';
import { useLocation } from 'react-router';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import MenuItem from '@mui/material/MenuItem';
import MenuList from '@mui/material/MenuList';
import IconButton from '@mui/material/IconButton';
import {
  Button,
  Tooltip,
  useTheme,
  Typography,
  FormControl,
  useMediaQuery,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { fIsAfter } from 'src/utils/format-time';
import { normalizeValue, mapArrayToLabelValue, getMinMaxDateForFilter } from 'src/utils/helper';

import { fetchProjectByBrandIdAndCityId } from 'src/redux/actions/admin/common-actions';
import { getRmDropdown, refreshUserBookings } from 'src/redux/actions/admin/reports-user-actions';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { ConfirmDialog } from 'src/components/custom-dialog';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import { unitStatuses } from './reports-common';

// ----------------------------------------------------------------------

export interface ISelectOption {
  value: string | number;
  label: string;
}

type Props = Readonly<{
  onResetPage: () => void;
  filters: UseSetStateReturn<IBookingReportsTableFilters>;
  columnManager?: any;
  handleExport: () => void;
  handleImport?: () => void;
  options: {
    brand: ISelectOption[];
    project: ISelectOption[];
    rm: ISelectOption[];
    unitStatus: ISelectOption[];
    incentiveStatus: ISelectOption[];
  };
  dataLength: number;
  canExport?: boolean;
  /** Role-based: server refresh / SAP sync (see `canRefresh` in role-based-permissions). */
  canRefresh?: boolean;
}>;

export function UserBookingsTableToolbar({
  filters,
  options,
  onResetPage,
  handleExport,
  dataLength,
  columnManager,
  canExport = true,
  canRefresh = false,
}: Props) {
  const location = useLocation();
  const showActionsMenu = Boolean(canExport) || canRefresh;
  const menuActions = usePopover();
  const filterMenuActions = usePopover();
  const dispatch: AppDispatch = useDispatch();
  const { state: currentFilters, setState: updateFilters } = filters;
  const [filterState, setFilterState] = useState(currentFilters);
  const { startYearDate , endYearDate } = getMinMaxDateForFilter();
  const { projects } = useAppSelector((state) => state.common);
  const dateError = fIsAfter(filterState.startDate, filterState.endDate);
  const [startDateRequired, setStartDateRequired] = useState(false);
  const [endDateRequired, setEndDateRequired] = useState(false);
  const [showRefreshConfirm, setShowRefreshConfirm] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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

  useEffect(() => {
    setFilterState(currentFilters);
  }, [currentFilters]);

  // Sync form values with filter state
  useEffect(() => {
    if (watchedStartDate) {
      const startDate = watchedStartDate ? dayjs(watchedStartDate) : null;
      setFilterState((pre) => ({ ...pre, startDate }));
      
      // Check for required end date if start date is selected
      if (startDate && !filterState.endDate) {
        setEndDateRequired(true);
      } else {
        setEndDateRequired(false);
      }
    }
  }, [watchedStartDate, filterState.endDate]);

  useEffect(() => {
    if (watchedEndDate) {
      const endDate = watchedEndDate ? dayjs(watchedEndDate) : null;
      setFilterState((pre) => ({ ...pre, endDate }));
      
      // Check for required start date if end date is selected
      if (endDate && !filterState.startDate) {
        setStartDateRequired(true);
      } else {
        setStartDateRequired(false);
      }
    }
  }, [watchedEndDate, filterState.startDate]);

  // Call API once to get RM data when component mounts
  useEffect(() => {
    dispatch(getRmDropdown(''));
  }, [dispatch]);

  // Call API to get all projects initially when component mounts
  useEffect(() => {
    dispatch(fetchProjectByBrandIdAndCityId({ brand: '' }));
  }, [dispatch]);

  // Transform RM options to match CustomMultiAutocomplete format
  const rmOptions = useMemo(
    () => mapArrayToLabelValue(options?.rm, 'label', 'value') || [],
    [options?.rm]
  );

  // Transform Project options to match CustomMultiAutocomplete format
  const projectOptions = useMemo(
    () => mapArrayToLabelValue(projects, 'name', 'id') || [],
    [projects]
  );

  const handleFilter = useCallback(
    (name:string, newValue:string | null) => {

      onResetPage();
      if (name === 'brandId') {
        dispatch(fetchProjectByBrandIdAndCityId({ brand: newValue }));
        setFilterState((pre) => ({
          ...pre,
          [name]: newValue,
          projectIds: null,
          rmIds: null,
          unitStatus: null,
          incentiveStatus: null,
        }));
      } else if (name === 'unitStatus') {
        setFilterState((pre) => ({
          ...pre,
          [name]: newValue,
          incentiveStatus: null,
        }));
      } else {
        setFilterState((pre) => ({ ...pre, [name]: newValue }));
      }
    },
    [onResetPage, setFilterState, dispatch]
  );


 
  const handleOnReset = useCallback(() => {
    updateFilters({
      brandId: null,
      projectIds: null,
      rmIds: null,
      unitStatus: null,
      incentiveStatus: null,
      startDate: null,
      endDate: null,
    });
    onResetPage();
    setStartDateRequired(false);
    setEndDateRequired(false);
    
    // Reset the form as well
    reset({
      startDate: '',
      endDate: '',
    });
  }, [updateFilters, onResetPage, reset]);

  const handleUserRefresh = async () => {
    try {
      await dispatch(refreshUserBookings());
      setShowRefreshConfirm(false);
    } catch (error) {
      toast.error('Failed to refresh data', error);
      setShowRefreshConfirm(false);
    }
  };

  const handleRefreshClick = () => {
    setShowRefreshConfirm(true);
    menuActions.onClose();
  };

  const handleApply = () => {
    updateFilters(filterState);
  };


  // Handle Project selection change
  const handleChange = useCallback(
    (name: string, newValue:string[] | null) => {
      setFilterState((prev) => ({ ...prev, [name]: newValue }));
    },
    []
  );

  let dateErrorText = 'End date is required';
  if (dateError) {
    dateErrorText = 'End date must be later than start date';
  } else if (startDateRequired) {
    dateErrorText = 'Start date is required';
  }

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
        {canExport && (
          <MenuItem
            onClick={() => {
              handleExport();
              menuActions.onClose();
            }}
            disabled={dataLength === 0}
          >
            <Iconify icon="solar:export-bold" />
            Export
          </MenuItem>
        )}
        {canRefresh && (
          <MenuItem onClick={handleRefreshClick}>
            <Iconify icon="solar:refresh-bold" />
            Fetch from SAP
          </MenuItem>
        )}
      </MenuList>
    </CustomPopover>
  );

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
        
        {(dateError || startDateRequired || endDateRequired) && (
          <Typography variant="caption" color="error" sx={{ mt: 1 }}>
            {dateErrorText}
          </Typography>
        )}
      </Box>
    </FormProvider>
  );

  const renderFilterMenuActions = () => (
    <FilterToolbar menuActions={filterMenuActions} onReset={handleOnReset} onApply={handleApply}>
      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
        <ControlledAutocomplete
          label="Brand"
          placeholder="Select Brand"
          value={filterState.brandId ?? ''}
          options={mapArrayToLabelValue(options?.brand, 'label', 'value') || []}
          onChange={(value) => {
            handleFilter('brandId', normalizeValue(value, false));
          }}
        />
      </FormControl>

      <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
        <ControlledAutocomplete
          multiple
          label="Project"
          placeholder="Search and select projects"
          options={projectOptions}
          value={filterState.projectIds ?? []}
          onChange={(values) => {
            handleChange('projectIds', normalizeValue(values, true));
          }}
          limitTags={2}
        />
      </Box>

      {!location.pathname.includes('users') && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            multiple
            label="RM"
            placeholder="Search and select RMs"
            options={rmOptions}
            value={filterState.rmIds ?? []}
            onChange={(values) => {
              handleChange('rmIds', normalizeValue(values, true));
            }}
            limitTags={2}
          />
        </Box>
      )}

      <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
        <ControlledAutocomplete
          label="Unit Status"
          placeholder="Select Unit Status"
          value={filterState.unitStatus ?? ''}
          options={mapArrayToLabelValue(options?.unitStatus, 'label', 'value') || []}
          onChange={(value) => {
            handleFilter('unitStatus', normalizeValue(value, false));
          }}
        />
      </FormControl>

      {filterState?.unitStatus === unitStatuses?.qualified && (
        <FormControl sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            label="Incentive Status"
            placeholder="Select Incentive Status"
            value={filterState.incentiveStatus ?? ''}
            options={mapArrayToLabelValue(options?.incentiveStatus, 'label', 'value') || []}
            onChange={(value) => {
              handleFilter('incentiveStatus', normalizeValue(value, false));
            }}
          />
        </FormControl>
      )}
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
            value={currentFilters?.name ?? ''}
            placeholder="Search by Customer Name"
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
            {columnManager?.columns && <ColumnManager {...columnManager} />}
            {showActionsMenu && (
              <Tooltip title="Action">
                <IconButton onClick={menuActions.onOpen}>
                  <Iconify icon="eva:more-vertical-fill" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>
      {renderFilterMenuActions()}
      {showActionsMenu && renderMenuActions()}
      
      {/* Refresh Confirmation Dialog */}
      <ConfirmDialog
        open={showRefreshConfirm}
        onClose={() => setShowRefreshConfirm(false)}
        title="Confirm Refresh"
        content="Are you sure you want to refresh the user bookings data? This will reload all the information from the server."
        action={
          <Button
            variant="contained"
            onClick={handleUserRefresh}
           sx={{
              fontSize: '15px',
              fontWeight: '600',
              color: '#fff',
              background: '#1A407D',
              minWidth: {
                xs: '120px',
                lg: '204px',
              },
              height: '48px',
              margin: '0',
            }}
          >
            Yes, Refresh
          </Button>
        }
      />
    </>
  );
}
