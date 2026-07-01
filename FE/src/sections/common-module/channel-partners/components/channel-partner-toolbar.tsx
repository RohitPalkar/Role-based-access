// components/channel-partner-toolbar.tsx
import type { Dayjs } from 'dayjs';
import type { RoleFilter } from 'src/config/role-based-permissions';

import dayjs from 'dayjs';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useMemo, useState, useEffect, useCallback } from 'react';

import {
  Box,
  Button,
  Tooltip,
  MenuList,
  MenuItem,
  useTheme,
  IconButton,
  Typography,
  useMediaQuery,
} from '@mui/material';

import { fIsAfter } from 'src/utils/format-time';
import { getMinMaxDateForFilter } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { ColumnManager } from 'src/components/column-manager';
import { usePopover, CustomPopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import SearchInput from 'src/components/search-field-toolbar/SearchInput';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type Date = Dayjs | string | null;
export interface CPFilters {
  campaign?: string | null;
  createdBy?: string[] | null;
  startDate?: Date;
  endDate?: Date;
}
interface ChannelPartnerToolbarProps {
  search: string;
  filters: CPFilters;
  createdByOptions: Array<{ label: string; value: string }>;
  campaignOptions: Array<{ label: string; value: string }>;
  setSearch: (value: string) => void;
  onApplyFilters?: (filters: CPFilters) => void;
  columnManager: any;
  roleFilters: RoleFilter[];
  channelPartnersData: any[];
  canExport?: boolean; // Export permission
  handleExport?: () => void; // Export function
}

export const ChannelPartnerToolbar: React.FC<ChannelPartnerToolbarProps> = ({
  search,
  filters,
  campaignOptions,
  createdByOptions,
  onApplyFilters,
  setSearch,
  columnManager,
  channelPartnersData,
  roleFilters,
  canExport = false,
  handleExport,
}) => {
 
  const menuActions = usePopover();
  const dateMenuActions = usePopover();
  const { startYearDate, endYearDate } = getMinMaxDateForFilter();
  
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const filterMenuActions = usePopover();
  const campaignFilter = useMemo(
    () => roleFilters?.find((f) => f.id === 'campaign'),
    [roleFilters]
  );

  const createdByFilter = useMemo(
    () => roleFilters?.find((f) => f.id === 'createdBy'),
    [roleFilters]
  );

  const [filterState, setFilterState] = useState<CPFilters>({
    campaign: null,
    createdBy: null,
    startDate: null,
    endDate: null,
  });
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
    setFilterState(filters);
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

  const handleReset = useCallback(() => {
    setFilterState((prev) => ({ ...prev, campaign: null, createdBy: null }));
  }, []);

  const handleApplyFilters = useCallback(() => {
    onApplyFilters?.(filterState);
    filterMenuActions.onClose();
    dateMenuActions.onClose();
  }, [filterState, onApplyFilters, filterMenuActions, dateMenuActions]);

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
          disabled={channelPartnersData.length === 0}
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

  const renderFilterMenuActions = () => (
    <FilterToolbar
      menuActions={filterMenuActions}
      onReset={handleReset}
      onApply={handleApplyFilters}
    >
      {campaignFilter && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            label={campaignFilter.label}
            value={filterState.campaign || null}
            onChange={(value) =>
              setFilterState((prev) => ({
                ...prev,
                campaign: (value as string) || '',
              }))
            }
            options={campaignOptions}
          />
        </Box>
      )}

      {createdByFilter && (
        <Box sx={{ flexShrink: 0, width: { xs: 1, md: 500 } }}>
          <ControlledAutocomplete
            label={createdByFilter.label}
            multiple
            limitTags={2}
            value={filterState.createdBy || []}
            onChange={(val) => {
              const arr = Array.isArray(val) ? (val as string[]) : [];
              setFilterState((prev) => ({
                ...prev,
                createdBy: arr.length ? arr : null,
              }));
            }}
            options={createdByOptions}
            placeholder={uiText.common.createdBy}
          />
        </Box>
      )}
    </FilterToolbar>
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
          flexDirection: { xs: 'column', sm: 'row' }, // need to change xs:'row' to xs: 'col'
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
          {/* Search */}
          <SearchInput
            value={search}
            placeholder="Search By CP Name"
            onChange={(value) => {
              setSearch(value);
            }}
          />
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
          
          {/* Need to uncomment these filters when Backend Changes are deployed */}

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
                whiteSpace: 'nowrap',
              }}
            >
              {uiText.common.dateRange}
            </Button>
          )}
          <Tooltip title="Filters">
            {isMobile ? (
              <IconButton onClick={filterMenuActions.onOpen}>
                <Iconify icon="material-symbols:filter-list" />
              </IconButton>
            ) : (
              <Button
                onClick={filterMenuActions.onOpen}
                startIcon={<Iconify icon="material-symbols:filter-list" />}
                sx={{ whiteSpace: 'nowrap', minWidth: 'auto' }}
              >
                {uiText.common.filters}
              </Button>
            )}
          </Tooltip>
          {/* Column Manager */}
          {columnManager && <ColumnManager {...columnManager} />}

          {/* Actions Menu - only show if export is enabled */}
          {canExport && handleExport && (
            <Tooltip title="Actions">
              <IconButton onClick={menuActions.onOpen}>
                <Iconify icon="eva:more-vertical-fill" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </Box>
      {canExport && handleExport && renderMenuActions()}
      {renderFilterMenuActions()}
      {renderDatePickerMenuActions()}
    </>
  );
};
