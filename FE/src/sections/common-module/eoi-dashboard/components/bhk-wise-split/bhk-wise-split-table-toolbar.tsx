import type { Dayjs } from 'dayjs';
import type { RoleFilter } from 'src/config/role-based-permissions';

import dayjs from 'dayjs';
import { useForm, FormProvider } from 'react-hook-form';
import React, { useState, useEffect, useCallback } from 'react';

import { Box, Button, Typography } from '@mui/material';

import { fIsAfter } from 'src/utils/format-time';
import { getMinMaxDateForFilter } from 'src/utils/helper';

import uiText from 'src/locales/langs/en/common.json';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { usePopover } from 'src/components/custom-popover';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import ControlledAutocomplete from 'src/components/controlled-autocomplete/ControlledAutocomplete';

type Date = Dayjs | string | null;

export interface BHKFilters {
  campaign?: string | null;
  startDate?: Date;
  endDate?: Date;
}

type Props = {
  columnManager?: any;
  filters: BHKFilters;
  onApplyFilters?: (newFilters: BHKFilters) => void;
  roleFilters?: RoleFilter[];
  campaignOptions: { label: string; value: string }[];
};

const BHKTableToolbar = ({
  columnManager,
  filters,
  onApplyFilters,
  roleFilters,
  campaignOptions,
}: Props) => {
  const filterMenuActions = usePopover();
  const dateMenuActions = usePopover();
  const jsonValue = uiText.eoiDashboard;
  const { startYearDate , endYearDate } = getMinMaxDateForFilter();

  const isToday = (date: Date) =>
  !!date && dayjs(date).isSame(dayjs(), 'day');

  const [filterState, setFilterState] = useState<BHKFilters>({
    campaign: null,
    startDate: null,
    endDate: null,
  });

  // Validation trigger for date filters
  const monthDateError = fIsAfter(filterState.startDate, filterState.endDate);
  const endDateMissing = !filterState.endDate;
  const startDateRequired =
  !!filterState.endDate &&
  !isToday(filterState.endDate) &&
  !filterState.startDate;

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
  setFilterState((prev) => ({
    ...prev,
    startDate: watchedStartDate || null,
    endDate: watchedEndDate || null,
  }));
}, [watchedStartDate, watchedEndDate]);


  useEffect(() => {
    setFilterState(filters);
    methods.setValue('startDate', filters?.startDate || '');
    methods.setValue('endDate', filters?.endDate || '');
  }, [filters, methods]);

  // Check for errors of date filter
  const isValid = !endDateMissing && !startDateRequired && !monthDateError;

  const handleApplyFilters = useCallback(() => {
    if (!isValid) return;
    onApplyFilters?.(filterState);
    filterMenuActions?.onClose();
    dateMenuActions?.onClose();
  }, [isValid, onApplyFilters, filterState, filterMenuActions, dateMenuActions]);


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
                maxDate={dayjs()} 
              />
              {(endDateMissing || monthDateError || startDateRequired) && (
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
            width: { xs: '100%', md: 'auto' },
            flexGrow: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'left',
            flexWrap: 'wrap',
            ml: 2,
          }}
        >
          {/* Campaign Filter */}
          <Box
            sx={{
              flexShrink: 0,
              width: { xs: '100%', sm: 350, md: 300 },
            }}
          >
            {roleFilters?.some((filter) => filter?.id === 'campaign') && (
              <ControlledAutocomplete
                label= {jsonValue.campaignName}
                value={filterState.campaign || ''}
                options={campaignOptions}
                onChange={(value) => {
                  const newCampaign = (value as string) || null;

                  setFilterState((prev) => ({
                    ...prev,
                    campaign: newCampaign,
                  }));

                  onApplyFilters?.({
                    ...filters,
                    campaign: newCampaign,
                  });
                }}
              />
            )}
          </Box>

          {/* Date Range Button (Responsive) */}
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
              py: 1.7,
              px: 2,
              whiteSpace: 'nowrap',
              width: { xs: '100%', sm: 'auto' }, // FULL WIDTH on mobile
            }}
          >
            {uiText.common.dateRange}
          </Button>

          {/* Column Manager (if needed) */}
          {columnManager && <Box>{columnManager}</Box>}
        </Box>
      </Box>

      {renderDatePickerMenuActions()}
    </>
  );

};

export default BHKTableToolbar;
