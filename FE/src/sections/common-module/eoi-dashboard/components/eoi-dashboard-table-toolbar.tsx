import type { Dayjs } from 'dayjs';
import type { RoleFilter } from 'src/config/role-based-permissions';

import dayjs from 'dayjs';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useState, useEffect, useCallback } from 'react';

import Box from '@mui/material/Box';
import {
  Tab,
  Tabs,
  Button,
  Tooltip,
  useTheme,
  Typography,
  IconButton,
  useMediaQuery,
} from '@mui/material';

import { useAppDispatch, useAppSelector } from 'src/hooks/use-redux';

import { fIsAfter } from 'src/utils/format-time';
import { getMinMaxDateForFilter } from 'src/utils/helper';

import ExportIcon from 'src/assets/icons/export.svg';
import uiText from 'src/locales/langs/en/common.json';
import { fetchEOIUnitTypesAction } from 'src/redux/actions/rm-panel/eoi-actions';
import { downloadEOIDashboardList } from 'src/redux/actions/admin/eoi-dashboard-actions';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type Date = Dayjs | string | null;

export interface IEOIFilters {
  viewBy?: string[] | null;
  campaign?: string | null;
  unitType?: string | null;
  startDate?: Date;
  endDate?: Date;
}

type Props = {
  columnManager?: any;
  filters: IEOIFilters;
  onApplyFilters?: (filters: IEOIFilters) => void;
  roleFilters: RoleFilter[];
  canExport: boolean;
  isSourceView: boolean;
  viewByOptions: Array<{ label: string; value: string }>;
  campaignOptions: Array<{ label: string; value: string }>;
  isExportDisabled: boolean;
};

