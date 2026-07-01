import type { AppDispatch } from 'src/redux/store';
import type { UseSetStateReturn } from 'minimal-shared/hooks';
import type { ILeaderBoardRMSummaryTableFilters } from 'src/types/admin/feature/leader-board-rmSummary';

import dayjs from 'dayjs';
import { useDispatch } from 'react-redux';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import { Button , Tooltip , MenuItem ,
  MenuList,
  IconButton,
  Typography,
  FormControl,
} from '@mui/material';

import { useAppSelector } from 'src/hooks/use-redux';

import { fIsAfter } from 'src/utils/format-time';
import { normalizeValue, mapArrayToLabelValue, getMinMaxDateForFilter } from 'src/utils/helper';

import { getRmDropdown } from 'src/redux/actions/admin/reports-user-actions';
import { fetchCitiesByBrandId, fetchProjectByBrandIdAndCityId } from 'src/redux/actions/admin/common-actions';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

import { unitStatuses } from 'src/sections/admin/admin-reports/users/components/reports-common';


// ----------------------------------------------------------------------
export interface ISelectOption {
  value: string | number;
  label: string;
}

type Props = Readonly<{
  onResetPage: () => void;
  handleExport: () => void;

  filters: UseSetStateReturn<ILeaderBoardRMSummaryTableFilters>;
  onApply: () => void;
  columnManager?: any;
  dataLength: number;
  /** When false, export is hidden (e.g. BIS view-only). Omit only if you intentionally default via parent. */
  canExport: boolean;

  options?: {
     brand: ISelectOption[];
      project: ISelectOption[];
      city: ISelectOption[];
      unitStatus: ISelectOption[];
      incentiveStatus: ISelectOption[];
  };
}>;

export function LeaderBoardRMSummaryTableToolbar({
  filters,
  options,
  onResetPage,
  handleExport,
  columnManager,
  dataLength,
  canExport,
}: Props) {
  
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

  const [filterBrandValue, setFilterBrandValue] = useState('');

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

  // Fetch cities when brand changes
  useEffect(() => {
    if (filterBrandValue) {
      dispatch(fetchCitiesByBrandId(filterBrandValue));
    }
  }, [dispatch, filterBrandValue]);

  // Fetch projects when both brand and city are selected
  useEffect(() => {
    if (filterState?.brandId && filterState?.cityIds) {
      dispatch(fetchProjectByBrandIdAndCityId({
        brand: filterState?.brandId,
        city: filterState?.cityIds
      }));
    }
  }, [dispatch, filterState?.brandId, filterState?.cityIds]);


  // Transform City options to match CustomMultiAutocomplete format
  const cityOptions = useMemo(
    () => mapArrayToLabelValue(options?.city, 'label', 'value')
    || [],
    [options?.city]
  );

  // Transform Project options to match CustomMultiAutocomplete format
  const projectOptions = useMemo(
    () => mapArrayToLabelValue(projects, 'name', 'id') || [],
    [projects]
  );


  const handleFilter = useCallback(
    (name: string, value: string | null) => {
      onResetPage();
      if (name === 'brandId') {
        dispatch(fetchProjectByBrandIdAndCityId({ brand: value }));
        setFilterState((pre) => ({
          ...pre,
          [name]: value,
          projectIds: null,
          rmIds: null,
          unitStatus: null,
          incentiveStatus: null,
        }));
        setFilterBrandValue(value || '');
      
      } else if (name === 'unitStatus') {
        setFilterState((pre) => ({
          ...pre,
          [name]: value,
          incentiveStatus: null,
        }));
      } else {
        setFilterState((pre) => ({ ...pre, [name]: value }));
      }
    },
    [onResetPage, setFilterState, dispatch]
  );


 
  const handleOnReset = useCallback(() => {
    updateFilters({
      brandId: null,
      projectIds: null,
      cityIds: null,
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

  const handleApply = () => {
    
    updateFilters(filterState);
  };



  // Handle City selection change
  const handleCityChange = useCallback((name: string, newValue: string[] | null) => {
    setFilterState((prev) => ({ ...prev, [name]: newValue, project: null }));
  }, []);

  // Handle Project selection change
  const handleProjectChange = useCallback((name: string, newValue: string[] | null) => {
      setFilterState((prev) => ({ ...prev, [name]: newValue }));
    },
    []
  );

  const renderMenuActions = () => (
    <CustomPopover
      open={menuActions.open}
      anchorEl={menuActions.anchorEl}
      onClose={menuActions.onClose}
      slotProps={{ arrow: { placement: 'right-top' } }}
    >
      <MenuList>
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
            {dateError
              ? 'End date must be later than start date'
              : startDateRequired
                ? 'Start date is required'
                : 'End date is required'}
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

       <FormControl sx={{ flexShrink: 0 }}>
         <ControlledAutocomplete
           multiple
           label="City"
           placeholder="Search and select cities"
           options={cityOptions}
           value={filterState.cityIds ?? []}
           onChange={(values) => {
             handleCityChange('cityIds', normalizeValue(values, true));
           }}
           limitTags={2}
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
             handleProjectChange('projectIds', normalizeValue(values, true));
           }}
           limitTags={2}
         />
       </Box>

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
            placeholder="Search by RM Name"
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
          {canExport && (
            <Tooltip title="Action">
              <IconButton onClick={menuActions.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>

        {renderFilterMenuActions()}
        {canExport ? renderMenuActions() : null}
      

    </>
  )
}