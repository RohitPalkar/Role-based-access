import type { RootState } from 'src/redux/store';

import dayjs from 'dayjs';
import { useFormik } from 'formik';
import { useSelector } from 'react-redux';
import React, { useState, useEffect } from 'react';
import { useForm, FormProvider } from 'react-hook-form';

import { Box, Grid, Button, Typography } from '@mui/material';

import { useAppDispatch } from 'src/hooks/use-redux';

import { fIsAfter } from 'src/utils/format-time';
import { mapArrayToLabelValue } from 'src/utils/helper';
import { stickyBreadcrumbsStyles } from 'src/utils/table-styles';
import { STAGE_OPTIONS, RESIDENT_STATUS_OPTIONS } from 'src/utils/constant';

import ExportIcon from 'src/assets/icons/export.svg';
import uiText from 'src/locales/langs/en/common.json';
import { DashboardContent } from 'src/layouts/dashboard';
import { fetchEOICampaignsAction } from 'src/redux/actions/rm-panel/eoi-actions';

import { Iconify } from 'src/components/iconify';
import { Field } from 'src/components/hook-form';
import { usePopover } from 'src/components/custom-popover';
import { CustomBreadcrumbs } from 'src/components/custom-breadcrumbs';
import FilterToolbar from 'src/components/filters-toolbar/filter-toolbar';
import FormikAutocomplete from 'src/components/formik-autocomplete/FormikAutocomplete';

import BatchDashboardCards from './components/batch-dashboard/batsh-dashboard-cards';
import BatchVoucherStatusChart from './components/batch-dashboard/batch-voucher-status-chart';
import BatchDashboardOverallSummaryTable from './components/batch-dashboard/batch-dashboard-overall-summary-table';

const BatchDashboardView = () => {
  const { campaigns, } = useSelector((state: RootState) => state.expressonOfInterest || {});
  const campaignOptions = mapArrayToLabelValue(campaigns, "name", "value")
  const { labels } = uiText.batchManager.dashboard;
  const dispatch = useAppDispatch();

  const batchDashboardCardData = {}; // replace later
  const loading = false; // replace later
  const formik = useFormik({
    initialValues: {
      campaign: '',
      stage: '',
      residentStatus: '',
      date: '',
    },
    onSubmit: (values) => { },
  });

  const residentStatusOptions = [
    { label: 'All', value: 'ALL' },
    ...RESIDENT_STATUS_OPTIONS,
  ];

  const dateMenuActions = usePopover();

  const [startDateRequired, setStartDateRequired] = useState(false);
  const [endDateRequired, setEndDateRequired] = useState(false);
  const [appliedDateRange, setAppliedDateRange] = useState({
    startDate: '',
    endDate: '',
  });
  const methods = useForm({
    defaultValues: {
      startDate: '',
      endDate: '',
    },
  });


  const dateRangeLabel =
    appliedDateRange.startDate && appliedDateRange.endDate
      ? `${dayjs(appliedDateRange.startDate).format('DD/MM/YYYY')} - ${dayjs(appliedDateRange.endDate).format('DD/MM/YYYY')}`
      : uiText.common.dateRange;

  const { watch, reset } = methods;

  const watchedStartDate = watch('startDate');
  const watchedEndDate = watch('endDate');

  const monthDateError = fIsAfter(watchedStartDate, watchedEndDate);

  useEffect(() => {
    const startDate = watchedStartDate ? dayjs(watchedStartDate) : null;
    const endDate = watchedEndDate ? dayjs(watchedEndDate) : null;

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
    dispatch(fetchEOICampaignsAction({ showAll: true }));
  }, [dispatch]);

  const getDateErrorMessage = () => {
    if (monthDateError) {
      return uiText.commonValidations.endDateLaterThanStart;
    }

    if (startDateRequired) {
      return uiText.commonValidations.startDate;
    }

    return uiText.commonValidations.endDate;
  };

  const renderDatePickerMenuActions = () => (
    <FilterToolbar
      title={uiText.common.dateRange}
      menuActions={dateMenuActions}
      onReset={() => {
        reset({
          startDate: '',
          endDate: '',
        });

        setAppliedDateRange({
          startDate: '',
          endDate: '',
        });
      }}
      onApply={() => {
        setAppliedDateRange({
          startDate: watchedStartDate,
          endDate: watchedEndDate,
        });
        dateMenuActions.onClose();
      }}
    >
      <FormProvider {...methods}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Field.Date
            name="startDate"
            label={uiText.common.startDate}
          />

          <Field.Date
            name="endDate"
            label={uiText.common.endDate}
          />

          {(monthDateError ||
            startDateRequired ||
            endDateRequired) && (
              <Typography
                variant="caption"
                color="error"
              >
                {getDateErrorMessage()}
              </Typography>
            )}
        </Box>
      </FormProvider>
    </FilterToolbar>
  );

  return (
    <DashboardContent>
      <CustomBreadcrumbs
        heading={uiText.batchManager.dashboard.title}
        sx={stickyBreadcrumbsStyles}
      />
      <Box sx={{ my: 5 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={2.75}>
            <FormikAutocomplete
              label={labels.campaign}
              name="campaign"
              formik={formik}
              options={campaignOptions}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.75}>
            <FormikAutocomplete
              label={labels.stage}
              name="stage"
              formik={formik}
              options={STAGE_OPTIONS}
            />
          </Grid>

          <Grid item xs={12} sm={6} md={2.75}>
            <Button
              variant="outlined"
              onClick={dateMenuActions.onOpen}
              endIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}
              fullWidth
              sx={{
                borderColor: 'grey.300',
                height: '53px',
                justifyContent: 'space-between',
                px: 1.75,
                color: 'text.secondary',
                fontSize: '16px',
                fontWeight: 200,
                textTransform: 'none',

                '& .MuiButton-endIcon': {
                  marginLeft: 'auto',
                },

                '&:hover': {
                  borderColor: 'grey.500',
                },
              }}
            >
              {dateRangeLabel}
            </Button>
          </Grid>

          <Grid item xs={12} sm={6} md>
            <FormikAutocomplete
              label={labels.residentStatus}
              name="residentStatus"
              formik={formik}
              options={residentStatusOptions}
            />
          </Grid>

          <Grid item xs="auto">
            <Button
              variant="contained"
              onClick={() => { }}
              startIcon={<img src={ExportIcon} alt="export" style={{ width: 18, height: 18 }} />}
              sx={{
                bgcolor: '#1A407D',
                color: 'white',
                '&:hover': {
                  bgcolor: '#1A407D',
                },
                py: 1,
                px: 2,
                height: '50px',
                minWidth: 120,
              }}
            >
              {uiText.button.export}
            </Button>
          </Grid>
        </Grid>
      </Box>
      <BatchDashboardCards cardsData={batchDashboardCardData} loading={loading} />
      <BatchDashboardOverallSummaryTable />
      <BatchVoucherStatusChart />
      {renderDatePickerMenuActions()}
    </DashboardContent>
  );
};

export default BatchDashboardView;