function EOIDashboardTableToolbar({
  columnManager,
  filters,
  onApplyFilters,
  roleFilters,
  canExport,
  isSourceView,
  viewByOptions,
  campaignOptions,
  isExportDisabled,
}: Readonly<Props>) {
  const { unitTypes: unitTypeOptions } = useAppSelector((state) => state.expressonOfInterest);
  const filterMenuActions = usePopover();
  const dateMenuActions = usePopover();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const jsonValue = uiText.eoiDashboard;
  const { startYearDate , endYearDate } = getMinMaxDateForFilter(); 

  const singleSelectFilterOptions = {
    campaign: campaignOptions,
    unitType: unitTypeOptions,
  };

  const [filterState, setFilterState] = useState<IEOIFilters>({
    viewBy: null,
    campaign: null,
    unitType: null,
    startDate: null,
    endDate: null,
  });

  const monthDateError = fIsAfter(filterState.startDate, filterState.endDate);
  const [startDateRequired, setStartDateRequired] = useState(false);
  const [endDateRequired, setEndDateRequired] = useState(false);

  const [dateTab, setDateTab] = useState<'week' | 'month' | false>(false);

  const methods = useForm<{
    startDate: Dayjs | string | null;
    endDate: Dayjs | string | null;
  }>({
    defaultValues: {
      startDate: '',
      endDate: '',
    },
  });
  const { watch, reset } = methods;

  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');
  useEffect(() => {
    reset({
      startDate: '',
      endDate: '',
    });
  }, [reset]);

  useEffect(() => {
    setFilterState(filters);
    methods.setValue('startDate', filters?.startDate || null);
    methods.setValue('endDate', filters?.endDate || null);
    if (!filters?.startDate && !filters?.endDate) {
      setDateTab(false);
    }
  }, [filters, methods, viewByOptions]);

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

  const handleFilterSelect = useCallback(
    (name: keyof IEOIFilters, value: any) => {
      setFilterState((prev) => ({
        ...prev,
        [name]: value ?? null,
        ...(name === 'campaign' && { unitType: null }),
      }));

      if (name === 'campaign' && value) {
        dispatch(fetchEOIUnitTypesAction({ id: Number(value) }));
      }
    },
    [dispatch]
  );

  const handleReset = useCallback(() => {
    setFilterState({
      viewBy: null,
      campaign: null,
      unitType: null,
      startDate: null,
      endDate: null,
    });
    reset({ startDate: '', endDate: '' });
  }, [reset]);

  const handleApplyFilters = useCallback(() => {
    onApplyFilters?.(filterState);
    filterMenuActions.onClose();
    dateMenuActions.onClose();
  }, [filterState, onApplyFilters, filterMenuActions, dateMenuActions]);

  const getCurrentMonthRange = () => {
    const now = dayjs();
    const startOfMonth = now.startOf('month');
    const endOfMonth = now.endOf('month');

    return {
      startOfMonth,
      endOfMonth,
    };
  };

  // Returns start and end of the current week
  const getCurrentWeekRange = () => {
    const now = dayjs();
    const startOfWeek = now.startOf('week'); // Sunday by default
    const endOfWeek = now.endOf('week');

    return {
      startOfWeek,
      endOfWeek,
    };
  };

  const { startOfMonth, endOfMonth } = getCurrentMonthRange();
  const { startOfWeek, endOfWeek } = getCurrentWeekRange();

  useEffect(() => {
    if (dateTab === 'month') {
      methods.setValue('startDate', startOfMonth.format('YYYY-MM-DD'));
      methods.setValue('endDate', endOfMonth.format('YYYY-MM-DD'));
    } else if (dateTab === 'week') {
      methods.setValue('startDate', startOfWeek.format('YYYY-MM-DD'));
      methods.setValue('endDate', endOfWeek.format('YYYY-MM-DD'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateTab]);

  const renderFilterMenuActions = () => (
    <FilterToolbar
      menuActions={filterMenuActions}
      onReset={handleReset}
      onApply={handleApplyFilters}
    >
      {roleFilters.some((filter) => filter?.id === 'viewBy') && isSourceView && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 }}}>
            <ControlledAutocomplete
              label={jsonValue.filters.viewBy}
              multiple
              limitTags={2}
              value={filterState.viewBy || []}
              onChange={(val) => {
                const arr = Array.isArray(val) ? (val as string[]) : [];
                setFilterState((prev) => ({
                  ...prev,
                  viewBy: arr.length ? arr : null,
                }));
              }}
              options={viewByOptions}
              placeholder={jsonValue.filters.placeholder.viewBy}
            />
          </Box>
        </Box>
      )}

      {roleFilters
        ?.filter((filter) => filter?.id !== 'viewBy' && filter?.type === 'select')
        ?.map((filter) => {
          let selectedFilterValue = null;
          if (filter.id === "campaign") {
            selectedFilterValue = filterState.campaign || null;
          } else if (filter.id === "unitType") {
            selectedFilterValue = filterState.unitType || null;
          }
          return (
            <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 }}} key={filter.id}>
              <ControlledAutocomplete
                label={filter.label}
                multiple={false}
                value={selectedFilterValue}
                onChange={(val) => handleFilterSelect(filter.id as keyof IEOIFilters, val)}
                options={
                  singleSelectFilterOptions[
                    filter.id as Exclude<keyof typeof singleSelectFilterOptions, 'viewBy'>
                  ]
                }
              />
            </Box>
          );
        })}
    </FilterToolbar>
  );
  const renderDatePickerMenuActions = () => {
    let dateErrorMessage = '';
    if (monthDateError) {
      dateErrorMessage = jsonValue.filters.validations.endDateLaterThanStart;
    } else if (startDateRequired) {
      dateErrorMessage = jsonValue.filters.validations.startDate;
    } else {
      dateErrorMessage = jsonValue.filters.validations.endDate;
    }

    return (
      <FilterToolbar
        title={jsonValue.filters.dateRange}
        menuActions={dateMenuActions}
        onReset={() => {
          setDateTab(false);
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
            {/* Tabs */}
            <Tabs
              value={dateTab}
              onChange={(_, newValue) => setDateTab(newValue)}
              variant="standard"
              TabIndicatorProps={{ style: { display: 'none' } }}
              sx={{
                display: 'flex',
                gap: 0,
                border: '1px solid #919EAB14',
                borderRadius: '8px',
                minHeight: 40,
                p: '4px',
                '& .MuiTab-root': {
                  textTransform: 'none',
                  fontSize: 14,
                  minHeight: 38,
                  borderRadius: '8px',
                  px: '12px',
                  py: '12px',
                  color: '#637381',
                  flex: 1,
                },
                '& .Mui-selected': {
                  bgcolor: '#1A407D14',
                  color: '#1C252E',
                  fontWeight: 600,
                },
              }}
            >
              <Tab label={jsonValue.filters.week} value="week" />
              <Tab label={jsonValue.filters.month} value="month" />
            </Tabs>

            <Typography variant="body2" sx={{ mt: 1, fontWeight: 600 }}>
              {jsonValue.filters.customDate}
            </Typography>

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
                  {dateErrorMessage}
                </Typography>
              )}
            </Box>
          </Box>
        </FormProvider>
      </FilterToolbar>
    );
  };

  const handleExport = () => {
    const { viewBy, campaign, unitType, startDate, endDate } = filters || {};

    const payload = {
      view: isSourceView ? 'source' : 'default',
      ...(viewBy && { viewBy }),
      ...(campaign && { campaign }),
      ...(unitType && { unitType }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    dispatch(downloadEOIDashboardList(payload));
  };

  return (
    <>
      <Box
        sx={{
          p: 1.5,
          pt: 1,
          gap: 1,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { xs: 'flex-end', md: 'center' },
        }}
      >
        <Box
          sx={{
            gap: { xs: 0.5, md: 1 },
            width: 1,
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'left',
            flexWrap: 'wrap',
            ml: 2,
          }}
        >
          {canExport && (
            <Button
              variant="contained"
              disabled={isExportDisabled}
              onClick={handleExport}
              startIcon={<img src={ExportIcon} alt="export" style={{ width: 18, height: 18 }} />}
              sx={{
                bgcolor: '#002053',
                color: 'white',
                '&:hover': {
                  bgcolor: '#002053',
                },
                py: 1,
                px: 2,
              }}
            >
              {jsonValue.export}
            </Button>
          )}

          {roleFilters?.some((filter) => filter?.id === 'dateRange') && (
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
                py: 1,
                whiteSpace: 'nowrap',
              }}
            >
              {jsonValue.filters.dateRange}
            </Button>
          )}

          <Tooltip title={uiText.common.filters}>
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
                {uiText.common.filters}
              </Button>
            )}
          </Tooltip>

          {/* Column Manager */}
          {columnManager && <ColumnManager {...columnManager} />}
        </Box>
      </Box>

      {renderFilterMenuActions()}
      {renderDatePickerMenuActions()}
    </>
  );
}

export default EOIDashboardTableToolbar;
