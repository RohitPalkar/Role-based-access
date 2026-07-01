import type { Dayjs } from 'dayjs';
import type { RoleFilter } from 'src/config/role-based-permissions';
import type { DropdownOption } from 'src/services/rm-panel/eoi-service';

import dayjs from 'dayjs';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useState, useEffect, useCallback } from 'react';

import {
  Tab,
  Box,
  Tabs,
  Button,
  Tooltip,
  useTheme,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';

import { fIsAfter } from 'src/utils/format-time';
import { normalizeValue, getMinMaxDateForFilter } from 'src/utils/helper';

import ExportIcon from 'src/assets/icons/export.svg';
import uiText from 'src/locales/langs/en/common.json';
import { fetchCPNameAction } from 'src/redux/actions/rm-panel/eoi-actions';
import { downloadEOILeaderboardList } from 'src/redux/actions/rm-panel/eoi-leaderboard-actions';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { usePopover } from 'src/components/custom-popover';
import { ColumnManager } from 'src/components/column-manager';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type Date = Dayjs | string | null;

export interface LeaderboardFilters {
  campaign?: string[] | null;
  cpName?: string[] | null;
  rmName?: string[] | null;
  userGroup?: string[] | null;
  startDate?: Date;
  endDate?: Date;
}

type Props = {
  columnManager?: any;
  filters: LeaderboardFilters;
  onApplyFilters?: (newFilters: LeaderboardFilters) => void;
  roleFilters?: RoleFilter[];
  isCpView: boolean;
  isExportDisabled: boolean;
  campaignOptions: { label: string; value: string }[];
  rmNameOptions: { label: string; value: string }[];
  userGroupOptions: { label: string; value: string }[];
  cpNameOptions: DropdownOption[];
  canExport: boolean;
};

const EOILeaderboardToolbar = ({
  columnManager,
  filters,
  canExport,
  isCpView,
  isExportDisabled,
  onApplyFilters,
  roleFilters,
  campaignOptions,
  rmNameOptions,
  userGroupOptions,
  cpNameOptions,
}: Props) => {
  const theme = useTheme();
  const dispatch = useAppDispatch();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const filterMenuActions = usePopover();
  const dateMenuActions = usePopover();
  const jsonValue = uiText.eoiDashboard;

  const [filterState, setFilterState] = useState<LeaderboardFilters>({
    campaign: null,
    cpName: null,
    rmName: null,
    userGroup: null,
    startDate: null,
    endDate: null,
  });
  const monthDateError = fIsAfter(filterState.startDate, filterState.endDate);
  const [startDateRequired, setStartDateRequired] = useState(false);
  const [endDateRequired, setEndDateRequired] = useState(false);
  const [dateTab, setDateTab] = useState<'week' | 'month' | false>(false);
  const { startYearDate, endYearDate } = getMinMaxDateForFilter();

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
    dispatch(fetchCPNameAction({ campaignId: filterState.campaign ?? undefined }));
  }, [dispatch, filterState.campaign])

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

  useEffect(() => {
    setFilterState(filters);
    methods.setValue('startDate', filters?.startDate || '');
    methods.setValue('endDate', filters?.endDate || '');
  }, [filters, methods]);

  const handleApplyFilters = useCallback(() => {
    onApplyFilters?.(filterState);
    filterMenuActions?.onClose();
    dateMenuActions?.onClose();
  }, [filterState, onApplyFilters, filterMenuActions, dateMenuActions]);

  const handleReset = useCallback(() => {
    setFilterState((prev)=>({...prev, campaign: null, cpName: null, rmName: null, userGroup: null}));
  }, []);

  // Need when export api is ready

  const handleExport = () => {
    const { campaign, cpName, rmName, userGroup, startDate, endDate } = filters || {};

    const payload = {
      view: isCpView ? 'channelPartner' : 'relationshipManager',
      ...(campaign && { campaignId: campaign }),
      ...(cpName && { channelPartnerId: cpName }),
      ...(rmName && { rmId: rmName }),
      ...(userGroup && { userGroupId: userGroup }),
      ...(startDate && { startDate }),
      ...(endDate && { endDate }),
    };

    dispatch(downloadEOILeaderboardList(payload));
  };

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

  const renderFilterMenuActions = () => (
    <FilterToolbar
      menuActions={filterMenuActions}
      onReset={handleReset}
      onApply={handleApplyFilters}
    >
      {roleFilters?.some((filter) => filter?.id === 'rmName') && !isCpView && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            multiple
            label={uiText.eoiLeaderboard.filters.rmName}
            value={filterState.rmName || []}
            options={rmNameOptions}
            onChange={(value) => {
              setFilterState((prev) => ({
                ...prev,
                rmName: normalizeValue(value, true),
              }));
            }}
            limitTags={2}

          />
          <Box />
        </Box>
      )}

      {roleFilters?.some((filter) => filter?.id === 'campaign') && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            multiple
            label={uiText.common.campaign}
            value={filterState.campaign || []}
            options={campaignOptions}
            onChange={(value) => {
              setFilterState((prev) => ({
                ...prev,
                campaign: normalizeValue(value, true),
              }));
            }}
          />
          <Box />
        </Box>
      )}

      {roleFilters?.some((filter) => filter?.id === 'cpName') && isCpView && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            multiple
            label={uiText.common.cpName}
            value={filterState.cpName || []}
            options={cpNameOptions}
            onChange={(value) => {
              setFilterState((prev) => ({
                ...prev,
                cpName: normalizeValue(value, true),
              }));
            }}
            limitTags={2}

          />
          <Box />
        </Box>
      )}
      {roleFilters?.some((filter) => filter?.id === 'userGroup') && !isCpView && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            multiple
            label={uiText.eoiLeaderboard.filters.userGroup}
            value={filterState.userGroup || []}
            options={userGroupOptions}
            onChange={(value) => {
              setFilterState((prev) => ({
                ...prev,
                userGroup: normalizeValue(value, true),
              }));
            }}
            limitTags={2}
          />
          <Box />
        </Box>
      )}

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
                maxDate={endYearDate} />
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
            gap: 1,
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
              {uiText.common.dateRange}
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
};

export default EOILeaderboardToolbar;
